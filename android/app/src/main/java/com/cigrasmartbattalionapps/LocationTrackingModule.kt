package com.cigrasmartbattalionapps

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

  @ReactMethod
  fun syncAuthToken(token: String?) {
    TrackingPrefs.setAuthToken(reactApplicationContext, token)
  }
}
