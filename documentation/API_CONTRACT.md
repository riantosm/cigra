# API Contract — Smart Battalion Apps

**Pengecekan terakhir: 3 September 2026**

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
  → HealthOfficerHome, selain itu → MemberHome. `instruktur_apel` di `roles` memunculkan quick
  action Kekuatan Apel.
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
    "family": null
  }
}
```

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

Catatan: `data` tidak meng-echo `description`.
## 8. Push Notification (FCM)

> [!DONE] Tanpa endpoint REST — `initializePushNotifications(roles)` subscribe ke FCM topic per role lewat `@react-native-firebase/messaging`. Backend cukup mem-broadcast ke topic. Notifikasi in-app tetap dibaca dari `GET /notifications` (§3).

---

# Komandan

Endpoint untuk role `komandan` (sebagian juga `instruktur_apel`). Backend **wajib** menegakkan
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

> [!DONE] Kartu "Peta Personel Real-time" (preview non-interaktif) di CommanderHome, layar **Peta Personel** fullscreen, dan layar **Tracking** (list). `PersonnelTracking` me-loop semua halaman (`fetchAllOverview`) karena search-nya client-side. Filter `status` server-side; marker callout / baris → detail personel (`{personnel}` = `service_number`).

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

> [!DONE] Tab "Lokasi" di detail personel/persit (`organisms/LocationPanel` + `hooks/usePersonnelLocation`): fetch sekali lalu polling diam 60s **hanya saat tab Lokasi aktif**. Status badge + `PersonnelMap` + "Buka di Google Maps" + riwayat 50 entri (dari 5.3).

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

### 8.1 Daftar Sesi Apel

> [!DONE] Roll-call/apel — quick action "Kekuatan Apel" di Home Komandan, **hanya untuk role `instruktur_apel`** (backend menegakkan). 6 layar `RollCall*`, `services/api/rollCall.service.ts`. `{session}` di endpoint = id numerik sesi. Layar `RollCallList`: daftar berpaginasi + tarik-untuk-refresh + "muat lebih banyak", diuji di device.

`GET /roll-calls` — paginated (Laravel paginator di dalam `data`).

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `page` | integer | Opsional | — |
| `per_page` | integer | Opsional | — |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "tenant_id": 1,
        "date": "2026-08-28",
        "time": "07:00:00",
        "name": "Apel Pagi Satuan",
        "status": "open",
        "created_by": 2,
        "closed_by": null,
        "closed_at": null,
        "created_at": "...",
        "updated_at": "...",
        "recap": {
          "total": 41,
          "present": 0,
          "absent": 2,
          "unmarked": 39,
          "percentage": 0
        }
      }
    ],
    "total": 1
  }
}
```
FE menormalkan jadi `{ items, meta: { current_page, last_page, per_page, total } }` — `last_page`/`per_page`
dihitung sendiri kalau backend tidak mengirimnya. Tiap item punya `recap` opsional (bentuk = 8.3) → kartu
daftar menampilkan "N hadir · N tidak hadir · N belum" tanpa buka detail.

### 8.2 Buka Sesi Apel Baru

> [!DONE] Bug 500 sudah diperbaiki backend. Diverifikasi via API live 2026-09-02: `POST /roll-calls` → `201` `{ success, message: "Sesi kekuatan apel berhasil dibuka.", data: <sesi> }`, sesi hasilnya muncul di `GET /roll-calls` (`created_by` = user pembuat).

`POST /roll-calls`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `date` | string | Wajib | `YYYY-MM-DD` |
| `time` | string | Wajib | `HH:MM` |
| `name` | string | Opsional | nama sesi apel |

**Response `201`:**

```json
{
  "success": true,
  "message": "Sesi kekuatan apel berhasil dibuka.",
  "data": {
    "id": 6,
    "tenant_id": 1,
    "date": "2026-09-04T17:00:00.000000Z",
    "time": "06:30",
    "name": "Apel Siang Satuan",
    "status": "open",
    "created_by": 205,
    "created_at": "2026-09-02T10:14:24.000000Z",
    "updated_at": "2026-09-02T10:14:24.000000Z"
  }
}
```

Catatan: `date` disimpan sebagai **datetime ISO UTC** (`…T17:00:00.000000Z` = tengah malam WIB), bukan `"YYYY-MM-DD"` yang dikirim — FE parse via `new Date(...)` + `toLocaleDateString('id-ID')`.

### 8.3 Detail & Rekap Sesi

