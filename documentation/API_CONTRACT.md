# API Contract — Smart Battalion Apps

**Pengecekan terakhir: 7 September 2026**

Dokumentasi **semua endpoint** yang dipanggil aplikasi (yang sudah jalan maupun yang masih
dummy) beserta status integrasinya. Dibagi per **peran**: Umum (semua role), Komandan,
Anggota, Petugas Kesehatan.

Konvensi seragam untuk semua endpoint:

- Base URL dari `Config.API_BASE_URL` — **sudah termasuk suffix `/api`**, jadi path di sini
  ditulis mulai dari `/auth/...`, `/locations/...`, dst.
- Envelope `{ "success": true, "data": … }`. Beberapa endpoint lama memakai
  `{ "success": true, "message": "…" }` (tanpa `data`) — ditandai di bagiannya.
- Paginasi: query `?page=&per_page=`, meta di `meta: { current_page, last_page, per_page, total }`.
- Waktu ISO-8601 dengan offset (`2026-08-30T15:07:00+07:00`). Enum `snake_case` mentah.
- `Authorization: Bearer <access_token>` disisipkan otomatis oleh interceptor axios untuk
  semua request selama token ada. Token kedaluwarsa → interceptor coba `POST /auth/refresh`
  sekali lalu retry; gagal → logout. Lihat Umum §1.1.3.

Legenda badge: **Sudah diintegrasikan** · **Ada catatan** (jalan, perlu penyesuaian) ·
**Error backend** (alur terblokir) · **Belum ada endpoint** (layar masih dummy).

Format & aturan penulisan berkas ini: lihat `STYLE_GUIDE.md`.

---

# Umum

Endpoint yang dipakai lintas peran (autentikasi, versi app, notifikasi, pengumuman baca,
lokasi milik sendiri, foto, kirim sinyal darurat).

## 1. Autentikasi

### 1.1 Login (password)

> [!DONE] `authSlice.login` thunk. Field identitas namanya `login` (bisa username/NRP/email), **bukan** `username`. Response `requires_password_change` + `reset_token` memicu gate ganti-password paksa (lihat 1.7).

`POST /auth/login` — guest; 401 di sini **tidak** memicu alur refresh/logout.

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `login` | string | Wajib | username / NRP / email |
| `password` | string | Wajib | — |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAi…",
    "token_type": "bearer",
    "expires_in": 3600,
    "requires_password_change": false,
    "reset_token": null,
    "user": {
      "id": 12,
      "name": "Andi Pratama",
      "username": "andi",
      "email": "andi@satuan.mil",
      "tenant_id": 1,
      "must_change_password": false,
      "is_active": true,
      "roles": [
        "komandan"
      ],
      "permissions": [
        "dashboard.view"
      ],
      "personnel": {
        "id": 45,
        "full_name": "Andi Pratama",
        "service_number": "3101050010",
        "rank": "SERKA",
        "birth_place": "Bandung",
        "birth_date": "1990-04-12",
        "birth_date_formatted": "12 April 1990",
        "blood_type": "O",
        "gender": "L",
        "address": "…",
        "phone": "0812…",
        "photo": null,
        "status": "active",
        "current_assignment": {
          "position": "Danton",
          "unit": "Kompi A",
          "start_date": "2024-01-01"
        },
        "assignments": []
      }
    }
  }
}
```

- `user.roles` menentukan Home yang dirender: `komandan` → CommanderHome, `petugas_kesehatan`
  → HealthOfficerHome, selain itu → MemberHome. `piket` / `perwakilan_kompi` di `roles`
  memunculkan shortcut "Apel" di Home Anggota (keduanya diberikan otomatis saat ditunjuk, lihat
  Komandan 8.10 / 8.11); komandan selalu punya quick action Kekuatan Apel.
- `user.personnel` = `null` untuk akun non-prajurit (mis. `petkes` / admin) — sebagian layar
  anggota menyembunyikan dirinya kalau `personnel` kosong. Diverifikasi via API live 2026-09-02.
- `is_active` datang sebagai **`0`/`1` (int)**, bukan boolean — FE pakai truthiness, aman.

### 1.2 Login OTP

> [!DONE] Flow dua langkah di layar Login (toggle "Kode OTP"). Langkah request pakai state lokal layar (tidak menyentuh Redux); verify lewat `authSlice.loginWithOtp`.

`POST /auth/otp/request` · `POST /auth/otp/verify`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `login` | string | Wajib | username / NRP / email (kedua langkah) |
| `otp` | string | Wajib pada `verify` | 6 digit dari SMS/email |

**Response request `200`:**

```json
{
  "success": true,
  "message": "Kode OTP dikirim."
}
```

**Response verify `200`:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAi…",
    "requires_password_change": false,
    "reset_token": null,
    "user": {
      "id": 12,
      "name": "Andi Pratama",
      "username": "andi"
    }
  }
}
```
`verify` tidak mengembalikan `expires_in` / `token_type`.

### 1.3 Refresh Token

> [!DONE] Otomatis oleh interceptor response axios pada 401 (kecuali `/auth/login`, `/auth/logout`, `/auth/refresh`). Single-flight: banyak 401 bersamaan menunggu satu refresh yang sama. Foreground-service lokasi native punya implementasi refresh sendiri (HttpURLConnection).

`POST /auth/refresh` — Bearer = **access token lama**, **tanpa body**. Token lama langsung
dianulir begitu refresh sukses (rotating token).

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAi…",
    "token_type": "bearer",
    "expires_in": 3600
  }
}
```
Selain 2xx / `success: false` → dianggap gagal permanen → logout.

### 1.4 Logout

> [!DONE] `Settings` / `ChangePassword`: dispatch `logoutLocal()` (sinkron, bersihkan state) lalu `logout()` thunk (panggil API + bersihkan token/tracking/push) tanpa di-`await`. 401 di endpoint ini tidak memicu logout ulang (hindari loop).

`POST /auth/logout`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "message": "Logout berhasil."
}
```

### 1.5 Profil Sendiri

> [!DONE] `authSlice.refreshUser` thunk — dipanggil saat app dibuka (`RootNavigator`), di `Home` (mount + `AppState` active), dan `Profile` (mount). Re-sync `must_change_password` → `AuthState.requiresPasswordChange` (menangkap reset paksa admin di tengah sesi).

`GET /auth/me`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 12,
    "name": "Andi Pratama",
    "username": "andi",
    "email": "andi@satuan.mil",
    "tenant_id": 1,
    "is_active": 1,
    "must_change_password": false,
    "roles": [
      "komandan",
      "instruktur_apel"
    ],
    "permissions": [
      "dashboard.view"
    ],
    "personnel": {
      "id": 45,
      "full_name": "Andi Pratama",
      "service_number": "3101050010",
      "rank": "SERKA",
      "…": "lihat 1.1"
    },
    "family": [
      {
        "id": 8,
        "full_name": "Sri Wahyuni",
        "membership_number": "P-000812",
        "family_relation": "Istri",
        "spouse_personnel_id": 45,
        "phone": "081234567890",
        "birth_place": "Malang",
        "birth_date": "1990-04-12",
        "birth_date_formatted": "12 April 1990",
        "blood_type": "O",
        "address": "Asrama Blok C No. 4",
        "occupation": "-",
        "photo": null,
        "photo_url": null,
        "status": "active"
      }
    ]
  }
}
```

Catatan:
- `family[]` = anggota keluarga (Persit) milik prajurit yang login (`null` / `[]` untuk non-prajurit). Dipakai `MemberHome` & `Profile` (section "Keluarga (Persit)"); tiap baris → detail berskup anggota (lihat bagian Anggota 5).
- `family[].id` = id rekam Persit; `photo` biasanya placeholder SVG (data URI) → FE menolaknya → avatar inisial.

### 1.6 Lupa Password

> [!DONE] Layar `ForgotPassword` (guest), dua langkah. State lokal penuh — reset password tidak otomatis login.

`POST /auth/forgot-password` · `POST /auth/reset-password`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `login` | string | Wajib | username / NRP / email (kedua langkah) |
| `otp` | string | Wajib pada `reset-password` | dari SMS/email |
| `password` | string | Wajib pada `reset-password` | min 8 karakter |
| `password_confirmation` | string | Wajib pada `reset-password` | sama dengan `password` |

**Response `200`:**

```json
{
  "success": true,
  "message": "Kode OTP telah dikirim."
}
```
`reset` → `{ "success": true, "message": "Password berhasil diubah." }`. Keduanya tanpa `data`.

### 1.7 Ganti Password (paksa & manual)

> [!DONE] Layar `ChangePassword`. Kalau `AuthState.resetToken` ada → dipakai (tidak minta password lama); kalau tidak → form minta `current_password` (mis. sesi restore dari redux-persist). Sukses → `passwordChanged()` (bersihkan flag+token) + `navigation.replace(Main)`.

`POST /auth/change-password`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `password` | string | Wajib | min 8 karakter |
| `password_confirmation` | string | Wajib | sama dengan `password` |
| `reset_token` | string | Wajib jika tanpa `current_password` | token 1x-pakai dari response login |
| `current_password` | string | Wajib jika tanpa `reset_token` | password lama |

**Response `200`:**

```json
{
  "success": true,
  "message": "Password berhasil diubah."
}
```

## 2. Cek Versi Aplikasi

> [!BUG] FE selesai & terverifikasi (`appVersion.service.ts`, `utils/appVersion.ts`, `hooks/useAppVersionGate.ts`, `organisms/AppVersionGate`). **Masalah backend (sweep API live 2026-09-02):** `data.android.download_url` sekarang terisi tapi menunjuk ke `…/api/secure-files/app-releases/…apk` yang **butuh `Authorization: Bearer`** — `curl` tanpa header → `401`. FE membukanya via `Linking.openURL()` (browser sistem, **tanpa** header auth) → user dapat `401 JSON`, bukan APK. **Unduh paksa-update tidak berfungsi.** Backend perlu sajikan APK dari path publik / URL bertanda-tangan sementara.
>
> Data saat ini: android `latest_version` `0.2` / `latest_build` `2` (= versi terpasang → gate tidak memaksa update, benar). ios `download_url`/`store_url` masih `null`.

`GET /app-version` — publik, tanpa `Authorization` wajib.

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "android": {
      "latest_version": "0.3",
      "latest_build": 3,
      "min_supported_version": "0.2",
      "download_url": "https://cdn.example/apk/SmartBattalion-v0.3.apk",
      "store_url": null,
      "release_notes": "- Perbaikan sinkronisasi lokasi",
      "released_at": "2026-09-15T10:00:00+07:00"
    },
    "ios": {
      "_": "bentuk sama; download_url null, store_url terisi"
    }
  }
}
```

| field (per blok `android` / `ios`) | tipe | keterangan |
|---|---|---|
| `latest_version` | string | versi rilis terbaru (`versionName`) |
| `latest_build` | number \| null | build terbaru (`versionCode` / `CFBundleVersion`) |
| `min_supported_version` | string | versi minimum yang masih boleh dipakai |
| `download_url` | string \| null | link langsung APK (Android sideload) |
| `store_url` | string \| null | link Play Store / App Store |
| `release_notes` | string \| null | ditampilkan di modal |
| `released_at` | string \| null | ISO-8601 |

**Perbandingan versi** (semua di client, semantic-version — `0.2 < 0.3 < 0.10`):
build terpasang `<` `latest_build` → **wajib** · versi `<` `min_supported_version` → **wajib** ·
`min_supported_version` ≤ versi `<` `latest_version` → **disarankan** · selain itu → tidak ada.
Request gagal → diabaikan diam-diam.

## 3. Notifikasi

### 3.1 List

> [!DONE] Halaman Notifikasi (ikon lonceng), **semua role**. Daftar + tarik-untuk-refresh + "muat lebih banyak" (via `meta`), badge lonceng = `meta.unread_total`. Diverifikasi API live 2026-09-02: `per_page`, `only_unread=true`, `type=emergency` semua bekerja.
>
> Catatan: `action` non-darurat (mis. `announcement`) belum menuju ke mana-mana, isinya tetap terbaca di pop-up.

`GET /notifications`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `page` | integer | Opsional | — |
| `per_page` | integer | Opsional | default 20 (dihormati backend) |
| `only_unread` | boolean | Opsional | `true` / `false` |
| `type` | string | Opsional | `emergency` / `announcement` / `info` / `system` |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 501,
      "type": "emergency",
      "title": "Sinyal Darurat Baru",
      "body": "Praka Rizky Maulana menekan tombol darurat di Pos Timur.",
      "read": false,
      "created_at": "2026-08-30T15:03:00+07:00",
      "action": {
        "type": "emergency",
        "id": 88
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 4,
    "per_page": 20,
    "total": 68,
    "unread_total": 4
  }
}
```

### 3.2 Tandai Dibaca

> [!BUG] **`POST /notifications/{id}/read` → `404 "The route api/notifications/{id}/read could not be found."`** (POST & PATCH sama-sama 404) — diuji API live 2026-09-02 dengan id notifikasi nyata. **Route ini tidak ada.** FE (`markNotificationReadApi`) memanggilnya tiap baris di-tap → gagal diam-diam. Hanya `POST /notifications/read-all` yang jalan (`200 { success, message: "Notifikasi berhasil ditandai dibaca." }`). Backend perlu menambahkan route `{id}/read` (atau beri tahu path yang benar). Efek di app: "Tandai semua" jalan, tandai-satu tidak.

`POST /notifications/{id}/read` (❌ 404) · `POST /notifications/read-all` (✅ 200)

**Tanpa parameter.**

**Response `read-all` `200`:**

```json
{
  "success": true,
  "message": "Notifikasi berhasil ditandai dibaca.",
  "data": {
    "unread_total": 0
  }
}
```
`{id}/read` → `404 { "message": "The route api/notifications/1/read could not be found." }`.

## 4. Pengumuman (baca)

> [!DONE] `GET /announcements` dipakai lintas app via `announcementSlice`. "Pengumuman Terbaru" (3 terbaru) di Home Komandan & Home Anggota; tiap baris → pop-up baca-penuh. "Lihat Semua" → halaman **Pengumuman** (daftar penuh + tarik-untuk-refresh + "muat lebih banyak"). Semua dari data list — **tidak ada endpoint detail**.
>
> Catatan: status "sudah dibaca" per-pengumuman ada di Notifikasi (§3), bukan di sini. Warna tipe: Peringatan → merah, Pengumuman → kuning, Info → biru. `severity` & query `since` belum dipakai. (Kirim pengumuman = Komandan §2.3.)

`GET /announcements`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `page` | integer | Opsional | — |
| `per_page` | integer | Opsional | default 10 |
| `type` | string | Opsional | `alert` / `announcement` / `info` |
| `since` | string | Opsional | ISO-8601; **belum dipakai** FE |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "type": "alert",
      "title": "ALARM: KADAL",
      "body": "Kontigensi. Seluruh personel siaga di titik kumpul.",
      "severity": "high",
      "created_by": {
        "id": 1,
        "name": "Komandan Batalyon"
      },
      "published_at": "2026-08-30T09:30:00+07:00"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 10,
    "total": 24
  }
}
```

