package com.cigrasmartbattalionapps

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.HandlerThread
import android.os.IBinder
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * Foreground service yang menjaga notifikasi persisten tetap tampil dan mengirim posisi GPS
 * terkini ke POST /locations tiap UPLOAD_INTERVAL_SECONDS, terus berjalan walau Activity/JS
 * ditutup. Auth token dibaca dari TrackingPrefs (bukan AsyncStorage) karena AsyncStorage butuh
 * bridge RN yang belum tentu hidup saat service ini jalan sendirian di background.
 */
class LocationForegroundService : Service() {

  companion object {
    private const val TAG = "LocationTracking"
    private const val NOTIFICATION_ID = 4821
    private const val CHANNEL_ID = "location_tracking_channel"
    // Dibaca JS lewat Linking (src/utils/trackingNotification.ts) → buka tab Emergency.
    private const val NOTIFICATION_URL = "smartbattalion://tracking-notification"
    private const val UPLOAD_INTERVAL_SECONDS = 45L
    private const val MIN_UPDATE_INTERVAL_MS = 15_000L
    // 0 (bukan filter jarak) supaya fix tetap diperbarui tiap interval walau user DIAM — tombol
    // darurat memakai fix terakhir ini kalau umurnya <= 1 menit (lihat utils/location.ts
    // getRecentTrackedCoordinates); dengan filter jarak, user yang tidak bergerak tidak pernah
    // dapat fix baru dan selalu jatuh ke pencarian GPS lambat.
    private const val MIN_UPDATE_DISTANCE_M = 0f
    private const val STALE_FIX_THRESHOLD_MS = 120_000L
    private const val NOTIFICATION_TITLE = "CIGRA APPS ACTIVE"
    private const val NOTIFICATION_STATUS = "Status siaga darurat aktif."
    // Backend meng-cache /weather 30 menit — lebih sering dari itu datanya sama saja.
    private const val WEATHER_REFRESH_MS = 30 * 60_000L
    private const val WEATHER_RETRY_MS = 5 * 60_000L

    fun start(context: Context) {
      val intent = Intent(context, LocationForegroundService::class.java)
      ContextCompat.startForegroundService(context, intent)
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, LocationForegroundService::class.java))
    }
  }

  private var locationManager: LocationManager? = null
  private var handlerThread: HandlerThread? = null
  private var executor: ScheduledExecutorService? = null

  @Volatile private var lastLocation: Location? = null

  // Notifikasi dibangun sekali lalu dipakai ulang saat dipasang lagi (lihat
  // restoreNotificationIfDismissed) — objek yang sama = `when` yang sama, jadi tidak loncat urutan.
  @Volatile private var foregroundNotification: Notification? = null
  private val notificationLock = Any()
  private var destroyed = false
  private var contentIntent: PendingIntent? = null
  // `when` tetap = saat service mulai, supaya notifikasi tidak loncat urutan tiap cuaca diperbarui.
  private val startedAt = System.currentTimeMillis()

  // Cuaca BMKG di notifikasi — diambil & diperbarui di thread executor (lihat refreshWeatherIfDue).
  private var weather: TrackingWeather? = null
  private var nextWeatherFetchAt = 0L

  private val locationListener = LocationListener { location ->
    val current = lastLocation
    if (current == null || isMoreUsefulLocation(location, current)) {
      updateLastLocation(location)
    }
  }

  private fun updateLastLocation(location: Location) {
    lastLocation = location
    TrackingPrefs.setLastLocation(this, location)
  }

  override fun onCreate() {
    super.onCreate()
    locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
    startForegroundNotification()
    startLocationUpdates()
    startUploadLoop()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    // Upload yang masih berjalan di executor tidak boleh memasang notifikasi lagi setelah service
    // mati — notifikasi itu akan tertinggal tanpa service di belakangnya.
    synchronized(notificationLock) { destroyed = true }
    executor?.shutdownNow()
    val manager = locationManager
    if (manager != null &&
      ActivityCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) ==
      PackageManager.PERMISSION_GRANTED
    ) {
      manager.removeUpdates(locationListener)
    }
    handlerThread?.quitSafely()
    super.onDestroy()
  }

  private fun startForegroundNotification() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Pelacakan Lokasi",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "Notifikasi wajib selama aplikasi melacak lokasi Anda"
        setShowBadge(false)
      }
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(channel)
    }

    // Intent eksplisit ke MainActivity (jadi URL-nya tidak butuh intent-filter di manifest).
    // ACTION_VIEW + data wajib: hanya bentuk itu yang diteruskan RN ke Linking.getInitialURL()
    // (cold start) dan event 'url' (app sudah jalan, lewat onNewIntent — launchMode singleTask).
    val openAppIntent = Intent(this, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse(NOTIFICATION_URL)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }
    contentIntent = PendingIntent.getActivity(
      this,
      0,
      openAppIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val notification = buildNotification(null)
    foregroundNotification = notification

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  // Tampilan ringkas selalu notifikasi standar (judul + status, tanpa ikon cuaca). Cuaca BMKG
  // (ikon, suhu, lokasi, rincian — sama seperti widget cuaca di Home) baru tampil saat notifikasi
  // di-expand, lewat layout res/layout/notification_tracking_weather.xml.
  private fun buildNotification(weather: TrackingWeather?): Notification {
    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(NOTIFICATION_TITLE)
      .setContentText(NOTIFICATION_STATUS)
      .setSmallIcon(R.drawable.ic_notification)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setWhen(startedAt)
      .setContentIntent(contentIntent)
      .setPriority(NotificationCompat.PRIORITY_LOW)

    if (weather != null) {
      builder
        .setStyle(NotificationCompat.DecoratedCustomViewStyle())
        .setCustomBigContentView(weatherViews(weather))
    }
    return builder.build()
  }

  private fun weatherViews(weather: TrackingWeather): RemoteViews {
    val views = RemoteViews(packageName, R.layout.notification_tracking_weather)
    views.setTextViewText(R.id.title, NOTIFICATION_TITLE)
    views.setTextViewText(R.id.status_text, NOTIFICATION_STATUS)
    if (weather.icon != null) {
      views.setImageViewBitmap(R.id.weather_icon, weather.icon)
      views.setViewVisibility(R.id.weather_icon, View.VISIBLE)
    } else {
      views.setViewVisibility(R.id.weather_icon, View.GONE)
    }
    views.setTextViewText(R.id.weather_headline, "${weather.temp} · ${weather.desc}")
    views.setTextViewText(R.id.weather_place, weather.place ?: "Lokasi tidak diketahui")
    if (weather.details != null) {
      views.setTextViewText(R.id.weather_details, weather.details)
      views.setViewVisibility(R.id.weather_details, View.VISIBLE)
    } else {
      views.setViewVisibility(R.id.weather_details, View.GONE)
    }
    views.setTextViewText(
      R.id.weather_source,
      listOfNotNull("Sumber: BMKG", weather.timeLabel?.let { "prakiraan $it" }).joinToString(" · "),
    )
    return views
  }

  // Dipanggil tiap putaran executor (45 detik), tapi baru mengambil data tiap 30 menit
  // (5 menit kalau percobaan terakhir gagal). Data lama tetap tampil selama gagal.
  private fun refreshWeatherIfDue() {
    val now = System.currentTimeMillis()
    if (now < nextWeatherFetchAt) return

    val location = lastLocation
    val result = try {
      TrackingWeatherFetcher.fetch(
        location?.latitude,
        location?.longitude,
        TrackingPrefs.getAuthToken(this),
      )
    } catch (error: Exception) {
      Log.w(TAG, "Cuaca gagal diambil", error)
      null
    }

    if (result == null) {
      nextWeatherFetchAt = now + WEATHER_RETRY_MS
      return
    }
    nextWeatherFetchAt = now + WEATHER_REFRESH_MS
    if (result == weather) return
    weather = result
    showNotification(buildNotification(result))
  }

  // Ganti isi notifikasi yang sedang tampil (ID sama → menggantikan, tidak menumpuk).
  private fun showNotification(notification: Notification) {
    foregroundNotification = notification
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      return
    }
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    synchronized(notificationLock) {
      if (destroyed) return
      manager.notify(NOTIFICATION_ID, notification)
    }
  }

  // Android 14+ membolehkan user menggeser hilang notifikasi foreground service (setOngoing tidak
  // lagi mencegahnya), padahal service-nya tetap jalan. Pasang lagi setelah upload sukses — hanya
  // kalau memang sudah tidak ada di panel, dan dengan NOTIFICATION_ID yang sama sehingga selalu
  // menggantikan, tidak pernah menumpuk.
  private fun restoreNotificationIfDismissed() {
    val notification = foregroundNotification ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      return
    }
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.activeNotifications.any { it.id == NOTIFICATION_ID }) return

    synchronized(notificationLock) {
      if (destroyed) return
      manager.notify(NOTIFICATION_ID, notification)
    }
  }

  private fun startLocationUpdates() {
    val manager = locationManager ?: return
    if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      Log.w(TAG, "ACCESS_FINE_LOCATION belum diberikan, menghentikan service")
      stopSelf()
      return
    }

    handlerThread = HandlerThread("LocationTrackingThread").apply { start() }
    val looper = handlerThread!!.looper

    val seed = manager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
      ?: manager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
    if (seed != null) updateLastLocation(seed)

    // GPS_PROVIDER jauh lebih akurat (~5-20m) daripada NETWORK_PROVIDER (triangulasi wifi/seluler,
    // bisa 100m+) — dulu service ini subscribe ke SEMUA provider yang ada, jadi fix Network yang
    // datang belakangan bisa menimpa fix GPS yang sudah bagus (lihat isMoreUsefulLocation di bawah
    // yang sekarang mencegah itu juga). Prioritaskan GPS; Network cuma fallback kalau perangkat ini
    // memang tidak listed GPS_PROVIDER sama sekali.
    val availableProviders = manager.getProviders(true)
    val providers = if (availableProviders.contains(LocationManager.GPS_PROVIDER)) {
      listOf(LocationManager.GPS_PROVIDER)
    } else {
      availableProviders
    }

    providers.forEach { provider ->
      try {
        manager.requestLocationUpdates(provider, MIN_UPDATE_INTERVAL_MS, MIN_UPDATE_DISTANCE_M, locationListener, looper)
      } catch (error: SecurityException) {
        Log.w(TAG, "Gagal mendaftarkan provider $provider", error)
      }
    }
  }

  // Adaptasi pola "isBetterLocation" dari dokumentasi Android: fix baru dipakai kalau signifikan
  // lebih baru, atau akurasinya lebih baik/setara (provider sama) dari fix yang sudah ada — supaya
  // fix GPS yang bagus tidak pernah tertimpa balik oleh fix lama/kurang akurat yang datang telat.
  private fun isMoreUsefulLocation(newLocation: Location, current: Location): Boolean {
    val timeDeltaMs = newLocation.time - current.time
    if (timeDeltaMs > STALE_FIX_THRESHOLD_MS) return true
    if (timeDeltaMs < -STALE_FIX_THRESHOLD_MS) return false

    val isMoreAccurate = newLocation.accuracy < current.accuracy
    val isSignificantlyLessAccurate = newLocation.accuracy - current.accuracy > 200f
    val isSameProvider = newLocation.provider == current.provider

    return when {
      isMoreAccurate -> true
      isSignificantlyLessAccurate -> false
      isSameProvider -> true
      else -> false
    }
  }

  private fun startUploadLoop() {
    executor = Executors.newSingleThreadScheduledExecutor()
    executor?.scheduleWithFixedDelay(
      {
        uploadCurrentLocation()
        refreshWeatherIfDue()
      },
      0,
      UPLOAD_INTERVAL_SECONDS,
      TimeUnit.SECONDS,
    )
  }

  private fun uploadCurrentLocation() {
    val location = lastLocation ?: return
    val token = TrackingPrefs.getAuthToken(this) ?: return

    try {
      val responseCode = performUpload(location, token)
      if (responseCode in 200..299) {
        restoreNotificationIfDismissed()
        return
      }
      if (responseCode != 401) return

      // Access token kedaluwarsa — coba refresh sekali (skema JWT-refresh: kirim token lama yang
      // mau di-refresh sebagai Bearer, tanpa body, sama seperti kontrak yang dipakai axiosInstance
      // di sisi JS) supaya ping lokasi yang baru gagal ini tidak hilang begitu saja.
      val newToken = refreshToken(token)
      if (newToken == null) {
        // Refresh ditolak backend (mis. token sudah tidak bisa dipulihkan) — tidak ada gunanya
        // terus polling tiap 45 detik dengan token yang sama-sama invalid, dan notifikasi
        // persisten yang menyesatkan sebaiknya hilang. Sesi akan resmi ke-logout dari sisi JS
        // (dispatch logout()) begitu app dibuka lagi dan axiosInstance mengulang percobaan refresh
        // yang sama lalu gagal juga.
        TrackingPrefs.setAuthToken(this, null)
        stopSelf()
        return
      }

      TrackingPrefs.setAuthToken(this, newToken)
      val retryCode = performUpload(location, newToken)
      if (retryCode in 200..299) {
        restoreNotificationIfDismissed()
      } else {
        Log.w(TAG, "Upload lokasi gagal setelah refresh token, kode: $retryCode")
      }
    } catch (error: Exception) {
      Log.w(TAG, "Upload lokasi error", error)
    }
  }

  private fun performUpload(location: Location, token: String): Int {
    val body = JSONObject().apply {
      put("latitude", location.latitude)
      put("longitude", location.longitude)
      if (location.hasAccuracy()) put("accuracy", location.accuracy.toDouble())
      if (location.hasAltitude()) put("altitude", location.altitude)
      if (location.hasBearing()) put("heading", location.bearing.toDouble())
      if (location.hasSpeed()) put("speed", location.speed.toDouble())
      put("source", "mobile-v${BuildConfig.VERSION_NAME}")
    }

    val url = URL(BuildConfig.API_BASE_URL + "/locations")
    val connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "POST"
    connection.setRequestProperty("Content-Type", "application/json")
    connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Authorization", "Bearer $token")
    connection.doOutput = true
    connection.connectTimeout = 15_000
    connection.readTimeout = 15_000
    connection.outputStream.use { it.write(body.toString().toByteArray()) }

    val responseCode = connection.responseCode
    if (responseCode !in 200..299) {
      val errorBody = connection.errorStream?.bufferedReader()?.use { it.readText() }
      Log.w(TAG, "Upload lokasi gagal, kode: $responseCode, body: $errorBody")
    }
    connection.disconnect()
    return responseCode
  }

  private fun refreshToken(oldToken: String): String? {
    return try {
      val url = URL(BuildConfig.API_BASE_URL + "/auth/refresh")
      val connection = url.openConnection() as HttpURLConnection
      connection.requestMethod = "POST"
      connection.setRequestProperty("Accept", "application/json")
      connection.setRequestProperty("Authorization", "Bearer $oldToken")
      connection.connectTimeout = 15_000
      connection.readTimeout = 15_000

      val responseCode = connection.responseCode
      val stream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
      val responseBody = stream?.bufferedReader()?.use { it.readText() }
      connection.disconnect()

      val json = responseBody?.let { JSONObject(it) }
      if (json != null && json.optBoolean("success", false)) {
        json.optJSONObject("data")?.optString("access_token")?.takeIf { it.isNotEmpty() }
      } else {
        Log.w(TAG, "Refresh token ditolak backend, kode: $responseCode, body: $responseBody")
        null
      }
    } catch (error: Exception) {
      Log.w(TAG, "Refresh token error", error)
      null
    }
  }

  private fun isoFormat(timeMillis: Long): String {
    val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
    format.timeZone = TimeZone.getTimeZone("UTC")
    return format.format(Date(timeMillis))
  }
}
