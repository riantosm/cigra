package com.cigrasmartbattalionapps

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Menyalakan kembali LocationForegroundService setelah reboot, jika tracking sedang aktif. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
    if (!TrackingPrefs.isTrackingEnabled(context)) return
    LocationForegroundService.start(context)
  }
}