## 5. Lokasi (milik sendiri)

### 5.1 Kirim Lokasi

> [!DONE] Dikirim oleh foreground-service lokasi native (tetap jalan walau app di-kill) **dan** dari JS. Payload minimal `latitude`+`longitude`; sisanya opsional. Butuh izin lokasi + GPS aktif (di-gate keras di `Home`). Diuji live 2026-09-02: `201` `{ success, message, data }`.

`POST /locations`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `latitude` | number | Wajib | — |
| `longitude` | number | Wajib | — |
| `accuracy` | number | Opsional | meter |
| `altitude` | number | Opsional | — |
| `heading` | number | Opsional | — |
| `speed` | number | Opsional | — |
| `captured_at` | string | Opsional | ISO-8601 |
| `source` | string | Opsional | mis. `foreground-service` / `manual` |

**Response `201`:**

```json
{
  "success": true,
  "message": "Posisi berhasil diperbarui.",
  "data": {
    "id": 1,
    "latitude": -6.2088,
    "longitude": 106.8456,
    "accuracy": 9.5,
    "altitude": null,
    "heading": null,
    "speed": null,
    "captured_at": "2026-09-02T12:00:00+07:00",
    "source": "foreground-service"
  }
}
```

### 5.2 Lokasi Saya

> [!DONE] `GET /locations/me` — tile "Lokasi Terakhir" / "Update Terakhir" di MemberHome, dan fallback label lokasi untuk "Status Saya" (Anggota §3.2).

`GET /locations/me`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": 45,
      "service_number": "3101050010",
      "full_name": "Andi Pratama",
      "rank": "SERKA",
      "unit": "Kompi A",
      "tenant_id": 1
    },
    "location": {
      "id": 9901,
      "latitude": -6.1547,
      "longitude": 106.852,
      "accuracy": 8.0,
      "altitude": null,
      "heading": null,
      "speed": null,
      "captured_at": "2026-08-30T15:39:00+07:00",
      "source": "foreground-service"
    },
    "status": "fresh",
    "history": [
      {
        "id": 9900,
        "latitude": -6.1547,
        "longitude": 106.852,
        "accuracy": 10,
        "captured_at": "2026-08-30T15:38:00+07:00",
        "source": "foreground-service"
      }
    ]
  }
}
```

Catatan: `status` = `fresh` | `stale` | `offline`; `location` bisa `null`.

## 6. Foto / Berkas Aman (secure-files)

> [!DONE] Semua foto personel/persit/kendaraan (`photo` di berbagai response) dirender lewat `atoms/SecureImage`. Path mentah dinormalkan ke `<host>/api/secure-files/<tail>` oleh `resolveSecureFileUrl`; header `Authorization: Bearer` **hanya** ditempel untuk URL di host API kita.
>
> Catatan: personel tanpa foto asli → backend mengirim placeholder **SVG** (dulu `ui-avatars.com`, sekarang `data:image/svg+xml;base64,…`). RN tidak bisa men-decode SVG → `isDisplayablePhoto()` menolak keduanya dan komponen jatuh ke inisial / `GradientAvatar`.

`GET /secure-files/{path}` — mis. `/secure-files/personnel/photos/abc.jpg`. Butuh `Authorization: Bearer`.

**Tanpa parameter.**

**Response**: berkas biner (image).

## 7. Kirim Sinyal Darurat (panic button)

> [!DONE] Dua pemicu independen (by design): tombol tab Emergency (butuh 3 ketukan dalam 1.2s untuk kirim langsung; ketukan pertama selalu navigasi ke layar Emergency) & tombol di layar Emergency (satu tap). Logika di `hooks/usePanicButton.ts`: ambil koordinat device → `POST /panic-buttons` → `StatusModal` sukses/gagal. Tersedia untuk **semua role**. Diuji live 2026-09-02 (akun `anggota`): `201`, sinyal masuk ke daftar komandan dengan `status: active`.
>
> Catatan: butuh `android.permission.VIBRATE` (haptic) & izin lokasi. `LocationUnavailableError` membedakan `permission-denied` vs `gps-disabled`. Response `POST` **tidak** meng-echo `description` (tapi ada di `GET /panic-buttons/{id}`). Kelola/tindak lanjut sinyal darurat = Komandan §2.4.

`POST /panic-buttons`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `latitude` | number | Wajib | — |
| `longitude` | number | Wajib | — |
| `address` | string | Opsional | — |
| `description` | string | Opsional | tidak di-echo di response POST |

**Response `201`:**

```json
{
  "success": true,
  "message": "Panic Button berhasil dikirim.",
  "data": {
    "id": 161,
    "latitude": -6.2088,
    "longitude": 106.8456,
    "address": "Pos Timur, Markas Batalyon",
    "created_at": "2026-09-02T17:13:42+07:00"
  }
}
```

Catatan: `data` tidak meng-echo `description`. Idempotensi 5 detik: retry dengan koordinat sama dalam 5 detik dibalas `200` (bukan `201`) tanpa membuat record baru — app tidak membedakan keduanya (sama-sama sukses). Push yang dipicu endpoint ini: §8.3.

## 8. Push Notification (FCM)

Dua jalur, keduanya aktif:

- **Broadcast lewat topic** — `initializePushNotifications(roles)` subscribe ke FCM topic per role (mis. `all_users`, `komandan`, `anggota`) lewat `@react-native-firebase/messaging`. Backend cukup mem-broadcast ke topic, tanpa perlu menyimpan token per-device.
- **Kirim per-pengguna** — device token FCM didaftarkan ke backend saat sesi login siap (`ensureFirebaseReady` di `utils/pushNotifications.ts`) & saat token dirotasi FCM (`onTokenRefresh`); dilepas saat logout (`teardownPushNotifications`, dipanggil sebelum token auth dibersihkan). Dipakai untuk push yang ditujukan ke satu user (disposisi, pengumuman, darurat). Android-only (seluruh stack push app ini Android-only). Best-effort — kegagalan tidak memblokir alur login/logout.

Notifikasi in-app tetap dibaca dari `GET /notifications` (§3).

### 8.1 Daftarkan Token Perangkat

> [!DONE] Sejak 2026-09-26 backend menyimpan token **per perangkat** — satu user boleh punya banyak token (ponsel + tablet + web); sebelumnya token web menimpa token mobile. App mengirim `platform` + `device_id` (`DeviceInfo.getUniqueId()`) + `device_name` (`DeviceInfo.getDeviceName()`, fallback `getModel()`). Alias lama `POST /user/fcm-token` tetap ada (app memakai `/devices/firebase-token`).
>
> Catatan: `fcm_token` di `GET /auth/me` kini hanya token perangkat **terakhir** yang mendaftar (bisa `null`) + ada `fcm_device_count` — app tidak memakai keduanya; sumber kebenaran tetap token lokal dari SDK Firebase.

`POST /devices/firebase-token` — daftarkan / perbarui token FCM perangkat ini. Butuh `Authorization: Bearer`.

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `fcm_token` | string | Wajib | device token dari SDK Firebase (backend juga menerima nama field `token`) |
| `platform` | string | Wajib | `android` / `ios` / `web` |
| `device_id` | string | Wajib | ID stabil perangkat — kunci baris token per perangkat |
| `device_name` | string | Opsional | nama perangkat untuk ditampilkan (mis. "Galaxy A54 5G") |

**Response `200`/`201`:**

```json
{
  "success": true,
  "message": "FCM token updated successfully",
  "subscribed": true,
  "data": {
    "device_count": 2
  }
}
```

### 8.2 Lepas Token Perangkat (logout)

> [!DONE] App **selalu** mengirim `{ "token": "<token perangkat ini>" }` supaya hanya perangkat ini yang dilepas — perangkat lain milik user tetap menerima push. Token diambil ulang dari SDK kalau pendaftaran sebelumnya gagal. Kalau token sama sekali tidak bisa didapat, DELETE **dilewati** (tidak pernah dikirim tanpa body). Alias lama `DELETE /user/fcm-token`.
>
> Catatan: DELETE **tanpa body** di backend = melepas **seluruh** perangkat user (perilaku lama) — app sengaja tidak memakainya.

`DELETE /devices/firebase-token` — lepas token FCM perangkat ini. Butuh `Authorization: Bearer`.

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `token` | string | Opsional | token perangkat yang dilepas; kosong = semua perangkat user dilepas |

**Response `200`:**

```json
{
  "success": true,
  "message": "FCM token removed successfully",
  "data": {
    "removed": 1,
    "device_count": 1
  }
}
```

### 8.3 Payload Push Sirene (darurat & Perintah Tugas)

> [!DONE] Pesan **data-only** (tanpa field `notification`) dengan `type = "emergency"` → notifikasi channel sirene `smart_battalion_alerts_v3` di semua state app (`displayRemoteMessage`). `source` menentukan tujuan saat notifikasi di-tap (`openAlertTarget`): `panic_button` (atau tanpa `source`, payload lama) → `EmergencyDetail` `{ id: panic_button_id ?? id }`, tanpa id → `EmergencyList`; `directive` → layar Notifikasi (belum ada endpoint/layar Perintah Tugas). Payload panic sudah membawa `latitude`/`longitude`/`address`/`maps_url` — app tetap mengambil detail lengkap dari `GET /panic-buttons/{id}` (Komandan §4.2).
>
> Catatan: (1) backend kini juga mengirim APNs — tidak berpengaruh, push di app masih Android-only. (2) Perlu konfirmasi backend bahwa pesan Android **tetap data-only** setelah APNs ditambahkan; kalau ikut membawa `notification`, Android menampilkannya sendiri lewat channel biasa saat app di background (tanpa sirene / dobel). (3) Push Perintah Tugas biasa = `type = "directive"` + notifikasi normal (tanpa sirene). (4) Belum ada `GET /directives` / `GET /directives/{id}` — `directive_id` & `action = "open_directive"` belum bisa dibuka di app. (5) Disposisi / pengumuman: payload tidak berubah, kini terkirim ke semua perangkat user.

**Tanpa parameter** (push masuk, bukan request dari app).

**Payload `source = panic_button`** (semua nilai string; nilai contoh):

```json
{
  "type": "emergency",
  "source": "panic_button",
  "title": "SINYAL DARURAT",
  "body": "Serda Budi mengirim sinyal darurat di Pos Timur, Markas Batalyon",
  "id": "161",
  "panic_button_id": "161",
  "personnel_id": "42",
  "sender_name": "Budi Santoso",
  "sender_rank": "Serda",
  "unit": "Kompi A",
  "latitude": "-6.2088",
  "longitude": "106.8456",
  "address": "Pos Timur, Markas Batalyon",
  "maps_url": "https://maps.google.com/?q=-6.2088,106.8456",
  "created_at": "2026-09-26T08:15:00+07:00"
}
```

**Payload `source = directive`** (Perintah Tugas prioritas `high`/`urgent`; nilai contoh):

```json
{
  "type": "emergency",
  "source": "directive",
  "title": "PERINTAH TUGAS",
  "body": "…",
  "directive_id": "12",
  "directive_recipient_id": "87",
  "priority": "urgent",
  "due_at": "2026-09-26T12:00:00+07:00",
  "action": "open_directive"
}
```

---

# Komandan

Endpoint untuk role `komandan` (Kekuatan Apel juga untuk `piket` / `perwakilan_kompi`). Backend **wajib** menegakkan
izinnya — pembatasan di app hanya UI.

## 1. Ringkasan Situasi

> [!DONE] "Ringkasan Situasi" Home Komandan. Kartu pertama selalu Total Personel (`total_personnel`), sisanya dari `summary[]` (maks 4). Ikon & warna per `key` — dikenali: `at_base`, `off_base`, `absent`, `on_leave`; `key` lain → default. Banner "Sinyal Darurat Aktif" = `active_alerts`.
>
> Catatan: `status_distribution[]` belum ditampilkan di app. Teks kartu apa adanya dari `label`.

`GET /dashboard/situation`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `unit_id` | integer | Opsional | filter unit |
| `date` | string | Opsional | `YYYY-MM-DD`, default hari ini |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "as_of": "2026-08-30T15:07:00+07:00",
    "total_personnel": 427,
    "summary": [
      {
        "key": "at_base",
        "label": "Di Markas",
        "count": 381,
        "percent": 89.2
      },
      {
        "key": "off_base",
        "label": "Di Luar Markas",
        "count": 46,
        "percent": 10.8
      },
      {
        "key": "absent",
        "label": "Absen",
        "count": 5,
        "percent": 1.2
      }
    ],
    "status_distribution": [
      {
        "key": "active",
        "label": "Aktif",
        "count": 376,
        "percent": 88.1
      }
    ],
    "active_alerts": 1
  }
}
```

## 2. Aktivitas Pergerakan Satuan

> [!DONE] Home Komandan "Aktivitas Terbaru" = 3 pergerakan terbaru, tiap baris → detail personel. "Lihat Semua" → layar **Aktivitas** (tarik-untuk-refresh + "muat lebih banyak").
>
> Catatan: khusus data satuan; pergerakan milik user sendiri = Anggota §3.4. Nilai `direction` termasuk `returned` selain `in`/`out`.