> [!DONE] Dipakai di `RollCallDetail` (kartu status + rekap + daftar Hadir/Absen/Belum) & jadi sumber roster untuk `RollCallSearch`. Diverifikasi via API live 2026-09-02: `recap` **sudah konsisten** dengan panjang array — sesi uji: `recap {present:30, absent:2, unmarked:9}` cocok dengan `present[].length`/`absent[].length`/`unmarked[].length`. Inkonsistensi lama sudah diperbaiki backend.

`GET /roll-calls/{session}`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "session": {
      "id": 1,
      "tenant_id": 1,
      "date": "2026-09-01T17:00:00.000000Z",
      "time": "07:00:00",
      "name": "Apel Pagi Satuan",
      "status": "open"
    },
    "recap": {
      "total": 41,
      "present": 30,
      "absent": 2,
      "unmarked": 9,
      "percentage": 73.2
    },
    "breakdown": [
      {
        "name": "Dinas",
        "count": 1
      },
      {
        "name": "Izin",
        "count": 1
      }
    ],
    "present": [
      {
        "id": 10,
        "roll_call_session_id": 2,
        "personnel_id": 45,
        "status": "present",
        "absence_reason_id": null,
        "note": null,
        "input_by_user_id": 205,
        "personnel": {
          "id": 45,
          "full_name": "Andi Pratama",
          "service_number": "123456",
          "rank": {
            "…": "objek pangkat"
          },
          "current_assignment": {
            "…": ""
          }
        }
      }
    ],
    "absent": [
      {
        "id": 38,
        "personnel_id": 77,
        "status": "absent",
        "absence_reason_id": 3,
        "note": null,
        "absence_reason": {
          "id": 3,
          "name": "Dinas",
          "description": "…",
          "sort_order": 3
        },
        "personnel": {
          "…": "objek Personnel lengkap"
        }
      }
    ],
    "unmarked": [
      {
        "id": 47,
        "full_name": "Candra Wijaya",
        "service_number": "123458",
        "…": "objek Personnel lengkap"
      }
    ]
  }
}
```

- `present[]` / `absent[]` = objek entry (`id`, `roll_call_session_id`, `personnel_id`, `status`,
  `absence_reason_id`, `note`, `input_by_user_id`, `+ personnel`). `unmarked[]` = objek Personnel
  langsung (`id` = personnel_id), bukan objek entry.
- `personnel` di present/absent/unmarked adalah **objek Personnel lengkap** (`rank_id`, `rank` object,
  `current_assignment`, `photo_path`, `foto`, `birth_date`, dst.) — FE hanya membaca `full_name` +
  `service_number`.
- `absent[].absence_reason` = objek reason lengkap (`id`, `name`, `description`, `sort_order`, …) — FE
  membaca `name`. `breakdown[]` = `{ name, count }` per keterangan absen.

### 8.4 Input Kehadiran Anggota

> [!DONE] Alur: Detail sesi → "Input Absen" (Hadir / Tidak Hadir) → layar Cari Personel (`RollCallSearch`) → Scan QR (`RollCallScan`, ikon di header; `react-native-vision-camera` + izin kamera) atau isi manual (`RollCallEntry`). Diuji di device (Hadir & Tidak Hadir) + verifikasi API live 2026-09-02: `200` `{ success, message: "Status personel berhasil disimpan.", data: <entry> }`, tercatat di rekap sesi.

`POST /roll-calls/{session}/entries` — `{session}` = id numerik sesi.

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `personnel_id` | integer | Wajib | ID internal Personnel (dari 8.3 / 8.7) |
| `status` | string | Wajib | `present` / `absent` |
| `absence_reason_id` | integer | Wajib jika `absent` | id dari 8.6 |
| `note` | string | Opsional | FE mengisi saat keterangan = "Lainnya" |

**Response `200`:**

```json
{
  "success": true,
  "message": "Status personel berhasil disimpan.",
  "data": {
    "id": 19,
    "tenant_id": 1,
    "roll_call_session_id": 2,
    "personnel_id": 9,
    "status": "absent",
    "absence_reason_id": 8,
    "note": "Kabur",
    "input_by_user_id": 205,
    "deleted_at": null,
    "created_at": "2026-09-02T06:24:17.000000Z",
    "updated_at": "2026-09-02T10:30:50.000000Z"
  }
}
```

Catatan: entry `present` bisa tanpa `note`/`deleted_at`; `absent` menyertakannya.
### 8.5 Tutup Sesi Apel

> [!DONE] Tombol "Tutup Sesi" di `RollCallDetail` (khusus sesi `open`, konfirmasi dulu). Diuji di device + verifikasi API live 2026-09-02 — `200` `{ success, message: "Sesi kekuatan apel berhasil ditutup.", data: <sesi lengkap status:"closed"> }`.

`POST /roll-calls/{session}/close` — mengunci sesi.

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "message": "Sesi kekuatan apel berhasil ditutup.",
  "data": {
    "id": 6,
    "tenant_id": 1,
    "date": "2026-09-04T17:00:00.000000Z",
    "time": "06:30:00",
    "name": "Apel Siang Satuan",
    "status": "closed",
    "created_by": 205,
    "closed_by": 205,
    "closed_at": "2026-09-02T10:14:25.000000Z",
    "deleted_at": null,
    "created_at": "2026-09-02T10:14:24.000000Z",
    "updated_at": "2026-09-02T10:14:25.000000Z"
  }
}
```

