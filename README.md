This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

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

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