`GET /activities/movements`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `unit_id` | integer | Opsional | — |
| `page` | integer | Opsional | — |
| `per_page` | integer | Opsional | **diabaikan** backend (tetap 10) |
| `direction` | string | Opsional | `in` / `out` — **filter diabaikan** backend |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 91,
      "direction": "out",
      "personnel": {
        "service_number": "3101050010",
        "full_name": "Serka Andi Pratama",
        "rank": "SERKA"
      },
      "location_label": "Pos Utama",
      "purpose": "Dinas",
      "note": "Keluar Markas",
      "occurred_at": "2026-08-30T14:32:00+07:00"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 10,
    "total": 47
  }
}
```

## 3. Kirim Pengumuman

### 3.1 Buat Pengumuman

> [!PARTIAL] Form "Kirim Pengumuman" bisa mengirim ke server (`createAnnouncement` thunk); sukses → `StatusModal` + langsung tampil di daftar. Diuji live 2026-09-02: `201`, `data` berisi `scope_label` (mis. `"Seluruh Anggota"`) + `created_by {id,name}` + `created_at` — **`recipients_count` tidak ada** di response (dokumen lama menyebut ada). **Belum ada pemilih tujuan spesifik** — "Kirim ke" (Semua/Satuan/Peran) hanya mengubah `target.scope`, tapi `unit_ids: []` & `role: null` **selalu** (app belum punya daftar satuan/peran). Perlu diputuskan: server menentukan tujuan dari satuan pengirim, atau backend menyediakan daftar satuan & peran.

`POST /announcements`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `title` | string | Wajib | ≤ 80 karakter |
| `body` | string | Wajib | ≤ 1000 karakter |
| `type` | string | Wajib | `announcement` / `alert` / `info` |
| `severity` | string | Wajib | selalu `"normal"` dari client (backend boleh naikkan dari `type`) |
| `target` | object | Wajib | `{ scope, unit_ids, role }` — `scope`: `all` / `unit` / `role`. FE selalu kirim `unit_ids: []`, `role: null` |

```json
{
  "type": "announcement",
  "title": "Apel Pagi",
  "body": "Besok 06:00 di Lapangan Utama.",
  "severity": "normal",
  "target": {
    "scope": "unit",
    "unit_ids": [
      3
    ],
    "role": null
  }
}
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Pengumuman berhasil terkirim.",
  "data": {
    "id": 24,
    "type": "announcement",
    "title": "Apel Pagi",
    "body": "Besok 06:00 di Lapangan Utama.",
    "severity": "normal",
    "scope_label": "Seluruh Anggota",
    "created_by": {
      "id": 205,
      "name": "komandan"
    },
    "created_at": "2026-09-02T17:14:23+07:00"
  }
}
```

Catatan: `data` **tanpa** `recipients_count`.
### 3.2 Riwayat Terkirim

> [!DONE] Sudah jalan. "Riwayat Terkirim" di layar SendAnnouncement menampilkan 3 pengumuman teratas dari **`GET /announcements`** (lihat Umum §1.4 — bukan endpoint khusus); "Lihat semua ›" → halaman Pengumuman. **Tidak butuh endpoint baru** dan **tidak ada fitur tarik/hapus** per-pengumuman.
>
> Catatan: daftar ini belum disaring "hanya yang saya kirim" (menampilkan semua pengumuman satuan). Kalau nanti butuh disaring per pengirim, backend cukup sediakan `GET /announcements/mine` (bentuk = 3.1 + `meta`).

`GET /announcements` — sama persis dengan Umum §1.4.

**Tanpa parameter.**

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "type": "alert",
      "title": "ALARM: KADAL",
      "body": "Kontigensi. Seluruh personel siaga di titik kumpul.",
      "severity": "high",
      "created_by": {
        "id": 1,
        "name": "Komandan Batalyon"
      },
      "published_at": "2026-08-30T09:30:00+07:00"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 10,
    "total": 24
  }
}
```

## 4. Sinyal Darurat (kelola)

### 4.1 List

> [!PARTIAL] Halaman Sinyal Darurat: daftar + tarik-untuk-refresh + "muat lebih banyak" + chip filter status. Tiap baris → detail. Warna badge: Aktif → merah, Ditangani → kuning, Selesai → hijau.
>
> **Temuan sweep API live 2026-09-02:** (1) filter **`?status=`** tidak berfungsi — `active`/`acknowledged`/`resolved` semua mengembalikan daftar yang sama → chip filter di app tidak ada efek. (2) `per_page` **diabaikan** (tetap 20). (3) key `filters` **tidak ada** di response (dokumen lama menyebut ada). Backend perlu memasang filter `status` di query builder.

`GET /panic-buttons`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `page` | integer | Opsional | — |
| `per_page` | integer | Opsional | **diabaikan** (tetap 20) |
| `status` | string | Opsional | `active` / `acknowledged` / `resolved` — **filter tidak berfungsi** backend |
| `unit_id` | integer | Opsional | — |
| `from` / `to` | string | Opsional | rentang waktu ISO-8601 |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 88,
      "status": "active",
      "personnel": {
        "service_number": "3101050004",
        "full_name": "Praka Rizky Maulana",
        "rank": "PRATU",
        "unit": "Kompi Senapan A",
        "photo": null
      },
      "latitude": -6.15472,
      "longitude": 106.85201,
      "accuracy": 12.5,
      "address": "Pos Timur, Markas Batalyon",
      "description": "Tombol darurat ditekan.",
      "created_at": "2026-08-30T15:03:00+07:00",
      "acknowledged_at": null,
      "resolved_at": null,
      "handled_by": null
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 2,
    "per_page": 20,
    "total": 23
  }
}
```

Catatan: `handled_by` bisa `{ id, name }` atau string; key `filters` **tidak dikirim**.

### 4.2 Detail

> [!DONE] Halaman detail: identitas + status, waktu/lokasi/akurasi/keterangan, `handled_by`, "Buka di Google Maps", **Kronologi** dari `timeline[]`. Tarik-untuk-refresh.
>
> Catatan: `handled_by` bisa object `{ id, name }` atau string — keduanya ditangani. `timeline` kosong → Kronologi disembunyikan.

`GET /panic-buttons/{id}`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 88,
    "status": "active",
    "personnel": {
      "service_number": "3101050004",
      "full_name": "Praka Rizky Maulana",
      "rank": "PRATU",
      "unit": "Kompi Senapan A",
      "photo": null
    },
    "latitude": -6.15472,
    "longitude": 106.85201,
    "accuracy": 12.5,
    "address": "Pos Timur, Markas Batalyon",
    "description": "Tombol darurat ditekan.",
    "created_at": "2026-08-30T15:03:00+07:00",
    "acknowledged_at": null,
    "resolved_at": null,
    "handled_by": null,
    "timeline": [
      {
        "event": "created",
        "actor": null,
        "at": "2026-08-30T15:03:00+07:00"
      }
    ]
  }
}
```

### 4.3 Update Status

> [!PARTIAL] `PATCH /panic-buttons/{id}` mengembalikan `200` + `{ "message": "Status Panic Button berhasil diperbarui.", "data": { "id": …, "status": "acknowledged" } }` — pernah tercatat **tidak menyimpan** perubahan (setelah refresh status kembali `active`). Perlu re-verifikasi apakah backend `update` sudah commit + kembalikan detail penuh.
>
> Catatan: (1) response PATCH cuma `{ id, status }`, bukan object detail — idealnya kembalikan detail penuh (= 4.2); app kini mengambil ulang `GET /panic-buttons/{id}` setelah PATCH. (2) Pembatasan "khusus komandan" hanya di app — server tetap harus menolak dari non-komandan.

`PATCH /panic-buttons/{id}`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `status` | string | Wajib | `acknowledged` / `resolved` |
| `note` | string | Opsional | catatan (dipakai saat `resolved`) |

**Response `200`:**

```json
{
  "success": true,
  "message": "Status Panic Button berhasil diperbarui.",
  "data": {
    "id": 161,
    "status": "acknowledged"
  }
}
```
**Diharapkan:** object detail terbaru (bentuk = 4.2) **dan** perubahan benar-benar tersimpan.

## 5. Tracking Lokasi Personel

### 5.1 Overview

> [!DONE] Kartu "Peta Personel Real-time" (preview non-interaktif) di CommanderHome, layar **Peta Personel** fullscreen, dan layar **Tracking** (list). `PersonnelTracking` me-loop semua halaman (`fetchAllOverview`) karena search-nya client-side. Filter `status` server-side; marker callout / baris → detail personel (`{personnel}` = `service_number`). Sejak 2026-09-11, item juga menyertakan `photo` — dipakai sebagai foto marker di `organisms/PersonnelMap` (fallback inisial ber-tone status kalau tidak ada/tidak bisa ditampilkan); marker yang berdekatan pada zoom saat ini otomatis digabung jadi grid foto (maks. 4 sel — 2 sejajar / 2 atas+1 bawah / 2x2 penuh / 2 atas+1 bawah+badge "+sisa" tergantung jumlah anggotanya), otomatis terpisah lagi jadi marker individual begitu region cukup renggang. Tap marker (tunggal atau kelompok) membuka kartu detail mengambang (bisa digeser antar personel kalau kelompoknya berisi lebih dari satu orang) dengan ikon ke detail personel; marker yang dipilih disorot warna berbeda selama kartu itu terbuka.

`GET /locations/overview`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `page` | integer | Opsional | — |
| `per_page` | integer | Opsional | — |
| `status` | string | Opsional | `fresh` / `stale` / `offline` |
| `unit_id` | integer | Opsional | — |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "service_number": "3101050010",
      "full_name": "Andi Pratama",
      "rank": "SERKA",
      "unit": "Kompi A",
      "tenant_id": 1,
      "status": "fresh",
      "photo": "/api/secure-files/personnel/photos/abc.jpg",
      "location": {
        "id": 9901,
        "latitude": -6.1547,
        "longitude": 106.852,
        "accuracy": 8.0,
        "altitude": null,
        "heading": null,
        "speed": null,
        "captured_at": "2026-08-30T15:39:00+07:00",
        "source": "foreground-service"
      },
      "last_seen": "2026-08-30T15:39:00+07:00"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 50,
    "total": 120
  },
  "filters": {
    "status": null,
    "unit_id": null
  }
}
```

### 5.2 Detail Lokasi Personel

> [!DONE] Tab "Lokasi" di detail personel/persit (`organisms/LocationPanel` + `hooks/usePersonnelLocation`): fetch sekali lalu polling diam 60s **hanya saat tab Lokasi aktif**. Status badge + `PersonnelMap` + "Buka di Google Maps" + riwayat 50 entri (dari 5.3). Endpoint ini sendiri tidak mengirim `photo` di `profile` — marker foto di panel ini memakai `photo` dari detail Personel/Persit yang sudah dibuka (6.1/6.2), diteruskan lewat prop `LocationPanelPerson.photo`.

`GET /locations/{personnel}` — `{personnel}` = NRP (`service_number`).

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": 45,
      "service_number": "3101050010",
      "full_name": "Andi Pratama",
      "rank": "SERKA",
      "unit": "Kompi A",
      "tenant_id": 1
    },
    "location": null,
    "status": "offline",
    "history": []
  }
}
```

### 5.3 Riwayat Lokasi Personel

> [!DONE] "Muat lebih banyak" di riwayat pergerakan pada `LocationPanel` (50/halaman).

