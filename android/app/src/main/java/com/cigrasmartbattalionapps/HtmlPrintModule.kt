package com.cigrasmartbattalionapps

import android.content.Context
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

// Cetak HTML lewat print framework Android (dialog sistem → "Simpan sebagai PDF" / printer).
// Dipakai "Cetak PDF" Tagihan Koperasi: backend mengirim halaman HTML cetak (bukan PDF biner),
// jadi HTML dimuat ke WebView tak terlihat lalu diserahkan ke PrintManager. Tanpa dependency
// tambahan (react-native-print tak terawat & belum mendukung New Architecture).
class HtmlPrintModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  // Referensi WebView harus dipegang sampai halaman selesai dimuat, kalau tidak bisa di-GC
  // sebelum onPageFinished terpanggil (lihat contoh resmi "Printing HTML documents").
  private var printWebView: WebView? = null

  override fun getName(): String = "HtmlPrintModule"

  @ReactMethod
  fun printHtml(html: String, jobName: String, landscape: Boolean, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("PRINT_NO_ACTIVITY", "Aplikasi sedang tidak aktif.")
      return
    }
    UiThreadUtil.runOnUiThread {
      try {
        val webView = WebView(activity)
        // JS dimatikan: halaman backend memanggil window.print() saat onload, yang tak berguna
        // di WebView — cetak dilakukan lewat PrintManager di bawah.
        webView.settings.javaScriptEnabled = false
        var started = false
        webView.webViewClient = object : WebViewClient() {
          override fun onPageFinished(view: WebView, url: String?) {
            if (started) return
            started = true
            try {
              val printManager = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
              // Orientasi mengikuti `@page { size: A4 landscape|portrait }` halaman backend (dibaca di
              // JS) — WebView tidak menerapkan @page size ke dialog cetak dengan sendirinya.
              val mediaSize = if (landscape) {
                PrintAttributes.MediaSize.ISO_A4.asLandscape()
              } else {
                PrintAttributes.MediaSize.ISO_A4
              }
              val attributes = PrintAttributes.Builder().setMediaSize(mediaSize).build()
              printManager.print(jobName, view.createPrintDocumentAdapter(jobName), attributes)
              promise.resolve(null)
            } catch (error: Exception) {
              promise.reject("PRINT_ERROR", error)
            }
          }
        }
        printWebView = webView
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
      } catch (error: Exception) {
        promise.reject("PRINT_ERROR", error)
      }
    }
  }
}
