package com.cigrasmartbattalionapps

import android.content.Context
import android.content.SharedPreferences

/**
 * Penyimpanan sederhana yang bisa diakses tanpa JS/React context, dibaca oleh
 * LocationForegroundService dan BootReceiver yang berjalan lepas dari lifecycle RN.
 */
object TrackingPrefs {
  private const val PREFS_NAME = "location_tracking_prefs"
  const val KEY_AUTH_TOKEN = "auth_token"
  const val KEY_TRACKING_ENABLED = "tracking_enabled"

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
}