`GET /locations/{personnel}/history` — `{personnel}` = NRP.

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `page` | integer | Opsional | — |
| `from` / `to` | string | Opsional | rentang ISO-8601 |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 9901,
      "latitude": -6.1547,
      "longitude": 106.852,
      "accuracy": 8.0,
      "altitude": null,
      "heading": null,
      "speed": null,
      "captured_at": "2026-08-30T15:39:00+07:00",
      "source": "foreground-service"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 4,
    "per_page": 50,
    "total": 178
  }
}
```

## 6. Katalog / Direktori

### 6.1 Personel

> [!DONE] `CatalogList` + `CatalogDetail` (tab collapsing-header: Informasi / Riwayat visitor / Peminjaman Senjata / Lokasi). Sudah jalan di device. 5 resource katalog di-drive registry generic `utils/catalogResources.tsx`; semua list terima `search` + `page` + filter per-resource (diteruskan apa adanya sebagai query). Foto lewat secure-files (Umum §1.6).

`GET /catalog/personnel` · `GET /catalog/personnel/{personnel}` — `{personnel}` = **NRP** (`service_number`); resource lain di §6 pakai `id` numerik.

**Query (list):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `search` | string | Opsional | nama / NRP |
| `page` | integer | Opsional | — |
| `status` / `gender` / `blood_type` | string | Opsional | filter per-resource |

**Response list `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "service_number": "3101050010",
      "full_name": "Andi Pratama",
      "rank": "SERKA",
      "position": "Danton",
      "unit": "Kompi A",
      "gender": "male",
      "blood_type": "O",
      "phone": "0812…",
      "photo": "/api/secure-files/personnel/photos/abc.jpg",
      "status": "active",
      "is_active": true,
      "tenant_id": 1
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 41,
    "last_page": 1
  }
}
```

**Response detail `200`:**

```json
{
  "success": true,
  "data": {
    "id": 45,
    "service_number": "3101050010",
    "full_name": "Andi Pratama",
    "rank": "SERKA",
    "gender": "male",
    "birth_place": "Bandung",
    "birth_date": "1990-04-12",
    "birth_date_formatted": "12 April 1990",
    "blood_type": "O",
    "address": "…",
    "phone": "0812…",
    "photo": null,
    "status": "active",
    "is_active": true,
    "tenant_id": 1,
    "current_assignment": {
      "position": "Danton",
      "unit": "Kompi A",
      "start_date": "2024-01-01"
    },
    "assignment_history": [
      {
        "position": "Baton",
        "unit": "Kompi A",
        "start_date": "2022-01-01",
        "end_date": "2023-12-31",
        "is_primary": false
      }
    ],
    "family_members": [
      {
        "id": 171,
        "full_name": "Siti Rahayu",
        "family_relation": "Istri",
        "membership_number": "PST-0021",
        "phone": "0813…"
      }
    ],
    "vehicles": [
      {
        "id": 8,
        "brand_model": "Honda Vario 150",
        "plate_number": "D 1234 AB",
        "category": "roda_2",
        "condition_status": "good"
      }
    ],
    "health_summary": {
      "total_records": 3,
      "last_examined_at": "2026-08-20T09:00:00+07:00",
      "last_result": "Sehat"
    },
    "last_status_location": "inside",
    "visitor_log_history": [
      {
        "id": 90,
        "purpose": "Dinas",
        "entered_at": "2026-08-30T07:00:00+07:00",
        "exited_at": null,
        "status": "inside",
        "vehicle_plate": null,
        "vehicle_type": null
      }
    ],
    "weapon_loan_history": [
      {
        "id": 12,
        "weapon_number": "SB-0231",
        "serial_number": "PINDAD-21B0231",
        "purpose": "Latihan",
        "loaned_at": "2026-08-01T08:00:00+07:00",
        "returned_at": "2026-08-01T17:00:00+07:00",
        "status": "returned"
      }
    ]
  }
}
```
`family_members[]` tiap baris tappable → detail persit.

### 6.2 Persit (Keluarga)

> [!DONE] `CatalogList` + `CatalogDetail` (tab: Informasi / Riwayat visitor / Lokasi — tab Lokasi pakai posisi `spouse`). Sudah jalan di device.

`GET /catalog/persit` · `GET /catalog/persit/{id}`

**Query (list):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `search` | string | Opsional | — |
| `page` | integer | Opsional | — |

**Response list `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 171,
      "membership_number": "PST-0021",
      "full_name": "Siti Rahayu",
      "family_relation": "Istri",
      "phone": "0813…",
      "spouse": {
        "service_number": "3101050010",
        "full_name": "Andi Pratama",
        "rank": "SERKA"
      },
      "status": "active",
      "tenant_id": 1
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 120,
    "last_page": 3
  }
}
```

**Response detail `200`:**

```json
{
  "success": true,
  "data": {
    "id": 171,
    "membership_number": "PST-0021",
    "full_name": "Siti Rahayu",
    "family_relation": "Istri",
    "phone": "0813…",
    "birth_place": "Bandung",
    "birth_date": "1992-05-01",
    "birth_date_formatted": "1 Mei 1992",
    "blood_type": "B",
    "address": "…",
    "occupation": "Ibu Rumah Tangga",
    "photo": null,
    "status": "active",
    "tenant_id": 1,
    "spouse": {
      "id": 45,
      "service_number": "3101050010",
      "full_name": "Andi Pratama",
      "rank": "SERKA"
    },
    "last_status_location": "outside",
    "visitor_log_history": []
  }
}
```

### 6.3 Kendaraan

> [!DONE] `CatalogList` + `CatalogDetail` (non-tab; detail + "Log Pos Kendaraan" dari `visitor_log_history`). Sudah jalan di device.

`GET /catalog/vehicles` · `GET /catalog/vehicles/{id}`

**Query (list):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `search` | string | Opsional | — |
| `page` | integer | Opsional | — |

**Response list `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 114,
      "brand_model": "Toyota Hilux Double Cabin",
      "plate_number": "D 1234 AB",
      "category": "roda_4",
      "ownership_type": "dinas",
      "condition_status": "good",
      "photo": null,
      "owner": {
        "service_number": "3101050010",
        "full_name": "Andi Pratama"
      },
      "is_active": true,
      "tenant_id": 1
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 50,
    "last_page": 1
  }
}
```

**Response detail `200`:**

```json
{
  "success": true,
  "data": {
    "id": 114,
    "brand_model": "Toyota Hilux Double Cabin",
    "plate_number": "D 1234 AB",
    "engine_number": "2GD-1234567",
    "frame_number": "MHF…",
    "category": "roda_4",
    "ownership_type": "dinas",
    "condition_status": "good",
    "stnk_expired_at": "2026-11-12",
    "photo": null,
    "notes": "—",
    "is_active": true,
    "tenant_id": 1,
    "owner": {
      "id": 45,
      "service_number": "3101050010",
      "full_name": "Andi Pratama",
      "rank": "SERKA"
    },
    "visitor_log_history": [
      {
        "id": 55,
        "purpose": "Patroli",
        "entered_at": "2026-08-30T06:00:00+07:00",
        "exited_at": "2026-08-30T12:00:00+07:00",
        "status": "returned",
        "driver_passenger_name": "Serka Andi",
        "driver_passenger_phone": "0812…"
      }
    ]
  }
}
```

### 6.4 Kategori Senjata

> [!DONE] Detail: array `weapons` **terpaginasi 50/halaman** (meta di root `meta` → `weapons_meta`) + query `search` (nomor **atau** seri). Panel "Daftar Senjata" seed dari halaman pertama di response detail, lalu search debounce + "Muat lebih banyak" sendiri.

`GET /catalog/weapon-categories` · `GET /catalog/weapon-categories/{id}`

**Query (list):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `search` | string | Opsional | nama kategori |
| `page` | integer | Opsional | — |

**Query (detail):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `search` | string | Opsional | nomor **atau** seri senjata |
| `page` | integer | Opsional | halaman array `weapons` (50/halaman) |

**Response list `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 6,
      "name": "Senapan Serbu SS2-V1",
      "code": "SS2V1",
      "weapon_type": "senapan_serbu",
      "caliber": "5.56mm",
      "description": null,
      "is_active": true,
      "tenant_id": 1,
      "total_weapons": 18
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 6,
    "last_page": 1
  }
}
```

**Response detail `200`:**

```json
{
  "success": true,
  "data": {
    "id": 6,
    "name": "Senapan Serbu SS2-V1",
    "code": "SS2V1",
    "weapon_type": "senapan_serbu",
    "caliber": "5.56mm",
    "description": null,
    "is_active": true,
    "tenant_id": null,
    "weapons": [
      {
        "id": 231,
        "weapon_number": "SB-0231",
        "serial_number": "PINDAD-21B0231",
        "butt_number": "07",
        "ownership_type": "dinas",
        "condition_status": "good",
        "inventory_status": "in_use",
        "acquisition_date": "2021-03-01",
        "current_unit": "Kompi A",
        "is_active": true,
        "holder_info": {
          "type": "assignment",
          "holder_type": "personnel",
          "id": 45,
          "service_number": "3101050010",
          "full_name": "Andi Pratama",
          "rank": "SERKA",
          "unit": "Kompi A",
          "assigned_at": "2026-08-01T08:00:00+07:00"
        }
      }
    ]
  },
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 18,
    "last_page": 1
  }
}
```
`holder_info`: `holder_type: "other"` → `{ …, name }` (satuan/gudang) tanpa data personel; `null` → belum ada pemegang.

### 6.5 Distribusi Senjata

> [!DONE] `CatalogList` + `CatalogDetail` (non-tab). Sudah jalan di device.

`GET /catalog/weapon-assignments` · `GET /catalog/weapon-assignments/{id}`

**Query (list):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `search` | string | Opsional | — |
| `page` | integer | Opsional | — |

**Response list `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 124,
      "weapon_number": "SB-0231",
      "serial_number": "PINDAD-21B0231",
      "category": "SS2-V1",
      "assignment_type": "perorangan",
      "assigned_at": "2026-08-01T08:00:00+07:00",
      "returned_at": null,
      "status": "active",
      "assigned_to": {
        "type": "personnel",
        "id": 45,
        "service_number": "3101050010",
        "full_name": "Andi Pratama"
      },
      "tenant_id": 1
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 47,
    "last_page": 1
  }
}
```

**Response detail `200`:**

```json
{
  "success": true,
  "data": {
    "id": 124,
    "assignment_type": "perorangan",
    "assigned_at": "2026-08-01T08:00:00+07:00",
    "returned_at": null,
    "status": "active",
    "notes": "—",
    "tenant_id": 1,
    "weapon": {
      "id": 231,
      "weapon_number": "SB-0231",
      "serial_number": "PINDAD-21B0231",
      "category": "SS2-V1",
      "caliber": "5.56mm",
      "condition_status": "good",
      "inventory_status": "in_use"
    },
    "assigned_to": {
      "type": "personnel",
      "id": 45,
      "service_number": "3101050010",
      "full_name": "Andi Pratama"
    },
    "created_by": {
      "id": 1,
      "name": "Admin Gudang"
    }
  }
}
```

## 7. Alarm Satuan (Stelling)

### 7.1 Aktivasi Terkini

> [!DONE] Layar "Alarm Satuan" — **monitor read-only** (`stellingAlarm.service.ts`). Kartu paling atas: aktivasi stelling terakhir di satuan, di-tint sesuai `color` kode terkait. `null` = belum pernah ada aktivasi (kartu disembunyikan). **Tidak ada pemutaran audio** `audio_url` in-app (butuh native audio lib).

`GET /stelling-alarms/current`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 3,
    "code": "KUNING",
    "condition": "Siaga",
    "audio_url": null,
    "activated_at": "2026-09-01T05:00:00+07:00",
    "broadcast_status": "sent"
  }
}
```

Catatan: `data` bisa **`null`** (belum pernah ada aktivasi). `broadcast_status`: `sent` | `pending` | `failed` (string terbuka).

### 7.2 Daftar Kode Alarm

> [!DONE] Daftar referensi kode stelling + warna + rujukan audio. Dipakai untuk me-render list kode dan mencari `color` kode yang sedang aktif (7.1).

`GET /stelling-alarms`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "HIJAU",
      "name": "Aman",
      "condition": "Situasi normal",
      "color": "#16A34A",
      "is_active": true,
      "audio_url": null
    },
    {
      "id": 3,
      "code": "KUNING",
      "name": "Siaga",
      "condition": "Peningkatan kewaspadaan",
      "color": "#EAB308",
      "is_active": true,
      "audio_url": null
    }
  ]
}
```

### 7.3 Riwayat Aktivasi

> [!DONE] Daftar aktivasi stelling, terbaru → terlama (maks 20). Tiap baris menampilkan `code`, `condition`, waktu, dan pill `broadcast_status`.

`GET /stelling-alarms/history`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "code": "KUNING",
      "condition": "Siaga",
      "audio_url": null,
      "activated_at": "2026-09-01T05:00:00+07:00",
      "broadcast_status": "sent"
    }
  ]
}
```

### 7.4 Kirim Alarm

> [!TODO] Belum ada endpoint. Layar butuh tombol untuk mengaktifkan/menyiarkan sebuah kode stelling ke satuan (memicu broadcast FCM + membuat record aktivasi baru yang lalu muncul di 7.1 & 7.3). Kemungkinan khusus role tertentu (komandan) — backend yang menentukan.

`POST /stelling-alarms/activate`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `id` | integer | Wajib | id kode stelling dari 7.2 |

**Response `201`:**

```json
{
  "success": true,
  "message": "Alarm stelling diaktifkan.",
  "data": {
    "id": 9,
    "code": "KUNING",
    "condition": "Siaga",
    "audio_url": null,
    "activated_at": "2026-09-02T18:00:00+07:00",
    "broadcast_status": "pending"
  }
}
```

## 8. Kekuatan Apel

### 8.1 Daftar Agenda Apel

> [!PARTIAL] Alur baru sejak 2026-09-26: komandan / petugas piket (role `piket`) membuka **agenda**, perwakilan tiap kompi (role `perwakilan_kompi`) mengisi kehadiran kompinya, lalu piket menutup agenda. Kedua role diberikan otomatis saat ditunjuk (8.10 / 8.11). Pintu masuk: quick action "Kekuatan Apel" di Home Komandan (semua komandan) + shortcut "Apel" di Home Anggota untuk `piket` / `perwakilan_kompi`. Layar `screens/RollCall/Agendas`, service `services/api/rollCall.service.ts`. **Sudah di-wire, belum diuji end-to-end di device.** Endpoint lama (`/roll-calls/{session}/entries`, `/close`, `/personnel/search`) tidak dipakai lagi.

`GET /roll-calls`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "can_create_agenda": true,
    "is_representative": false,
    "represented_company": [{ "id": 124, "name": "Kima" }],
    "agendas": [
      {
        "id": 2,
        "session": "Apel Malam",
        "date": "2026-09-25",
        "wave": 1,
        "status": "open",
        "is_locked": false,
        "deadline": "2026-09-25T21:30:00+07:00",
        "progress": { "sudah": 1, "total": 11, "persen": 9, "belum": 10 },
        "totals": { "company": 1, "members": 1, "present": 1, "absent": 0, "persen": 100 },
        "my_submission": [{ "unit_id": 2, "is_submitted": true, "present": 1, "absent": 0 }]
      }
    ]
  }
}
```

- `can_create_agenda` → tombol "Buka Agenda Apel" + ikon Pengaturan. `is_representative` → strip "Kompi yang Anda wakili".
- Status badge: `TERBUKA` = `status: open` & `!is_locked` · `TERKUNCI` = `open` & `is_locked` (lewat `deadline`) · `DITUTUP` = status lain.
- `totals` hanya dari kompi yang **sudah** mengirim. `deadline` dibawa ke layar Rangkuman lewat param navigasi (8.3 tidak membawanya).
- **Respons asli (dicek di device 2026-09-26) berbeda dari dokumen:** `totals` masih berkey Indonesia —
  `{ "kompi": 1, "anggota": 1, "hadir": 0, "tidak_hadir": 1, "persen": 0 }` — dan agenda yang ditutup
  ber-`status: "finished"`. `progress.sudah/belum/persen` juga masih Indonesia. FE menerima kedua versi key.
- Untuk komandan, `represented_company` berisi **semua** kompi (dipakai FE sebagai cadangan daftar kompi di
  8.11 bila belum ada agenda).

### 8.2 Buka Agenda Apel

> [!PARTIAL] Layar `RollCall/AgendaCreate` — pilihan sesi dari 8.9 (hanya `is_active`), tanggal, gelombang (1–10), catatan. Sukses → `replace` ke Rangkuman. Belum diuji di device.

`POST /roll-calls/agenda`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `roll_call_session_type_id` | integer | Wajib | id sesi piket (8.9) |
| `date` | string | Wajib | `YYYY-MM-DD` |
| `wave` | integer | Opsional | gelombang bila sesi sama diadakan >1× sehari (bawaan 1) |
| `notes` | string | Opsional | catatan agenda |

**Response `201`:**

```json
{
  "success": true,
  "message": "Agenda apel dibuka. Notifikasi dikirim ke perwakilan kompi.",
  "data": { "id": 3 }
}
```

### 8.3 Rangkuman Agenda

> [!PARTIAL] Layar `RollCall/AgendaDetail` — satu layar untuk agenda terbuka & ditutup. `recap[]` dibagi "Belum Mengirim" / "Sudah Mengirim"; chip jumlah per alasan dihitung klien dari `absent[]`. Baris kompi yang belum mengirim bisa diketuk untuk mengisi **hanya oleh komandan**. Belum diuji di device.

`GET /roll-calls/agenda/{agenda}`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 2,
    "session": "Apel Malam",
    "date": "2026-09-25",
    "wave": 1,
    "status": "open",
    "is_locked": false,
    "progress": { "sudah": 1, "total": 11, "persen": 9, "belum": 10 },
    "totals": { "company": 1, "members": 1, "present": 1, "absent": 0, "persen": 100 },
    "recap": [
      {
        "unit_id": 124,
        "company": "Kima",
        "submitted": false,
        "members": 79,
        "present": 0,
        "absent": 0,
        "submitted_by": null,
        "submitted_at": null
      }
    ],
    "absent": [
      {
        "name": "Budi Santoso",
        "nrp": "123457",
        "rank": "Sersan Dua",
        "company": "Kima",
        "absence_reason": "Sakit",
        "note": "Demam"
      }
    ]
  }
}
```

