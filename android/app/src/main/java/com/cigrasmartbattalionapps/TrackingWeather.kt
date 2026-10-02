package com.cigrasmartbattalionapps

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.net.Uri
import android.util.Log
import com.caverock.androidsvg.RenderOptions
import com.caverock.androidsvg.SVG
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Cuaca BMKG saat ini untuk notifikasi pelacakan lokasi — teks sudah siap tampil. */
data class TrackingWeather(
  /** "23°C" */
  val temp: String,
  /** "Cerah" */
  val desc: String,
  /** "Cileunyi · Bandung" — sama dengan label lokasi widget cuaca di Home. */
  val place: String?,
  /** "Kelembapan 82% · Angin 1.7 km/jam NE · Jarak pandang > 10 km" */
  val details: String?,
  /** "17:00" — jam prakiraan BMKG (`current.time_label`). */
  val timeLabel: String?,
  val icon: Bitmap?,
)

/**
 * Ambil cuaca dengan alur yang SAMA seperti widget cuaca Home (src/hooks/useWeather.ts):
 * koordinat GPS → GET /weather/reverse-geocode → GET /weather?latitude=&longitude= memakai
 * koordinat wilayah hasil reverse-geocode (fallback: koordinat GPS mentah; tanpa lokasi sama
 * sekali: GET /weather tanpa parameter = wilayah pangkalan satuan). Lokasi manual yang dipilih
 * di Home tidak ikut — itu hanya untuk sesi JS dan tidak dipersist.
 */
object TrackingWeatherFetcher {
  private const val TAG = "LocationTracking"
  private const val ICON_SIZE_PX = 144

  // Ikon BMKG jarang berubah — simpan yang terakhir supaya tidak diunduh ulang tiap refresh.
  private var cachedIconUrl: String? = null
  private var cachedIcon: Bitmap? = null

  fun fetch(latitude: Double?, longitude: Double?, token: String?): TrackingWeather? {
    var lat = latitude
    var lon = longitude
    if (lat != null && lon != null) {
      try {
        val region = getJson(
          "/weather/reverse-geocode?latitude=$lat&longitude=$lon",
          token,
        )?.optJSONObject("data")
        val regionLat = region?.optDoubleOrNull("lat")
        val regionLon = region?.optDoubleOrNull("lon")
        if (regionLat != null && regionLon != null) {
          lat = regionLat
          lon = regionLon
        }
      } catch (error: Exception) {
        Log.w(TAG, "Reverse-geocode cuaca gagal, pakai koordinat GPS", error)
      }
    }

    val query = if (lat != null && lon != null) "?latitude=$lat&longitude=$lon" else ""
    val data = getJson("/weather$query", token)?.optJSONObject("data") ?: return null
    val current = data.optJSONObject("current") ?: return null
    val location = data.optJSONObject("location")

    val temp = current.cleanString("temp") ?: return null
    val desc = current.cleanString("weather_desc") ?: return null

    val place = listOfNotNull(
      location?.cleanString("kecamatan") ?: location?.cleanString("desa"),
      location?.cleanString("kotkab"),
    ).joinToString(" · ").ifEmpty { null }

    val humidity = current.cleanString("humidity")
      ?.let { "Kelembapan $it${current.cleanString("humidity_unit").orEmpty()}" }
    val wind = current.cleanString("wind_speed")?.let { speed ->
      listOfNotNull(
        "Angin $speed",
        current.cleanString("wind_speed_unit"),
        current.cleanString("wind_direction"),
      ).joinToString(" ")
    }
    val visibility = current.cleanString("visibility")?.let { "Jarak pandang $it" }
    val details = listOfNotNull(humidity, wind, visibility).joinToString(" · ").ifEmpty { null }

    return TrackingWeather(
      temp = temp + current.cleanString("temp_unit").orEmpty(),
      desc = desc,
      place = place,
      details = details,
      timeLabel = current.cleanString("time_label"),
      icon = current.cleanString("icon_url")?.let { loadIcon(it) },
    )
  }

  private fun loadIcon(url: String): Bitmap? {
    if (url == cachedIconUrl && cachedIcon != null) return cachedIcon
    return try {
      val connection = URL(url).openConnection() as HttpURLConnection
      connection.connectTimeout = 15_000
      connection.readTimeout = 15_000
      val bytes = connection.inputStream.use { it.readBytes() }
      connection.disconnect()

      val isSvg = Uri.parse(url).path.orEmpty().endsWith(".svg", ignoreCase = true) ||
        String(bytes, 0, minOf(bytes.size, 256)).contains("<svg")
      val bitmap = if (isSvg) renderSvg(String(bytes)) else BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
      if (bitmap != null) {
        cachedIconUrl = url
        cachedIcon = bitmap
      }
      bitmap
    } catch (error: Exception) {
      Log.w(TAG, "Ikon cuaca gagal dimuat: $url", error)
      null
    }
  }

  private fun renderSvg(text: String): Bitmap {
    val svg = SVG.getFromString(text)
    val bitmap = Bitmap.createBitmap(ICON_SIZE_PX, ICON_SIZE_PX, Bitmap.Config.ARGB_8888)
    val size = ICON_SIZE_PX.toFloat()
    svg.renderToCanvas(Canvas(bitmap), RenderOptions.create().viewPort(0f, 0f, size, size))
    return bitmap
  }

  private fun getJson(path: String, token: String?): JSONObject? {
    val connection = URL(BuildConfig.API_BASE_URL + path).openConnection() as HttpURLConnection
    connection.setRequestProperty("Accept", "application/json")
    if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
    connection.connectTimeout = 15_000
    connection.readTimeout = 15_000
    return try {
      val code = connection.responseCode
      if (code !in 200..299) {
        Log.w(TAG, "GET $path gagal, kode: $code")
        null
      } else {
        connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
      }
    } finally {
      connection.disconnect()
    }
  }

  // Padanan cleanValue() di src/utils/format.ts: null / kosong / "-" / "–" / "—" = tidak ada.
  private fun JSONObject.cleanString(key: String): String? {
    if (isNull(key)) return null
    val value = opt(key)?.toString()?.trim() ?: return null
    return value.takeUnless { it.isEmpty() || it == "-" || it == "–" || it == "—" }
  }

  private fun JSONObject.optDoubleOrNull(key: String): Double? =
    if (isNull(key)) null else optDouble(key).takeUnless { it.isNaN() }
}
