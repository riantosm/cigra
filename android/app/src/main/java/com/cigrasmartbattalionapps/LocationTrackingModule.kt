package com.cigrasmartbattalionapps

import android.content.Context
import android.location.LocationManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocationTrackingModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "LocationTrackingModule"

  @ReactMethod
  fun startTracking(promise: Promise) {
    try {
      TrackingPrefs.setTrackingEnabled(reactApplicationContext, true)
      LocationForegroundService.start(reactApplicationContext)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("START_TRACKING_ERROR", error)
    }
  }

  @ReactMethod
  fun stopTracking(promise: Promise) {
    try {
      TrackingPrefs.setTrackingEnabled(reactApplicationContext, false)
      LocationForegroundService.stop(reactApplicationContext)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("STOP_TRACKING_ERROR", error)
    }
  }

  // Fix terakhir yang dicatat LocationForegroundService (null kalau service belum pernah dapat
  // fix). `time` = waktu fix (epoch ms), `accuracy` null kalau provider tidak melaporkannya.
  @ReactMethod
  fun getLastLocation(promise: Promise) {
    val stored = TrackingPrefs.getLastLocation(reactApplicationContext)
    if (stored == null) {
      promise.resolve(null)
      return
    }
    val map = Arguments.createMap().apply {
      putDouble("latitude", stored.latitude)
      putDouble("longitude", stored.longitude)
      if (stored.accuracy != null) putDouble("accuracy", stored.accuracy.toDouble()) else putNull("accuracy")
      putDouble("time", stored.time.toDouble())
    }
    promise.resolve(map)
  }

  @ReactMethod
  fun syncAuthToken(token: String?) {
    TrackingPrefs.setAuthToken(reactApplicationContext, token)
  }

  @ReactMethod
  fun getStoredAuthToken(promise: Promise) {
    promise.resolve(TrackingPrefs.getAuthToken(reactApplicationContext))
  }

  // Cek status toggle layanan lokasi (GPS/Network provider) di level OS, terpisah dari izin
  // runtime ACCESS_FINE_LOCATION — dipakai untuk menampilkan status di panel Pengaturan.
  @ReactMethod
  fun isLocationServicesEnabled(promise: Promise) {
    try {
      val manager =
        reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      val enabled = manager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
        manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
      promise.resolve(enabled)
    } catch (error: Exception) {
      promise.reject("LOCATION_SERVICES_CHECK_ERROR", error)
    }
  }
}