Tidak membawa `deadline` → baris "Batas pengisian" hanya tampil bila dibuka dari 8.1 (param navigasi).
Respons asli: `totals` berkey Indonesia (sama seperti 8.1); `recap[].members` = `0` untuk kompi yang belum
mengirim (FE menampilkan "Belum mengirim").

### 8.4 Tutup & Buka Kembali Agenda

> [!PARTIAL] Tombol "Tutup Agenda" (popup konfirmasi, menyebut jumlah kompi yang belum mengirim) dan "Buka Kembali Agenda" di Rangkuman — komandan & piket saja. Belum diuji di device.

`POST /roll-calls/agenda/{agenda}/finish` · `POST /roll-calls/agenda/{agenda}/reopen`

**Tanpa parameter.**

**Response `200`:**

```json
{ "success": true, "message": "Agenda apel ditutup dan terkunci." }
```

`reopen` → `message: "Agenda apel dibuka kembali."`

### 8.5 Daftar Agenda Kompi (Perwakilan)

> [!PARTIAL] Layar `RollCall/CompanyAgendas` — "Perlu Diisi" (agenda terbuka yang belum dikirim) + "Sudah Dikirim". Tanpa batas waktu (endpoint ini tidak membawa `deadline`). Belum diuji di device.

`GET /roll-calls/companies`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "company": [{ "id": 124, "name": "Kima" }],
    "agendas": [
      {
        "id": 2,
        "session": "Apel Malam",
        "date": "2026-09-25",
        "wave": 1,
        "is_locked": false,
        "submission": [{ "unit_id": 124, "is_submitted": false, "present": 0, "absent": 0 }]
      }
    ]
  }
}
```

### 8.6 Form Pengisian Kompi

> [!PARTIAL] Layar `RollCall/CompanyForm` — anggota dikelompokkan per `unit`, pencarian nama/NRP, dua mode pencatatan (Catat Tidak Hadir: semua dianggap hadir · Catat Hadir: semua dianggap tidak hadir). `present: null` = belum diisi, ikut mode. `agenda.is_locked` → form read-only. Belum diuji di device.

`GET /roll-calls/agenda/{agenda}/companies/{unit}`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "agenda": { "id": 2, "session": "Apel Malam", "date": "2026-09-25", "is_locked": false },
    "company": { "id": 124, "name": "Kima" },
    "saved_mode": "present",
    "is_submitted": false,
    "members": [
      {
        "personnel_id": 45,
        "name": "Andi Pratama",
        "nrp": "123456",
        "rank": "Sersan Satu",
        "unit": "Kima",
        "present": null,
        "absence_reason_id": null,
        "absence_reason_other": null,
        "note": null
      }
    ],
    "absence_reason": [
      { "id": 1, "name": "Izin" },
      { "id": 2, "name": "Sakit" }
    ]
  }
}
```

### 8.7 Kirim Apel Kompi

> [!PARTIAL] Tombol "Kirim Apel Kompi" / "Kirim Perbaikan" — nonaktif selama ada anggota tidak hadir tanpa alasan. Boleh dikirim ulang selama agenda belum terkunci. Body dikirim sebagai JSON; field per anggota berupa objek ber-key `personnel_id` (dibaca Laravel sama dengan `alasan[45]`). Belum diuji di device.

`POST /roll-calls/agenda/{agenda}/companies/{unit}`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `mode` | string | Wajib | `present` / `absent` |
| `present` | array | Wajib | id personel yang **hadir**; yang tidak ada di daftar = tidak hadir |
| `alasan[personnel_id]` | integer \| string | Wajib per yang tidak hadir | id keterangan (8.8) atau `"lainnya"` |
| `alasan_lainnya[personnel_id]` | string | Opsional | teks bebas bila `"lainnya"` |
| `catatan[personnel_id]` | string | Opsional | catatan per anggota |

**Response `200`:**

```json
{
  "success": true,
  "message": "Apel kompi Kima berhasil dikirim.",
  "data": { "submitted_companies": 1, "total_companies": 11 }
}
```

Key body `alasan` / `alasan_lainnya` / `catatan` masih berbahasa Indonesia (belum diubah ke Inggris seperti response).

### 8.8 Keterangan Tidak Hadir

> [!PARTIAL] Dipakai di sheet "Alasan Tidak Hadir" — `note_label` tampil sebagai keterangan di bawah nama alasan. Opsi "Lainnya" ditambahkan FE. Belum diuji di device.

`GET /roll-calls/absence-reasons`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Izin", "note_label": "Meninggalkan dinas dengan izin sah" },
    { "id": 2, "name": "Sakit", "note_label": null }
  ]
}
```

### 8.9 Sesi Piket

> [!PARTIAL] Layar `RollCall/Sessions` + `RollCall/SessionForm` (Pengaturan Apel → Sesi Piket; komandan & piket). Switch = toggle; ubah mengirim hanya kolom yang berubah; hapus ditolak bila sesi sudah dipakai agenda (FE menyarankan nonaktifkan). Belum diuji di device.

`GET /roll-calls/sessions` · `POST /roll-calls/sessions` · `PATCH /roll-calls/sessions/{session}` · `POST /roll-calls/sessions/{session}/toggle` · `DELETE /roll-calls/sessions/{session}`

**Payload (body) — POST / PATCH:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `name` | string | Wajib (POST) | mis. Apel Pagi |
| `code` | string | Opsional | kode singkat, mis. APPAG |
| `start_time` | string | Wajib (POST) | `HH:MM` |
| `end_time` | string | Wajib (POST) | `HH:MM`, setelah `start_time` |
| `description` | string | Opsional | — |
| `sort_order` | integer | Opsional | urutan tampil |
| `is_active` | boolean | Opsional | bawaan `true` |

**Response `200` (GET):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Apel Pagi",
      "code": "APPAG",
      "start_time": "07:30:00",
      "end_time": "09:00:00",
      "description": null,
      "sort_order": 1,
      "is_active": true
    }
  ]
}
```

POST/PATCH → `data: { id, name }`; toggle → `data: { id, is_active }`; DELETE → `{ success, message }`.

### 8.10 Petugas Piket Batalyon

> [!PARTIAL] Layar `RollCall/Officers` + `RollCall/Appoint` (mode petugas). Tunjuk hanya komandan (tombol disembunyikan untuk piket). Menunjuk memberi role `piket`, menonaktifkan / mengakhiri mencabutnya. Di bawah nama tampil `username` apa adanya (tanpa pangkat — tidak ada di response). Belum diuji di device.

`GET /roll-calls/officers` · `POST /roll-calls/officers` · `POST /roll-calls/officers/{officer}/toggle` · `DELETE /roll-calls/officers/{officer}`

**Payload (body) — POST:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `user_id` | integer | Wajib | id dari 8.13 |

**Response `200` (GET):**

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "user_id": 9,
      "name": "Budi Santoso",
      "username": "123457",
      "is_active": true,
      "appointed_at": "2026-09-26T17:46:30+07:00"
    }
  ]
}
```

### 8.11 Perwakilan Kompi

> [!PARTIAL] Layar `RollCall/Representatives` + `RollCall/Appoint` (mode perwakilan). **Belum ada endpoint daftar kompi**, jadi daftar kompi diambil dari `recap[]` agenda terakhir (8.1 → 8.3) lalu digabung dengan list ini lewat `unit_id` — kosong sebelum agenda pertama dibuka. Menunjuk orang baru untuk kompi yang sudah punya perwakilan **otomatis menggantikan** yang lama (FE memberi popup konfirmasi). `username` tampil apa adanya. Belum diuji di device.

`GET /roll-calls/representatives` · `POST /roll-calls/representatives` · `POST /roll-calls/representatives/{representative}/toggle` · `DELETE /roll-calls/representatives/{representative}`

**Payload (body) — POST:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `unit_id` | integer | Wajib | kompi yang diwakili |
| `user_id` | integer | Wajib | id dari 8.13 |

**Response `200` (GET):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "unit_id": 124,
      "company": "Kima",
      "user_id": 10,
      "name": "Andi Pratama",
      "username": "1726107060080973",
      "is_active": true
    }
  ]
}
```

### 8.12 Statistik Apel

> [!PARTIAL] Strip "Statistik <bulan>" di Daftar Agenda + layar `RollCall/Stats` (Bulan ini / 7 hari / 30 hari / pilih tanggal). Persen per kompi dihitung klien, terendah di atas. Belum diuji di device.

`GET /roll-calls/stats`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `from` | date | Opsional | `YYYY-MM-DD`, bawaan awal bulan ini |
| `to` | date | Opsional | `YYYY-MM-DD`, bawaan hari ini |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-09-01", "to": "2026-09-30" },
    "agendas": 12,
    "present": 480,
    "absent": 20,
    "percentage": 96,
    "by_company": [{ "unit": "Kima", "present": 78, "absent": 4 }],
    "absence_reasons": [{ "reason": "Sakit", "total": 12 }]
  }
}
```

**Respons asli (dicek di device 2026-09-26) berbeda:** item `by_company` =
`{ "unit_id": 124, "company": "Kima", "members": 82, "submitted": 0, "pending": 1, "present": 0, "absent": 0, "percentage": null }`
(bukan `unit`), plus key tambahan di root: `reported`, `personnel`, `by_agenda`, `by_session`. FE memakai
`company` (cadangan `unit`); kompi tanpa kiriman ditampilkan "–".

### 8.13 Cari Prajurit

> [!PARTIAL] Pencarian di layar Tunjuk (debounce 400 ms, minimal 2 huruf). `id` hasil dipakai sebagai `user_id` saat menunjuk (asumsi FE). Belum diuji di device.

`GET /roll-calls/personnel-search`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `q` | string | Wajib | nama / NRP, minimal 2 huruf |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 569,
      "name": "Erik Angga Sugiarto",
      "username": "1726107060080973",
      "rank": "Prajurit Dua",
      "company": "Kipan A"
    }
  ]
}
```

### 8.14 Laporan Piket Batalyon

> [!PARTIAL] Kartu "Laporan Piket Batalyon" di Rangkuman (`RollCall/AgendaDetail`, komandan & piket saja): tombol "Kirim ke WhatsApp" (membuka WhatsApp dengan teks terisi lewat `whatsapp://send?text=`; bila gagal jatuh ke share sheet) dan "Bagikan" (share sheet sistem). Laporan diambil ulang tiap tombol ditekan. **FE hanya memakai `text`** (sama persis dengan tombol "Copy untuk WhatsApp" di web). Belum diuji di device — saat dicek belum ada agenda di server.

`GET /roll-calls/agenda/{agenda}/report`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "agenda": {
      "id": 4,
      "sesi": "Apel Pagi",
      "tanggal": "2026-09-26",
      "tanggal_teks": "26 September 2026",
      "gelombang": 1,
      "status": "open",
      "terkunci": false,
      "batas_waktu": "2026-09-26 23:59",
      "dibuka_oleh": "DEMO Komandan",
      "ditutup_oleh": null
    },
    "strength": {
      "actual_strength": 449,
      "companies_total": 12,
      "companies_reported": 1,
      "companies_pending": 11,
      "reported_members": 1,
      "present": 0,
      "absent": 1,
      "present_percent": 0
    },
    "per_company": [
      {
        "unit_id": 2,
        "company": "Kompi Senapan A",
        "is_reported": true,
        "reported_by": "DEMO Komandan",
        "submitted_at": "21:50",
        "members": 1,
        "present": 0,
        "absent": 1,
        "present_percent": 0
      }
    ],
    "absentees": [
      {
        "personnel_id": 5,
        "rank": "Sersan Dua",
        "name": "Demo Personnel",
        "service_number": "DEMO-0002",
        "company": "Kompi Senapan A",
        "reason": "Latihan di luar satuan",
        "note": "Diketahui komandan"
      }
    ],
    "absent_by_reason": { "Latihan di luar satuan": 1 },
    "by_rank_group": { "Bintara": { "hadir": 0, "tidak_hadir": 1, "total": 1 } },
    "officers": { "piket": [], "perwakilan": [] },
    "text": "Selamat malam, Komandan. Izin melaporkan Piket Batalyon sesi Apel Pagi tanggal 26 September 2026...."
  }
}
```

- Blok `agenda` berkey Indonesia (`sesi`, `tanggal`, `terkunci`, `batas_waktu`), beda dengan 8.3.
- Per golongan dihitung dari kompi yang sudah melapor; belum ada yang melapor → `absentees` & `by_rank_group` kosong.
- Data terstruktur (`strength`, `per_company`, `by_rank_group`, …) sudah diketik di `RollCallAgendaReport` tapi belum ditampilkan.

## 9. Buku Saku (E-Book)

Satu endpoint detail (`GET /handbook/articles/{id}`), tiga jenis halaman. `record_type` menentukan isinya — hanya SATU yang terisi:
`null` (materi, `type: content`) → `content` · `biodata` → `biodata` · `ability:<id>` → `ability_records`.

### 9.1 Daftar Bab & Daftar Isi

> [!DONE] Dipakai di tab `BukuSaku` (`getHandbookChaptersApi`) — "DAFTAR BAB" + pencarian judul bab **dan** judul halaman (halaman yang cocok tampil di bawah babnya, ketuk → langsung ke halaman itu). Bab yang punya halaman `record_display` diberi label "Data pribadi". Seluruh daftar isi sudah ikut di response ini, jadi `BukuSakuDetail` tidak perlu request tambahan untuk navigasi antar-halaman / sheet "Daftar Materi".

`GET /handbook/chapters`

**Tanpa parameter.** Endpoint sudah terfilter per tenant di backend.

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "BAB I: PEDOMAN DASAR & DOKTRIN MILITER",
      "icon": "shield",
      "sort_order": 1,
      "articles_count": 7,
      "articles": [
        {
          "id": 1,
          "title": "PANCASILA",
          "page_number": 1,
          "type": "article",
          "record_type": null
        },
        {
          "id": 15,
          "title": "BIODATA DIRI PRAJURIT",
          "page_number": 15,
          "type": "record_display",
          "record_type": "biodata"
        }
      ]
    }
  ]
}
```

