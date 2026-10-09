Smart Battalion adalah aplikasi operasional satuan untuk prajurit, komandan, dan petugas. Fiturnya
meliputi pelacakan lokasi, tombol darurat, kekuatan apel, patroli, disposisi surat, tagihan koperasi,
kesehatan, dan buku saku. Satu codebase dipakai untuk beberapa brand (`sakaraguna`, `cigra`). Modul
Academy sudah dipindah ke aplikasi terpisah, Smart Academy (repo `CigraSmartacademyApps`).

# Panduan Developer

Project ini memakai React Native CLI murni (bukan Expo) + TypeScript. Target utamanya **Android**;
iOS belum bisa di-build (lihat [iOS](#ios-belum-bisa-di-build)). Dokumen lain yang perlu dibaca:

- [`CLAUDE.md`](CLAUDE.md): arsitektur dan konvensi lengkap per fitur. Baca dulu sebelum mengubah kode.
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md): token warna, komponen, dan pola layar.
- [`PROJECT_CONVENTIONS.md`](PROJECT_CONVENTIONS.md): struktur folder dan penamaan.
- [`documentation/API_CONTRACT.md`](documentation/API_CONTRACT.md): semua endpoint yang dipakai app.
- [`documentation/CHANGELOG.md`](documentation/CHANGELOG.md): catatan rilis.

## Kebutuhan

| Tool | Versi |
|---|---|
| Node.js | ≥ 22.11 (`engines` di `package.json`) |
| JDK | 17 |
| Android Studio + Android SDK | Platform 37, Build-Tools 37.0.0, NDK 27.1.12297006 (minSdk 26 / Android 8.0) |
| Python 3 | untuk membangun ulang halaman di `documentation/` |
| Xcode, Ruby + Bundler | hanya untuk iOS |

Ikuti juga panduan resmi [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment)
(pilih target OS "Android").

## Setup pertama kali

1. Install dependency JS. Perintah ini juga menerapkan patch di `patches/` lewat `postinstall`.
   ```bash
   npm install
   ```
2. Buat `.env` dari contoh, lalu isi nilainya:
   ```bash
   cp .env.example .env
   ```
3. Siapkan file yang sengaja tidak disimpan di repo:

| File | Wajib? | Isi / cara mendapatkan |
|---|---|---|
| `.env` | **Wajib.** Tanpa `APP_NAME`, build gagal. | `BRAND`, `APP_NAME`, `API_BASE_URL`, `FCM_TOPIC`, `MAPS_API_KEY`. Minta nilai aslinya ke maintainer. |
| `android/local.properties` | Wajib kalau `ANDROID_HOME` belum di-set | `sdk.dir=/Users/<nama>/Library/Android/sdk` (biasanya dibuat otomatis oleh Android Studio) |
| `android/app/google-services-<brand>.json` | Opsional | Config Firebase per brand. Tanpa file ini app tetap jalan, tapi push notification dan Crashlytics nonaktif. Minta ke maintainer, atau unduh dari Firebase Console (Android app `com.<brand>.smartbattalion`). |

Brand yang tersedia:

| `BRAND` | `APP_NAME` | applicationId |
|---|---|---|
| `sakaraguna` | `SAKARAGUNA SMART BATTALION` | `com.sakaraguna.smartbattalion` |
| `cigra` | `CIGRA SMART BATTALION` | `com.cigra.smartbattalion` |

Untuk ganti brand, ubah `BRAND` dan `APP_NAME` (cek juga `API_BASE_URL` & `MAPS_API_KEY`), lalu build
ulang native. Tiap brand ter-install sebagai app terpisah, jadi bisa berdampingan di satu HP.

## Menjalankan versi debug (Android)

APK debug tidak berisi kode JS; kodenya diambil dari Metro. Jadi Metro harus jalan, dan perubahan kode
JS langsung terlihat lewat Fast Refresh. Siapkan emulator (Android Studio → Device Manager) atau HP
dengan USB debugging aktif, lalu pastikan device muncul di `adb devices`.

1. Terminal 1, jalankan Metro:
   ```bash
   npm start
   ```
2. Terminal 2, build APK debug:
   ```bash
   npm run android-d
   ```
3. Install APK paling baru ke device:
   ```bash
   adb install -r "$(ls -t android/app/build/outputs/apk/debug/*.apk | head -1)"
   ```
4. Hubungkan device ke Metro (wajib untuk HP fisik; tidak masalah dijalankan untuk emulator):
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
5. Buka app. Contoh di bawah untuk brand `sakaraguna`; sesuaikan applicationId dengan brand aktif.
   ```bash
   adb shell monkey -p com.sakaraguna.smartbattalion -c android.intent.category.LAUNCHER 1
   ```

> **Kenapa tidak `npm run android`?** Perintah itu berhasil build, tapi lalu gagal di tahap install
> dengan pesan `Could not find the correct install APK file`. Penyebabnya, `android/app/build.gradle`
> mengganti nama APK menjadi `SmartBattalion-<brand>-v<versi>(<code>)-debug.apk` (bukan `app-debug.apk`),
> sehingga CLI tidak menemukannya. Kalau sudah terlanjur menjalankannya, lanjutkan saja dari langkah 3.

Setelah app terbuka:

- Simpan file `.ts/.tsx`, app otomatis ter-refresh. Untuk reload penuh, tekan `r` di terminal Metro.
  Dev Menu: tekan `d` di terminal Metro, goyang HP, atau `Cmd+M` di emulator.
- **Wajib build ulang native** (ulangi langkah 2 sampai 5) kalau mengubah `.env`, menambah/menghapus
  library native, atau mengubah file di `android/`.
- Setelah login, app meminta izin notifikasi dan **wajib** izin lokasi "Izinkan sepanjang waktu" sebelum
  masuk Home. Di emulator, atur lokasi lewat Extended Controls (⋯) → Location.
- Kalau muncul popup "Update Wajib" (versi app lebih lama dari data `GET /app-version` di backend),
  build debug punya tombol "Lewati (dev)".
- Emulator x86_64 (PC Intel/Windows): APK default hanya berisi ABI `armeabi-v7a,arm64-v8a` (lihat
  `android/gradle.properties`), jadi ganti langkah 2 dengan perintah di bawah. Emulator di Mac Apple
  Silicon (arm64) tidak perlu.
  ```bash
  cd android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64 && cd ..
  ```

**HP lewat Wi-Fi (opsional, Android 11+):** buka Opsi developer → Wireless debugging → "Pair device with
pairing code", lalu jalankan dua perintah di bawah. Setelah itu langkah 3 sampai 5 berjalan seperti biasa
(tambahkan `-s <ip>:<port>` setelah `adb` kalau ada lebih dari satu device).

```bash
adb pair <ip>:<port-pairing> <kode-pairing>
```

```bash
adb connect <ip>:<port>
```

## Build APK release (Android)

APK release sudah berisi bundle JS sehingga tidak butuh Metro. File inilah yang dibagikan ke tester
dan pengguna.

```bash
npm run android-r
```

Hasilnya ada di `android/app/build/outputs/apk/release/SmartBattalion-<brand>-v<versionName>(<versionCode>)-release.apk`
dan otomatis disalin juga ke `documentation/` (file `.apk` di-gitignore). Install ke device:

```bash
adb install -r "$(ls -t android/app/build/outputs/apk/release/*.apk | head -1)"
```

Catatan penting:

- **Signing.** Saat ini release ditandatangani dengan `android/app/debug.keystore` (keystore bawaan
  template React Native, ikut di-commit). Karena semua developer memakai file yang sama, APK baru bisa
  di-install menimpa versi lama. Jangan hapus atau ganti file ini. Kalau tanda tangan berubah, pengguna
  harus uninstall dulu (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`) dan sesi login hilang. Untuk rilis lewat
  Play Store, buat keystore release sendiri dan simpan di luar repo
  ([panduan](https://reactnative.dev/docs/signed-apk-android)).
- Build release memakai R8 + resource shrinking. Kelas yang terbuang hanya ketahuan di build release
  (crash `ClassNotFoundException`, atau nilai `.env` terbaca kosong), jadi selalu coba APK release di
  device sebelum dibagikan. Keep rule ada di `android/app/proguard-rules.pro`.
- Kalau yang berubah **hanya gambar/aset**, jalankan `npm run android-c` dulu. Gradle tidak mendeteksi
  perubahan aset, jadi bundle lama akan terpakai.
- Brand diambil dari `.env` saat build. Untuk build brand lain, ubah `BRAND` + `APP_NAME` lalu jalankan
  `npm run android-r` lagi.
- Kalau `google-services-<brand>.json` ada, build release butuh internet karena Crashlytics mengunggah
  `mapping.txt`.

## Alur rilis versi baru

1. Selama development, catat setiap perubahan yang terlihat user sebagai satu baris di `## Belum dirilis`
   pada `documentation/CHANGELOG.md` (bagian Baru / Ditingkatkan / Perbaikan).
2. Saat rilis, ganti judul `## Belum dirilis` menjadi `## v<versi> (versionCode <N>)` + baris `_tanggal_`,
   lalu tambahkan `## Belum dirilis` baru yang kosong di atasnya.
3. Naikkan `versionCode` (+1) dan `versionName` di `android/app/build.gradle`. Samakan juga `version` di
   `package.json`, serta `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` di
   `ios/CigraSmartbattalionApps.xcodeproj/project.pbxproj`.
4. Bangun ulang halaman dokumentasi. Script ini gagal kalau teks satu rilis ≥ 1500 karakter; kalau
   begitu, ringkas bullet-nya.
   ```bash
   python3 documentation/regen-html.py
   ```
5. Jalankan `npm run android-r`, lalu coba APK-nya di device.
6. Commit dengan pesan `release: v<versi> (versionCode <N>)`, lalu buat tag `v<versi>`.
7. Perbarui data `GET /app-version` di backend (`latest_version`, `latest_build` = versionCode baru,
   `download_url`) supaya app versi lama diminta update.

## iOS (belum bisa di-build)

iOS belum pernah jadi target uji, dan saat ini **belum bisa di-build**:

- `pod install` gagal dengan error static Swift library `FirebaseCoreInternal` / `GoogleUtilities`
  (perlu diperbaiki di `ios/Podfile`).
- Bundle id, ikon, nama app, dan `GoogleService-Info.plist` belum ikut sistem brand (bundle id masih
  hardcode `com.cigrasmartbattalionapps`).

Perintah standarnya, setelah masalah di atas beres:

```bash
bundle install
```

```bash
cd ios && LANG=en_US.UTF-8 bundle exec pod install && cd ..
```

```bash
npm run ios
```

## Cek kode

```bash
npm run lint
```

```bash
npx tsc --noEmit
```

```bash
npm test
```

## Masalah yang sering muncul

| Gejala | Solusi |
|---|---|
| `Could not find the correct install APK file` setelah `npm run android` | Build sebenarnya sudah sukses. Install manual dengan `adb install` (lihat langkah 3 di [Menjalankan versi debug](#menjalankan-versi-debug-android)). |
| `SDK location not found` | Buat `android/local.properties` berisi `sdk.dir=…`, atau set `ANDROID_HOME`. |
| `resource string/APP_NAME … not found` | `.env` belum dibuat atau tidak berisi `APP_NAME`. |
| Layar merah `Unable to load script` | Metro belum jalan, atau HP fisik belum menjalankan `adb reverse tcp:8081 tcp:8081`. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Tanda tangan APK berbeda dengan app yang terpasang. Uninstall app lama dulu. |
| `INSTALL_FAILED_NO_MATCHING_ABIS` | Emulator x86_64. Build dengan `-PreactNativeArchitectures=x86_64`. |
| Perubahan `.env` tidak berpengaruh | `.env` dibaca saat build native. Build ulang, bukan cuma reload. |
| Perilaku aneh setelah ganti brand atau library | Jalankan `npm run android-c`, lalu `npm start -- --reset-cache`, lalu build ulang. |
| Log build: `google-services-<brand>.json tidak ditemukan` | Normal kalau file Firebase brand itu belum ada. Push dan Crashlytics nonaktif. |

# Development Log

Catatan progres harian pengerjaan project. Urutan **terbaru di paling atas**. Tambahkan entri baru
dengan template berikut setiap kali menyelesaikan pekerjaan untuk hari itu:

```md
## DD Bulan YYYY

**Dikerjakan:**
- ...

**Kendala / catatan:**
- ...
```

---

## 29 Agustus 2026

**Dikerjakan:**
- Tambah alur refresh access token otomatis kalau API balas 401, biar user gak ke-logout sendiri
  pas token kedaluwarsa.
- Redesign halaman Profile pakai data asli dari `/auth/me` (identitas, data personel, penugasan,
  peran & akses), rapikan bottom tab bar, perbaiki splash screen, dan tingkatkan akurasi GPS
  background tracking (prioritaskan GPS_PROVIDER, ambil fix paling akurat bukan cuma yang terakhir).
- Adjust timeout & fallback `requestPosition` biar GPS cold-start (device jarang dipakai/baru boot)
  gak gampang timeout, dan adjust build size APK.
- Tambah fitur Katalog di Home: list & detail buat Personel, Persit (Keluarga), Kendaraan, Kategori
  Senjata, dan Distribusi Senjata.
- Tambah opsi login pakai kode OTP (selain password) dan fitur lupa password (kirim OTP ke email
  lalu reset password).
- Tambah alur paksa ganti password di login pertama (`must_change_password` dari `/auth/me`)
  sebelum bisa masuk ke menu lain.
- Pindahkan tombol Logout dari Profile ke halaman Pengaturan baru, sekalian tampilkan status izin
  lokasi, GPS, dan notifikasi secara live plus tombol buka pengaturan kalau belum aktif.
- Bikin proses Logout langsung keluar dari UI tanpa nunggu API selesai (API + cleanup tetap jalan
  di background).
- Tambah animasi "tekan mengecil" ke semua elemen yang bisa diklik di seluruh app (tombol, kartu,
  teks link, dll) biar konsisten.
- Tambah konfirmasi "tekan sekali lagi untuk keluar" di halaman Home & Login biar gak kepencet
  keluar aplikasi gak sengaja.
- Tampilkan versi aplikasi di halaman Login & Pengaturan.

**Kendala / catatan:**
- Alur refresh token susah ditest karena access token expired-nya lama — perlu dipercepat masa
  berlakunya (khusus environment testing) biar skenario refresh/401 bisa dicoba tanpa nunggu lama.

## 28 Agustus 2026

**Dikerjakan:**
- Integrasi dengan field `roles` dari response API `/auth/login` & `/auth/me` buat nentuin topic
- Setup push notification pakai Firebase Cloud Messaging (FCM) + Notifee — broadcast alert panic
  button ke topic `all_users` dan topic per-role (komandan/anggota), lengkap dengan channel
  darurat (sirene custom) dan dedupe biar device pengirim tidak dapat notif dobel.
  per-role yang di-subscribe tiap device.
- Tambah logo app di NavBar & halaman Login, perbarui app icon Android & iOS.
- Tampilkan waktu "terakhir diperbarui" untuk lokasi user di halaman Profile.
- Generate APK untuk keperluan testing — versi `0.1` (versionCode 1).

**Kendala / catatan:**
- -

## 27 Agustus 2026

**Dikerjakan:**
- Init project dari template React Native, rapikan struktur folder.
- Bikin login page (masih mock, belum connect ke backend).
- Bikin bottom tab dengan 5 menu: Home, Riwayat, Emergency, Buku Saku, Profile.
- Setup Redux buat auth (biar user tetap login walau app ditutup).
- Setup axios buat nanti connect ke API.
- Bikin komponen dasar yang bisa dipakai berulang (button, input, card, dll) plus warna & style aplikasi.

**Kendala / catatan:**
- Belum ada backend/API asli — login dan data lain masih mock/placeholder.
