package com.cigrasmartbattalionapps

import android.content.Context
import android.content.SharedPreferences
import android.location.Location

data class StoredLocation(
  val latitude: Double,
  val longitude: Double,
  val accuracy: Float?,
  val time: Long,
)

/**
 * Penyimpanan sederhana yang bisa diakses tanpa JS/React context, dibaca oleh
 * LocationForegroundService dan BootReceiver yang berjalan lepas dari lifecycle RN.
 */
object TrackingPrefs {
  private const val PREFS_NAME = "location_tracking_prefs"
  const val KEY_AUTH_TOKEN = "auth_token"
  const val KEY_TRACKING_ENABLED = "tracking_enabled"
  private const val KEY_LAST_LAT = "last_location_lat"
  private const val KEY_LAST_LNG = "last_location_lng"
  private const val KEY_LAST_ACCURACY = "last_location_accuracy"
  private const val KEY_LAST_TIME = "last_location_time"

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun isTrackingEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_TRACKING_ENABLED, false)

  fun setTrackingEnabled(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(KEY_TRACKING_ENABLED, enabled).apply()
  }

  fun getAuthToken(context: Context): String? = prefs(context).getString(KEY_AUTH_TOKEN, null)

  fun setAuthToken(context: Context, token: String?) {
    val editor = prefs(context).edit()
    if (token.isNullOrEmpty()) {
      editor.remove(KEY_AUTH_TOKEN)
    } else {
      editor.putString(KEY_AUTH_TOKEN, token)
    }
    editor.apply()
  }

  // Fix terakhir dari LocationForegroundService — disimpan di sini (bukan cuma di memori service)
  // supaya tetap terbaca JS walau proses app sempat di-restart. Double disimpan sebagai raw bits
  // karena SharedPreferences tidak punya putDouble.
  fun setLastLocation(context: Context, location: Location) {
    val editor = prefs(context).edit()
      .putLong(KEY_LAST_LAT, java.lang.Double.doubleToRawLongBits(location.latitude))
      .putLong(KEY_LAST_LNG, java.lang.Double.doubleToRawLongBits(location.longitude))
      .putLong(KEY_LAST_TIME, location.time)
    if (location.hasAccuracy()) {
      editor.putFloat(KEY_LAST_ACCURACY, location.accuracy)
    } else {
      editor.remove(KEY_LAST_ACCURACY)
    }
    editor.apply()
  }

  fun getLastLocation(context: Context): StoredLocation? {
    val prefs = prefs(context)
    if (!prefs.contains(KEY_LAST_TIME)) return null
    return StoredLocation(
      latitude = java.lang.Double.longBitsToDouble(prefs.getLong(KEY_LAST_LAT, 0L)),
      longitude = java.lang.Double.longBitsToDouble(prefs.getLong(KEY_LAST_LNG, 0L)),
      accuracy = if (prefs.contains(KEY_LAST_ACCURACY)) prefs.getFloat(KEY_LAST_ACCURACY, 0f) else null,
      time = prefs.getLong(KEY_LAST_TIME, 0L),
    )
  }
}