Catatan:
- FE mengurutkan `data[]` berdasarkan `sort_order`, dan `articles[]` berdasarkan `page_number`. "Halaman X dari N" di detail = urutan di daftar isi, bukan `page_number`.
- `icon` string bebas dari backend (mis. `shield`, `clipboard-check`) — FE memetakannya ke ikon lewat `handbookIcon()` (fallback ikon `handbook`).
- `type` halaman materi di daftar ini masih bisa `article`, sementara detail (9.2) mengirim `content` — FE memperlakukan keduanya sama.

### 9.2 Halaman Materi

> [!DONE] `BukuSakuDetail` — halaman materi biasa (`record_type: null`), dibaca satu halaman per layar. Isi HTML dirender `RichTextContent`.

`GET /handbook/articles/{id}`

`{id}` = `articles[].id` dari 9.1.

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 12,
    "chapter_id": 2,
    "chapter_title": "BAB II: KEMAMPUAN DASAR",
    "title": "Lari 12 Menit",
    "page_number": 14,
    "type": "content",
    "record_type": null,
    "content": "<p>Lari 12 menit mengukur daya tahan prajurit...</p>",
    "biodata": null,
    "ability_records": []
  }
}
```

Catatan:
- `content` = Rich Text HTML, dirender tanpa WebView / lib tambahan. URL gambar di dalamnya mengarah ke `/api/secure-files/...` — FE menormalkan ke base URL API lalu merender lewat `SecureImage` (dengan header `Authorization`).

### 9.3 Halaman Biodata

> [!DONE] `BukuSakuDetail` → `BiodataPage` (`record_type: biodata`) — identitas prajurit yang sedang membuka. Umur, Lama menjabat, Data Pribadi, Data Kedinasan (mulai penugasan, status), dan Data Keluarga dilengkapi dari profil `/auth/me` yang sudah ada di app — hanya bila `personnel_id` sama dengan `user.personnel.id`.

`GET /handbook/articles/{id}`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 56,
    "chapter_id": 4,
    "chapter_title": "BAB IV: LEMBAR CATATAN & REKAM NILAI PRAJURIT",
    "title": "BIODATA DIRI PRAJURIT",
    "page_number": 1,
    "type": "record_display",
    "record_type": "biodata",
    "content": null,
    "biodata": {
      "personnel_id": 5,
      "name": "Demo Personnel",
      "nrp": "DEMO-0002",
      "rank": "Sersan Dua",
      "position": "Anggota",
      "unit": "Kompi Senapan A",
      "photo_url": "https://nagarunting.com/admin/secure-files/personnel/photos/DEMO-0002.png"
    },
    "ability_records": []
  }
}
```

Catatan:
- `position` ada di contoh kontrak tapi tidak ikut di response asli (dicek 26 Sep 2026, akun demokomandan) — FE jatuh ke `current_assignment.position` dari `/auth/me`.
- `photo_url` dirender lewat `SecureImage`; gagal dimuat → avatar inisial.

### 9.4 Halaman Nilai Kemampuan

> [!DONE] `BukuSakuDetail` → `AbilityPage` (`record_type: ability:<id>`) — `ability_records` = **riwayat semua penilaian** satu kemampuan (terbaru dulu), dirender `.map` jadi satu kartu per penilaian di bawah ringkasan (jumlah penilaian, nilai terakhir, jumlah terverifikasi). Bentuk berubah 26 Sep 2026 — sebelumnya satu entri + `history_count`.

`GET /handbook/articles/{id}`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 64,
    "chapter_id": 4,
    "chapter_title": "BAB IV: LEMBAR CATATAN & REKAM NILAI PRAJURIT",
    "title": "NILAI — Menembak 3 Sikap",
    "page_number": 9,
    "type": "record_display",
    "record_type": "ability:22",
    "content": null,
    "biodata": null,
    "ability_records": [
      {
        "ability_id": 22,
        "name": "Menembak 3 Sikap",
        "category": "Menembak",
        "valuation_type": "numeric",
        "unit": "nilai (maks 300)",
        "submitted_value": "252",
        "final_value": null,
        "value": "252",
        "status": "revision",
        "assessment_date": "2026-08-14",
        "instructor": "DEMO Komandan",
        "instructor_note": "Nilai tembak cepat perlu dicek ulang.",
        "rejection_reason": "Perlu verifikasi ulang tembak cepat.",
        "verified_at": "2026-09-26 13:56:41"
      },
      {
        "ability_id": 22,
        "name": "Menembak 3 Sikap",
        "category": "Menembak",
        "valuation_type": "numeric",
        "unit": "nilai (maks 300)",
        "submitted_value": "243",
        "final_value": "243",
        "value": "243",
        "status": "approved",
        "assessment_date": "2026-06-25",
        "instructor": "DEMO Komandan",
        "instructor_note": "Ada peningkatan pada tembak reaksi.",
        "rejection_reason": null,
        "verified_at": "2026-09-26 13:56:41"
      }
    ]
  }
}
```

Catatan:
- Kemampuan yang belum pernah dinilai → `ability_records: []` → state kosong "Belum ada nilai" (nama kemampuan diambil dari `title`).
- `status`: `approved` → "Terverifikasi" · `pending` → "Menunggu Verifikasi" · `revision` → "Perlu Revisi" (+ kotak "Alasan" dari `rejection_reason`).
- "Nilai akhir" = `final_value` (`null` → "–"). `value` = nilai yang berlaku (`final_value`, atau `submitted_value` bila belum ada) — dipakai untuk "Nilai terakhir" di ringkasan. "Diverifikasi" = `verified_at`, disembunyikan untuk `pending`.
- `valuation_type`: `numeric` / `count` / `duration` (angka + `unit`) · `level` / `pass_fail` (teks, mis. `baik` → "Baik"). Data asli juga berisi nilai teks bebas dengan `unit` seperti `tingkat`, `kategori` (nilai "A"), dan `daftar` (mis. "Helm, rompi taktis, webbing, ransel").
- FE mengatur ukuran nilai dari isinya (angka besar / teks pendek / teks panjang yang membungkus). `unit` hanya ditempel ke nilai berupa angka.

## 10. Patroli

### 10.1 Daftar Rute Patroli

> [!DONE] Rute patroli + checkpoint berurut. **Dua POV:** anggota (menjalankan patroli — shortcut "Patroli" di Akses Cepat Home anggota) & komandan (memantau saja — quick action "Monitoring Patroli", lihat §10.7). Layar anggota: `Patrol` (beranda) → `PatrolRouteDetail` → `PatrolActive` / `PatrolScan` / `PatrolPhoto`. `services/api/patrol.service.ts`. Diverifikasi via API live 2026-09-07.

`GET /patrols/routes`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tenant_id": 1,
      "name": "Patroli Perimeter Mako",
      "code": "RUTE-MKO-01",
      "description": "Keliling perimeter area Mako: gerbang utama, gedung, lapangan, gudang.",
      "is_active": true,
      "created_by_user_id": 205,
      "created_at": "2026-09-07T04:08:34.000000Z",
      "updated_at": "2026-09-07T04:08:34.000000Z",
      "status_summary": {
        "is_selectable": false,
        "has_ongoing_session": true,
        "ongoing_session_id": 1,
        "ongoing_officer": { "id": 102, "full_name": "Anggota Satuan", "service_number": "3101050002", "rank": null },
        "completed_today_count": 4
      },
      "checkpoints_count": 6,
      "checkpoints": [
        {
          "id": 1,
          "patrol_route_id": 1,
          "name": "Gerbang Utama",
          "sequence_order": 1,
          "qr_code": "QR-RUTE-MKO-01-P01",
          "latitude": -6.91916,
          "longitude": 107.61812,
          "radius_meters": 40,
          "notes": "Checkpoint posisi Gerbang Utama",
          "created_at": "2026-09-07T04:08:34.000000Z",
          "updated_at": "2026-09-07T04:08:34.000000Z"
        }
      ]
    }
  ]
}
```

Catatan:
- `checkpoints[]` diurutkan FE by `sequence_order`. `PatrolRouteDetail` menampilkan timeline checkpoint (kode QR, radius, koordinat).
- `status_summary`: kalau `is_selectable = false` **dan** `ongoing_session_id` bukan sesi milik user → kartu rute di daftar diredupkan + ikon gembok + banner "Sedang dipatroli oleh `<officer>`" + **tidak bisa diklik**. Kalau sesi berjalannya milik user sendiri → kartu tetap bisa diklik dan langsung ke `PatrolActive`.

### 10.2 Sesi Patroli Aktif Saya

> [!DONE] Sesi `in_progress` milik petugas yang login. Dipakai di layar `Patrol` (kartu "Sesi Berjalan") & `PatrolActive`. Diverifikasi via API live 2026-09-07 — response menyertakan `route.checkpoints[]` + `logs[]`, jadi `PatrolActive` tidak perlu request rute terpisah.

`GET /patrols/sessions/active`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 5,
    "tenant_id": 1,
    "patrol_route_id": 1,
    "officer_personnel_id": 101,
    "status": "in_progress",
    "started_at": "2026-09-07T04:10:07.000000Z",
    "completed_at": null,
    "total_checkpoints": 6,
    "completed_checkpoints": 0,
    "notes": "Patroli rutin siang",
    "created_at": "2026-09-07T04:10:07.000000Z",
    "updated_at": "2026-09-07T04:10:07.000000Z",
    "route": {
      "id": 1,
      "name": "Patroli Perimeter Mako",
      "code": "RUTE-MKO-01",
      "description": "Keliling perimeter area Mako: ...",
      "is_active": true,
      "checkpoints": [
        {
          "id": 1,
          "name": "Gerbang Utama",
          "sequence_order": 1,
          "qr_code": "QR-RUTE-MKO-01-P01",
          "latitude": -6.91916,
          "longitude": 107.61812,
          "radius_meters": 40
        }
      ]
    },
    "logs": []
  }
}
```

Catatan:
- `data` = `null` kalau petugas tidak punya sesi `in_progress` (FE juga menangani `404` → `null`).
- `started_at` ISO UTC (`…Z`). FE render pakai `toLocaleTimeString('id-ID')` (zona perangkat = WIB).
- Progres = `completed_checkpoints` / `total_checkpoints`. `logs[]` terisi setelah check-in (bentuk = `data.log` di §10.6) — FE memakainya untuk menandai checkpoint mana yang sudah selesai + stempel waktunya.

### 10.3 Mulai Patroli Baru

> [!DONE] `POST /patrols/sessions/start`. Diverifikasi via API live 2026-09-07: `200` `{ success:true, message, data:<sesi, bentuk = 10.2> }`. Dipanggil langsung dari `PatrolRouteDetail` (field "Catatan Awal" + tombol "Mulai Patroli Rute Ini") — tidak ada layar pilih-rute terpisah → sukses → `PatrolActive`.

`POST /patrols/sessions/start`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `patrol_route_id` | integer | Wajib | ID rute dari §10.1 |
| `notes` | string | Opsional | catatan awal patroli |

**Response `200`:**

```json
{
  "success": true,
  "message": "Sesi patroli berhasil dimulai.",
  "data": {
    "id": 6,
    "tenant_id": 1,
    "patrol_route_id": 2,
    "officer_personnel_id": 101,
    "status": "in_progress",
    "started_at": "2026-09-07T04:21:22.000000Z",
    "total_checkpoints": 5,
    "completed_checkpoints": 0,
    "notes": "Mulai dari pos jaga utama",
    "created_at": "2026-09-07T04:21:22.000000Z",
    "updated_at": "2026-09-07T04:21:22.000000Z",
    "route": { "id": 2, "name": "Patroli Pos Jaga Utama", "code": "RUTE-MKO-02", "checkpoints": [] }
  }
}
```

**Response `422`** (petugas masih punya sesi berjalan):

```json
{
  "success": false,
  "message": "Anda masih memiliki sesi patroli yang sedang berjalan.",
  "data": {
    "id": 7,
    "status": "in_progress",
    "total_checkpoints": 4,
    "completed_checkpoints": 0
  }
}
```

Catatan: pada `422` di atas FE menampilkan `StatusModal` "Sesi Patroli Masih Berjalan" dengan tombol **"Lihat Patroli Berjalan"** → `PatrolActive`. Body kosong / `patrol_route_id` hilang → `422` `{ message, errors: { patrol_route_id: [...] } }` standar Laravel.

### 10.4 Selesaikan Patroli

> [!DONE] `POST /patrols/sessions/{session}/complete` — `{session}` = id sesi. Diverifikasi via API live 2026-09-07: `200` `{ success:true, message, data:<sesi status "completed"> }`. Layar `PatrolActive` (tombol hijau "Selesaikan Patroli" → konfirmasi → `StatusModal` sukses → kembali).

`POST /patrols/sessions/{session}/complete`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "message": "Patroli berhasil diselesaikan.",
  "data": {
    "id": 6,
    "tenant_id": 1,
    "patrol_route_id": 2,
    "officer_personnel_id": 101,
    "status": "completed",
    "started_at": "2026-09-07T04:21:22.000000Z",
    "completed_at": "2026-09-07T04:27:10.000000Z",
    "total_checkpoints": 5,
    "completed_checkpoints": 0
  }
}
```

