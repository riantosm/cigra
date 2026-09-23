package com.cigrasmartbattalionapps

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BatteryOptimizationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "BatteryOptimizationModule"

  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    try {
      val powerManager =
        reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
      val ignoring = powerManager.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)
      promise.resolve(ignoring)
    } catch (error: Exception) {
      promise.reject("BATTERY_OPTIMIZATION_CHECK_ERROR", error)
    }
  }

  // Membuka dialog sistem "Izinkan aplikasi berjalan di background tanpa dibatasi" langsung untuk
  // app ini. Beberapa OEM (mis. custom ROM tertentu) tidak mengimplementasikan
  // ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS dan melempar ActivityNotFoundException — fallback
  // ke layar daftar umum (ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS) yang selalu ada di AOSP,
  // walau UX-nya user harus mencari nama app sendiri di daftar.
  @ReactMethod
  fun requestIgnoreBatteryOptimizations(promise: Promise) {
    val packageName = reactApplicationContext.packageName
    try {
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = Uri.parse("package:$packageName")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactApplicationContext.startActivity(intent)
      promise.resolve(null)
    } catch (error: Exception) {
      try {
        val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactApplicationContext.startActivity(fallbackIntent)
        promise.resolve(null)
      } catch (fallbackError: Exception) {
        promise.reject("BATTERY_OPTIMIZATION_REQUEST_ERROR", fallbackError)
      }
    }
  }
}