Catatan: `data` = objek sesi lengkap (FE `RollCallCloseResult` cuma pakai `id`/`status`/`closed_by`/`closed_at`).

### 8.6 Daftar Keterangan Absen

> [!DONE] Mengisi chip keterangan di `RollCallEntry`. Terpakai saat input "Tidak Hadir" yang diuji di device + verifikasi API live 2026-09-02.

`GET /roll-calls/absence-reasons`

**Tanpa parameter.**

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Izin",
      "description": "Meninggalkan dinas/apel dengan izin atasan yang sah.",
      "sort_order": 1,
      "is_active": true,
      "tenant_id": 1,
      "deleted_at": null,
      "created_at": "2026-08-28T03:55:45.000000Z",
      "updated_at": "2026-08-28T03:55:45.000000Z"
    }
  ]
}
```

Catatan: (FE cuma pakai `id`, `name`, `description`). 8 keterangan: Izin, Sakit, Dinas, Cuti, Pendidikan, Lepas Dinas, Tanpa Keterangan, Lainnya. `name` mengandung "lain" → memunculkan kolom teks bebas → dikirim sebagai `note`.

### 8.7 Smart Search Personnel

> [!DONE] Dipakai untuk resolusi `personnel_id` di `RollCallScan` (cocokkan `service_number` dari payload QR) dan sebagai fallback pencarian. Terpakai di alur input yang diuji di device.

`GET /roll-calls/personnel/search?q={keyword}` — cari anggota aktif dalam satuan (nama/NRP), real-time.

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `q` | string | Wajib | nama / NRP (real-time) |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 9,
      "tenant_id": 1,
      "user_id": 10,
      "service_number": "63813596",
      "full_name": "Adiarja Sihotang",
      "rank_id": 7,
      "birth_place": "Bukittinggi",
      "birth_date": "1976-07-18T17:00:00.000000Z",
      "blood_type": "B",
      "gender": "male",
      "status": "active",
      "rank": {
        "id": 7,
        "name": "SERKA"
      },
      "current_assignment": {
        "unit": "Kompi A"
      }
    }
  ]
}
```

Catatan: backend kirim objek Personnel penuh; FE hanya baca `id` (dipakai sebagai `personnel_id`), `full_name`, `service_number`.

## 9. Layar Lain yang Masih Dummy

### 9.1 Buku Saku

> [!TODO] Belum ada endpoint — usulan.

`GET /handbook` · `GET /handbook/{slug}`

**Tanpa parameter.**

**Response list `200` (usulan):**

```json
{
  "success": true,
  "data": [
    {
      "slug": "sop-piket",
      "title": "SOP Piket",
      "icon": "shield",
      "updated_at": "2026-08-01T00:00:00+07:00"
    }
  ]
}
```

**Response detail `200` (usulan):**

```json
{
  "success": true,
  "data": {
    "slug": "sop-piket",
    "title": "SOP Piket",
    "content_format": "markdown",
    "content": "# SOP …",
    "updated_at": "2026-08-01T00:00:00+07:00"
  }
}
```

### 9.2 Laporan Cepat

> [!TODO] Belum ada endpoint.

`POST /quick-reports`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `type` | string | Wajib | jenis laporan |
| `title` | string | Wajib | — |
| `body` | string | Wajib | isi laporan |
| `location` | object | Opsional | `{ latitude, longitude, accuracy }` |
| `attachments` | array | Opsional | — |

**Response `201` (usulan):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "kejadian",
    "title": "Contoh",
    "status": "submitted",
    "reported_by": {
      "id": 45,
      "name": "Andi"
    },
    "created_at": "2026-09-02T10:00:00+07:00"
  }
}
```

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

## 5. Kontak Darurat

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

## 6. Riwayat Kesehatan Saya

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