Catatan: FE mengizinkan selesai walau `completed_checkpoints < total_checkpoints` (konfirmasi menyebut sisa checkpoint yang belum diverifikasi).

### 10.5 Riwayat & Detail Sesi Patroli

> [!PARTIAL] `GET /patrols/sessions/history` — di `patrol.service.ts` (`getPatrolHistoryApi`), **belum dipakai layar**. `GET /patrols/sessions/{session}` (`getPatrolSessionApi`) **dipakai `PatrolMonitoringDetail`** (§10.7) untuk mengambil `route.checkpoints[]` lengkap; komandan bisa membaca sesi milik prajurit lain. Diverifikasi via API live 2026-09-07.

`GET /patrols/sessions/history` · `GET /patrols/sessions/{session}`

**Query** (`history`):

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `page` | integer | Opsional | — |
| `per_page` | integer | Opsional | default 15 |

**Response history `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tenant_id": 1,
      "patrol_route_id": 1,
      "officer_personnel_id": 102,
      "status": "in_progress",
      "started_at": "2026-09-07T03:28:34.000000Z",
      "completed_at": null,
      "total_checkpoints": 6,
      "completed_checkpoints": 2,
      "notes": "Patroli rutin siang hari",
      "created_at": "2026-09-07T04:08:34.000000Z",
      "updated_at": "2026-09-07T04:08:34.000000Z",
      "route": { "id": 1, "name": "Patroli Perimeter Mako", "code": "RUTE-MKO-01" },
      "officer": { "id": 102, "tenant_id": 1, "full_name": "...", "service_number": "..." }
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 0
  }
}
```

**Response detail `200`:** `{ success:true, data:<sesi, bentuk = 10.2 + "officer"> }`. `GET /patrols/sessions/{id}` untuk id yang tidak ada → `404`.

Catatan: `history` `data` = array polos + `meta` sibling (bukan Laravel paginator bersarang). `getPatrolHistoryApi` mengembalikan array `PatrolSession[]` (`meta` di-drop untuk sekarang).

### 10.6 Check-in Checkpoint (Scan QR + Selfie)

> [!DONE] `POST /patrols/sessions/{session}/checkin` — **multipart**. Diuji end-to-end di device 2026-09-07: `PatrolScan` (kamera QR 1:1) → cocok → `PatrolPhoto` (selfie kamera depan 1:1 + GPS riil) → "Kirim Bukti" → `StatusModal` sukses → kembali ke `PatrolActive` (progres & `logs[]` bertambah). Foto tersimpan di `log.photo_path` (mis. `patrol/photos/xxx.jpg`) — dilayani via `GET <API_BASE>/secure-files/<photo_path>` (butuh header `Authorization`; FE render pakai `SecureImage`). `log.photo_url` belum diisi backend (selalu `null`) — FE pakai `photo_path`. `PatrolScan` punya tombol `[DEV]` (`__DEV__` only) untuk melewati scan QR fisik saat uji.

`POST /patrols/sessions/{session}/checkin` — `Content-Type: multipart/form-data`.

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `qr_code` | string | Wajib | kode QR sticker checkpoint (mis. `QR-RUTE-MKO-01-P02`) |
| `latitude` | number | Wajib | koordinat GPS riil petugas |
| `longitude` | number | Wajib | koordinat GPS riil petugas |
| `photo` | file | Wajib | foto selfie (JPEG/PNG/WEBP, maks 10 MB) |
| `notes` | string | Opsional | catatan situasi checkpoint |

**Response `200`:**

```json
{
  "success": true,
  "message": "Checkpoint 'Gerbang Utama' berhasil dicatat (Jarak: 0m).",
  "data": {
    "log": {
      "id": 18,
      "patrol_session_id": 8,
      "patrol_checkpoint_id": 1,
      "scanned_at": "2026-09-07T06:50:43.000000Z",
      "scanned_latitude": -6.91916,
      "scanned_longitude": 107.61812,
      "distance_meters": 0,
      "is_valid_location": true,
      "notes": "Uji integrasi",
      "photo_path": "patrol/photos/2U5P2uSvhojworCSjbP8TgMHPctTtkxy0YJDrm2t.jpg",
      "photo_url": null,
      "checkpoint": { "id": 1, "name": "Gerbang Utama", "sequence_order": 1, "qr_code": "QR-RUTE-MKO-01-P01" }
    },
    "is_valid_location": true,
    "distance_meters": 0,
    "radius_tolerance_meters": 40,
    "progress": {
      "total_checkpoints": 6,
      "completed_checkpoints_count": 1,
      "remaining_checkpoints_count": 5,
      "is_all_completed": false,
      "percentage": 16.7
    },
    "completed_checkpoints": [{ "id": 1, "name": "Gerbang Utama", "sequence_order": 1 }],
    "remaining_checkpoints": [{ "id": 2, "name": "Gedung Mako (Depan)", "sequence_order": 2 }]
  }
}
```

Catatan:
- Foto tersimpan di `data.log.photo_path` (`photo_url` masih `null` — belum digenerate backend). FE menampilkan selfie di sheet detail log (`PatrolActive`, ketuk baris checkpoint yang sudah check-in) lewat `SecureImage` yang me-resolve `photo_path` → `<API_BASE>/secure-files/<photo_path>` + header `Authorization`.
- Check-in **di luar radius** tetap `200 success:true` — `message` menyebut jaraknya (mis. "…dicatat di luar radius toleransi (1232m dari 56m)."), `is_valid_location: false`. FE menampilkannya sebagai sukses dengan pesan itu.
- FE mengirim `latitude`/`longitude` dari `getCurrentCoordinates()` (akurasi tinggi). GPS gagal → `StatusModal` "Lokasi GPS Diperlukan" (buka Pengaturan Lokasi / izin app).
- `photo` dari `Camera.takePhoto()` VisionCamera (`{ uri: 'file://…', name, type: 'image/jpeg' }`).
- Setelah sukses, `PatrolActive` refetch `GET /patrols/sessions/active` → `logs[]` terisi (bentuk = `data.log` di atas); FE menentukan checkpoint "selesai" & "berikutnya" dari `logs[].patrol_checkpoint_id` (bukan asumsi berurutan).
- Body kosong → `422` `{ message, errors: { qr_code, latitude, longitude, photo } }` standar Laravel.

### 10.7 Monitoring Patroli (POV Komandan)

> [!DONE] `GET /patrols/monitoring` — endpoint khusus POV komandan untuk memantau seluruh sesi patroli prajurit + KPI summary. Diverifikasi via API live 2026-09-07. Quick action "Monitoring Patroli" di Home Komandan → `PatrolMonitoring` (KPI + filter + daftar sesi) → `PatrolMonitoringDetail`. Komandan **hanya memantau** — tidak ada tombol aksi. Belum ada role guard di backend (anggota juga bisa `200`) — FE membatasi lewat role.

`GET /patrols/monitoring`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `status` | string | Opsional | `in_progress` / `completed` — memfilter list **dan** `summary` |
| `page` | integer | Opsional | — |
| `per_page` | integer | Opsional | default 15 |

**Response `200`:**

```json
{
  "success": true,
  "message": "Data monitoring patroli berhasil dimuat.",
  "summary": { "total_sessions": 45, "in_progress_count": 3, "completed_count": 42 },
  "data": [
    {
      "id": 12,
      "status": "in_progress",
      "started_at": "2026-09-07T14:00:00+07:00",
      "completed_at": null,
      "duration_minutes": 42,
      "total_checkpoints": 5,
      "completed_checkpoints": 3,
      "progress_percentage": 60.0,
      "has_location_anomaly": false,
      "notes": "Patroli berjalan aman terkendali",
      "route": { "id": 1, "name": "Patroli Luar Mako", "code": "PTR-OUTER-01" },
      "officer": { "id": 5, "full_name": "Serda Andi Pratama", "service_number": "01010101", "rank": "SERDA" },
      "logs": [
        {
          "id": 88,
          "checkpoint": { "id": 10, "name": "Checkpoint 1 - Pos Utama", "sequence_order": 1, "qr_code": "CHK-PTR-1" },
          "scanned_at": "2026-09-07T14:15:00+07:00",
          "scanned_latitude": -6.917464,
          "scanned_longitude": 107.619123,
          "distance_meters": 8.4,
          "is_valid_location": true,
          "photo_url": "http://localhost:8000/api/secure-files/patrol/photos/img.jpg",
          "notes": "Pos utama terkunci aman"
        }
      ]
    }
  ],
  "meta": { "current_page": 1, "last_page": 3, "per_page": 15, "total": 45 }
}
```

Catatan:
- Bentuk response **bukan** `ApiResponse<T>` biasa — `summary` & `meta` ada di root, bukan di dalam `data`. `getPatrolMonitoringApi` mengembalikan `{ summary, sessions, meta }`.
- `summary` ikut menyempit kalau `status` dikirim → FE menahan KPI ke hasil tak-terfilter ("Semua") supaya angkanya stabil saat ganti filter.
- `logs[]` hanya checkpoint yang **sudah** di-check-in. Untuk daftar checkpoint **lengkap** (termasuk yang belum), `PatrolMonitoringDetail` juga memanggil `GET /patrols/sessions/{id}` (§10.5) → `route.checkpoints[]`, lalu digabung by `checkpoint.id`.
- `logs[].photo_url` di sini URL siap pakai (contoh backend `http://localhost:8000/...` → di produksi jadi host asli); FE tetap render lewat `SecureImage` (menempel header `Authorization` untuk host API sendiri).
- `has_location_anomaly` → banner peringatan "Ada check-in di luar radius checkpoint" pada kartu & detail sesi.

---

# Anggota

Endpoint berskup **user yang login** (dari `Authorization: Bearer`) — tanpa parameter NRP di
path. Dipakai `MemberHome` + turunannya.

## 1. Kartu Anggota — status verifikasi identitas

> [!DONE] `MemberHome` (`getMyIdCardApi`). `verification_status === 'verified'` → badge "Terverifikasi"; `qr_payload` → nilai QR (fallback NRP).

`GET /me/id-card`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "service_number": "31980412345678",
    "verification_status": "verified",
    "verified_at": "2026-08-01T09:00:00+07:00",
    "qr_payload": "31980412345678",
    "qr_expires_at": null
  }
}
```

- `verification_status`: `verified` | `pending` | `unverified` (fallback netral untuk nilai lain).
- `qr_expires_at`: `null` = tidak kedaluwarsa.

## 2. Status Saya

> [!DONE] `getMyStatusApi` — mengisi 3 tile pertama + label lokasi. Tile → "Belum Ada Data" kalau request gagal.

`GET /me/status`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "as_of": "2026-08-30T09:41:00+07:00",
    "presence": {
      "key": "at_base",
      "label": "Di Markas",
      "since": "2026-08-30T08:14:00+07:00"
    },
    "duty": {
      "key": "internal_duty",
      "label": "Dinas Dalam",
      "period_label": "Hari ini",
      "starts_at": "2026-08-30T07:00:00+07:00",
      "ends_at": "2026-08-30T19:00:00+07:00"
    },
    "location": {
      "label": "Markas",
      "accuracy_label": "Akurasi tinggi",
      "status": "fresh",
      "captured_at": "2026-08-30T09:39:00+07:00"
    }
  }
}
```

- `presence.key`: `at_base` | `off_base` | `on_leave` | `absent`.
- `duty.key`: `internal_duty` | `field_duty` | `guard` | `standby` | `off` | dst — label dari `duty.label`.
- `location.label`: hasil reverse-geocode / nama pos di backend (client tidak reverse-geocode).
- `location.accuracy_label`: string siap tampil; kalau kosong client turunkan dari `accuracy` `GET /locations/me`.

## 3. Aset Saya

> [!DONE] `MemberHome` "Aset Saya" (`getMyAssetsApi`, di-guard `Promise.allSettled`) — dua `AssetCard` (Senjata / Kendaraan), array kosong → placeholder "Belum ada …". Tap kartu → `BottomSheet` detail aset, datanya langsung dari item list (tanpa fetch tambahan).

`GET /me/assets`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "weapons": [
      {
        "id": 10,
        "weapon_number": "REG/1/0010",
        "serial_number": "8LV283851",
        "category": "Pistol P3 Pindad",
        "condition_status": "good",
        "condition_label": "Baik",
        "assigned_at": "2026-09-02T18:33:00+07:00"
      }
    ],
    "vehicles": [
      {
        "id": 2,
        "brand_model": "Honda Vario 150",
        "plate_number": "D 5678 XYZ",
        "category": "roda_2",
        "condition_status": "good",
        "condition_label": "Baik"
      }
    ]
  }
}
```

- Array kosong → client menampilkan empty-state.
- Senjata **dan kendaraan** sama-sama pakai `condition_status` (enum mentah, mis. `good`) + `condition_label`
  (siap tampil; client fallback ke `titleCase()`). **Tidak ada field STNK** di response ini.
- `vehicle.category` = enum mentah (`roda_2` / `roda_4` …) — client format jadi "Roda 2".

## 4. Aktivitas Terbaru (pergerakan saya)

> [!DONE] `MemberHome` "Aktivitas Terbaru" = 3 teratas (`per_page: 3`). "Lihat Semua" → layar **`MyMovements`** (`per_page: 20`, tarik-untuk-refresh + "muat lebih banyak"; kalau `meta` absen, lanjut selama halaman terakhir mengembalikan 20 item penuh). Baris pakai `TimelineRow`.

`GET /me/movements`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `page` | integer | Opsional | — |
| `per_page` | integer | Opsional | default 10 |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 5501,
      "direction": "in",
      "occurred_at": "2026-08-30T08:14:00+07:00",
      "location_label": "Pos Utama",
      "purpose": null,
      "note": "Masuk Markas"
    },
    {
      "id": 5498,
      "direction": "out",
      "occurred_at": "2026-08-30T07:05:00+07:00",
      "location_label": null,
      "purpose": "Dinas",
      "note": "Keluar Markas"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 6,
    "per_page": 10,
    "total": 58
  }
}
```

- `direction`: `in` (masuk markas) | `out` (keluar markas).
- Client: `note` sebagai judul, `location_label` / `purpose` sebagai detail, `occurred_at` diformat relatif.

