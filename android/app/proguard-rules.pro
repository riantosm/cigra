# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Library yang sudah membawa consumer rules sendiri (react-android, Notifee, Reanimated, Worklets,
# react-native-svg, Firebase, Play Services/Maps, ML Kit, Glide, OkHttp, AndroidX) tidak perlu
# diulang di sini. Di bawah hanya library yang README-nya meminta rule tambahan karena refleksi.

# react-native-config — membaca field BuildConfig lewat Class.forName("<namespace>.BuildConfig").
# Tanpa ini R8 me-rename/inline BuildConfig dan `Config` di JS jadi {} (BRAND, API_BASE_URL, dll.).
-keep class com.cigrasmartbattalionapps.BuildConfig { *; }

# react-native-fast-image (Glide) — sesuai README library.
-keep public class com.dylanvann.fastimage.* {*;}
-keep public class com.dylanvann.fastimage.** {*;}
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep public class * extends com.bumptech.glide.module.AppGlideModule
-keep public enum com.bumptech.glide.load.ImageHeaderParser$** {
  **[] $VALUES;
  public *;
}

# react-native-device-info — saat modul diinisialisasi, library membaca Install Referrer lewat
# refleksi (Class.forName/getMethod); rule ini dari README library supaya tetap jalan seperti sebelum
# R8 aktif. (getUniqueId() memakai ANDROID_ID tanpa refleksi, jadi device_id tidak terpengaruh.)
-keep class com.android.installreferrer.api.** { *; }

# Stack trace Crashlytics tetap bisa di-de-obfuscate (mapping.txt di-upload otomatis oleh plugin
# Crashlytics saat build release); baris & nama file sumber dipertahankan supaya laporannya akurat.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