## 5. Keluarga (Persit)

### 5.1 Detail Anggota Keluarga

> [!DONE] Layar `MeFamilyDetail` (`getMyFamilyMemberApi`), dibuka dari baris "Keluarga (Persit)" di `MemberHome` & `Profile`. Versi **berskup anggota** — dipakai karena `GET /catalog/persit/{id}` (Komandan) 403 untuk prajurit biasa. Kartu identitas + "Data Keluarga" + "Prajurit Terkait".

`GET /me/family/{id}`

`{id}` = `family[].id` dari `GET /auth/me` (id rekam Persit).

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 8,
    "full_name": "Sri Wahyuni",
    "membership_number": "P-000812",
    "phone": "081234567890",
    "birth_place": "Malang",
    "birth_date": "1990-04-12",
    "birth_date_formatted": "12 April 1990",
    "blood_type": "O",
    "address": "Asrama Blok C No. 4",
    "occupation": "-",
    "status": "active",
    "notes": null,
    "photo_url": null,
    "husband": {
      "id": 45,
      "full_name": "Andi Pratama",
      "service_number": "3101050010",
      "rank": "SERKA"
    },
    "wife": null,
    "last_location": null
  }
}
```

Catatan:
- Prajurit terkait ada di `husband` **atau** `wife` (tergantung gender anggota) — yang lain `null`.
- `last_location` = titik lokasi terakhir (bentuk = 5.2 `current_location`), `null` bila belum ada.
- FE membersihkan field placeholder `"-"` sebelum tampil (`occupation` di atas dianggap kosong).

### 5.2 Lokasi Anggota Keluarga

> [!PARTIAL] Layar `MeFamilyDetail` tab/section "Lokasi" (`getMyFamilyMemberLocationApi`, di-guard `Promise.allSettled` bareng 5.1) → `PersonnelMap` + "Buka di Google Maps". Di data uji `current_location` masih `null`; nama field titik lokasi (`latitude`/`longitude`/`accuracy`/`captured_at`) mengikuti konvensi endpoint lokasi lain — **konfirmasi saat payload terisi**.

`GET /me/family/{id}/location`

`{id}` = sama dengan 5.1.

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 8,
    "full_name": "Sri Wahyuni",
    "membership_number": "P-000812",
    "photo_url": null,
    "current_location": {
      "latitude": -7.9783,
      "longitude": 112.6265,
      "accuracy": 25,
      "captured_at": "2026-09-03T14:20:00+07:00",
      "source": "mobile"
    },
    "location_history": [
      {
        "latitude": -7.9783,
        "longitude": 112.6265,
        "accuracy": 25,
        "captured_at": "2026-09-03T14:20:00+07:00",
        "source": "mobile"
      }
    ]
  }
}
```

Catatan: `current_location` / entri `location_history[]` bisa `null` / `[]` bila anggota belum pernah terpantau lokasinya.

## 6. Kontak Darurat

> [!DONE] Layar `EmergencyContacts` (`getEmergencyContactsApi`), daftar tombol tap-to-call (`tel:`), dikelompokkan per `category`.

`GET /emergency-contacts`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "label": "Piket Batalyon",
      "phone": "62211234567",
      "category": "command"
    },
    {
      "id": 2,
      "label": "Kesehatan / Poliklinik",
      "phone": "62211234568",
      "category": "medical"
    },
    {
      "id": 3,
      "label": "Provos",
      "phone": "62211234569",
      "category": "security"
    }
  ]
}
```

## 7. Riwayat Kesehatan Saya

> [!DONE] Layar `HealthMyHistory` (dibuka dari tab Riwayat → menu Kesehatan). Header identitas + list `HealthRecordCard` + "muat lebih banyak" + tarik-untuk-refresh; tiap baris → `HealthRecordDetail` (mode **read-only**, record dioper lewat param — endpoint detail petugas 403 untuk anggota).

`GET /health/my` — **khusus anggota** (role prajurit).

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `page` | integer | Opsional | — |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "personnel": {
      "id": 5,
      "service_number": "70663085",
      "full_name": "Bagas Nugroho",
      "rank": "PRATU",
      "unit": "Kompi A",
      "photo": null
    },
    "records": [
      {
        "id": 216,
        "personnel_id": 5,
        "health_check_type": "Pemeriksaan Umum",
        "examined_at": "2026-08-20T09:00:00+07:00",
        "result": "Sehat",
        "notes": "Tekanan darah normal.",
        "examined_by": "Letda dr. Sari",
        "attachment_url": null,
        "created_at": "2026-08-20T09:05:00+07:00",
        "updated_at": "2026-08-20T09:05:00+07:00",
        "can_edit": false
      }
    ]
  },
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 4
  }
}
```

Catatan: bentuk **beda** dari list kesehatan lain — `data` = `{ personnel, records[] }`.

---

# Petugas Kesehatan

Endpoint `/health/*` untuk role `petugas_kesehatan` (juga `tenant_admin` / `superadmin`) —
butuh permission `health-officer.access`, backend **403** kalau tidak berwenang. `{personnel}`
di path = **NRP** (`service_number`). Envelope `{ success, data }`; list menambah `meta`.

## 1. Dashboard Kesehatan

> [!DONE] `HealthOfficerHome` (kartu `today_checked`/`month_total` + "Aktivitas Terbaru" dari `recent[]`) & layar `HealthDashboard` (tarik-untuk-refresh). Re-fetch saat tab fokus.

`GET /health/dashboard`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "today_checked": 4,
    "month_total": 37,
    "recent": [
      {
        "id": 217,
        "personnel_id": 5,
        "health_check_type": "Pemeriksaan Umum",
        "examined_at": "2026-09-02T09:00:00+07:00",
        "result": "Sehat",
        "notes": null,
        "examined_by": "Petugas Kesehatan",
        "attachment_url": null,
        "created_at": "2026-09-02T17:14:50+07:00",
        "updated_at": "2026-09-02T17:14:50+07:00",
        "can_edit": true
      }
    ]
  }
}
```

## 2. Jenis Pemeriksaan

> [!DONE] Mengisi `BottomSheet` "Jenis pemeriksaan" di `HealthRecordInput`. Di mode edit, string jenis dari detail dicocokkan balik ke `id` lewat daftar ini.

`GET /health/check-types`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Pemeriksaan Umum",
      "description": null
    },
    {
      "id": 2,
      "name": "Pemeriksaan Khusus",
      "description": "Pemeriksaan lanjutan / rujukan."
    }
  ]
}
```

## 3. Cari Anggota

> [!DONE] `HealthPersonnelSearch` — debounce 500ms, min 2 karakter. `route.params.mode === 'input'` → hasil langsung ke `HealthRecordInput`; selain itu ke `HealthPersonnelProfile`.

`GET /health/personnel/search`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `q` | string | Wajib | nama / NRP; min 2 karakter (`<2` → `422`); maks 20 hasil |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "service_number": "70663085",
      "full_name": "Bagas Nugroho",
      "rank": "PRATU",
      "unit": "Kompi A",
      "photo": null
    }
  ]
}
```

## 4. Profil Kesehatan Anggota

> [!DONE] `HealthPersonnelProfile` — identitas + `health_summary`. Re-fetch saat fokus. "Catat Pemeriksaan" → `HealthRecordInput`.

`GET /health/personnel/{personnel}` (NRP)

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 5,
    "service_number": "70663085",
    "full_name": "Bagas Nugroho",
    "rank": null,
    "position": null,
    "unit": "Kompi A",
    "status": "active",
    "photo": null,
    "health_summary": {
      "total_records": 2,
      "last_record": null
    }
  }
}
```

Catatan: `health_summary.last_record` = `HealthRecordSummary` (bentuk penuh di §5) | `null`.

## 5. Riwayat Pemeriksaan Anggota

> [!DONE] List paginasi di `HealthPersonnelProfile` ("muat lebih banyak").

`GET /health/personnel/{personnel}/records` (NRP)

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `type` | integer / string | Opsional | id atau nama jenis pemeriksaan |
| `from` / `to` | string | Opsional | rentang tanggal |
| `page` | integer | Opsional | — |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 331,
      "personnel_id": 45,
      "health_check_type": "Pemeriksaan Berkala",
      "examined_at": "2026-08-20T09:00:00+07:00",
      "result": "Sehat",
      "examined_by": "Letda dr. Sari",
      "notes": "Tekanan darah normal.",
      "attachment_url": null,
      "can_edit": true,
      "created_at": "2026-08-20T09:05:00+07:00",
      "updated_at": "2026-08-20T09:05:00+07:00"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 2
  }
}
```
`can_edit` dihitung **backend** (jendela 24 jam untuk petugas biasa) — FE cuma pakai flag ini untuk
menampilkan/menyembunyikan tombol "Ubah", tidak pernah menghitung jendelanya sendiri.

## 6. Input Pemeriksaan

> [!DONE] **Bug 422 sudah beres.** Diverifikasi via API live 2026-09-02 (akun `petkes`): `POST .../records` dengan JSON polos `{ health_check_type_id, examined_at, result, notes }` → `201` `{ success, message: "Pemeriksaan kesehatan berhasil dicatat.", data: <HealthRecordSummary> }`. FE sudah benar dari awal.
>
> Catatan: upload attachment **belum di-wired** (tidak ada picker lib) — endpoint menerima `attachment` multipart (PDF/JPG/PNG ≤ 10 MB) tapi app selalu kirim JSON polos. Riwayat lama: multipart pernah bikin backend salah parse `health_check_type_id` → app sengaja pakai JSON polos selama tak ada file (aturan ini tetap dipertahankan).

`POST /health/personnel/{personnel}/records` — `{personnel}` = NRP.

**Payload (body, JSON polos):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `health_check_type_id` | integer | Wajib | dari §2 |
| `examined_at` | string | Wajib | ISO-8601 + offset device (`toIsoWithOffset`); tidak boleh masa depan |
| `result` | string | Wajib | hasil pemeriksaan |
| `notes` | string | Opsional | — |
| `attachment` | file | Opsional | multipart (PDF/JPG/PNG ≤ 10 MB) — **belum dipakai app** |

**Response `201`:**

```json
{
  "success": true,
  "message": "Pemeriksaan kesehatan berhasil dicatat.",
  "data": {
    "id": 217,
    "personnel_id": 5,
    "health_check_type": "Pemeriksaan Umum",
    "examined_at": "2026-09-02T09:00:00+07:00",
    "result": "Sehat",
    "notes": "—",
    "examined_by": "Petugas Kesehatan",
    "attachment_url": null,
    "created_at": "2026-09-02T17:14:50+07:00",
    "updated_at": "2026-09-02T17:14:50+07:00",
    "can_edit": true
  }
}
```

## 7. Detail Pemeriksaan

> [!DONE] `HealthRecordDetail` untuk **petugas**. Untuk **anggota** yang melihat record sendiri, endpoint ini **403** ("Hanya petugas kesehatan yang berwenang") → `HealthMyHistory` mengoper record dari `/health/my` sebagai `route.params.record` + `readOnly: true`, layar render dari param & lewati fetch.

`GET /health/records/{id}`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "id": 216,
    "health_check_type": "Pemeriksaan Umum",
    "examined_at": "2026-08-20T09:00:00+07:00",
    "result": "Sehat",
    "notes": "Tekanan darah normal.",
    "examined_by": "Letda dr. Sari",
    "attachment_url": null,
    "can_edit": false,
    "created_at": "2026-08-20T09:05:00+07:00",
    "updated_at": "2026-08-20T09:05:00+07:00",
    "personnel": {
      "id": 5,
      "service_number": "70663085",
      "full_name": "Bagas Nugroho",
      "rank": "PRATU",
      "unit": "Kompi A",
      "photo": null
    }
  }
}
```
Anggota yang membuka record sendiri → **403** ("Hanya petugas kesehatan yang berwenang").

## 8. Ubah Pemeriksaan

> [!DONE] Terverifikasi di device + API live 2026-09-02 (`200`, `{ success, message: "Pemeriksaan kesehatan berhasil diperbarui.", data: <HealthRecordSummary> }`). `HealthRecordInput` dengan `route.params.recordId` → PUT. Hanya muncul kalau `can_edit` dari backend `true`. **PUT tidak menerima attachment** (per kontrak). `403` = jendela edit 24 jam lewat — pesan ramah dari backend, diteruskan lewat `extractErrorMessage`.

`PUT /health/records/{id}`

**Payload (body, JSON):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `health_check_type_id` | integer | Wajib | dari §2 |
| `examined_at` | string | Wajib | ISO-8601 + offset device; tidak boleh masa depan |
| `result` | string | Wajib | hasil pemeriksaan |
| `notes` | string | Opsional | — |

**Response `200`:**

```json
{
  "success": true,
  "message": "Pemeriksaan kesehatan berhasil diperbarui.",
  "data": {
    "id": 217,
    "personnel_id": 5,
    "health_check_type": "Pemeriksaan Umum",
    "examined_at": "2026-09-02T09:00:00+07:00",
    "result": "[uji] hasil pemeriksaan",
    "notes": "—",
    "examined_by": "Petugas Kesehatan",
    "attachment_url": null,
    "created_at": "2026-09-02T17:14:50+07:00",
    "updated_at": "2026-09-02T17:14:51+07:00",
    "can_edit": true
  }
}
```

## 9. Lampiran Pemeriksaan (unduh)

> [!DONE] Tombol "Unduh" di kartu attachment (`HealthRecordDetail`) — `downloadHealthAttachment` (`utils/healthAttachment.ts`) pakai **`react-native-blob-util`**: Android → DownloadManager ke folder Downloads publik + notifikasi; iOS → file-cache + share sheet. Header `Authorization` dari `healthAuthHeader()` (token live). Diakses baik petugas maupun anggota pemilik record (backend menegakkan).

`GET /health/records/{id}/attachment` — butuh `Authorization: Bearer`. URL absolut dibangun
`healthRecordAttachmentUrl()` (blob-util butuh URL penuh, bukan path relatif axios).

**Tanpa parameter.**

**Response**: berkas biner (PDF/JPG/PNG).

Catatan: belum bisa diuji end-to-end — semua record uji `attachment_url: null` (upload belum di-wired).
