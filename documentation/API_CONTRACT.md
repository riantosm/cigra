# API Contract — Smart Battalion (Draf)

Draf kontrak API untuk endpoint yang **belum ada** dan saat ini masih memakai data dummy di aplikasi.
Semua bentuk di bawah dibuat **seragam dengan API yang sudah berjalan** (`/auth/*`, `/locations/*`,
`/catalog/*`, `/panic-buttons`) — envelope sukses/gagal, pagination (`?page=&per_page=`), waktu
ISO-8601 dengan offset, dan enum `snake_case` mentah (label dirapikan di client). Begitu backend
menyediakan endpoint ini, tinggal ganti sumber data di layar terkait (dummy-nya sudah dibentuk sama
persis).

> Status: **usulan frontend**. Nama field/endpoint boleh disesuaikan tim backend selama bentuk
> envelope & pagination tetap konsisten.

---

## 1. Cek Versi Aplikasi (Force / Suggest Update)

App memeriksa apakah build yang terpasang sudah usang dibanding versi terbaru yang dirilis backend.
Dipakai saat app start (dan opsional saat `AppState` kembali `active`). **Semua perbandingan versi
dilakukan di client** — backend cukup mengumumkan versi terbaru + minimum per platform.

> **Status: SUDAH DIIMPLEMENTASIKAN & endpoint LIVE.** Bentuk response cocok 100% dengan kontrak di
> bawah. FE: `appVersion.service.ts` + `utils/appVersion.ts` + `hooks/useAppVersionGate.ts` +
> `organisms/AppVersionGate` (dipasang di `RootNavigator`, versi terpasang dibaca via
> `react-native-device-info`).
>
> **Gap data backend yang perlu dibereskan** (bukan mismatch kontrak):
> 1. `download_url` **dan** `store_url` dua-duanya masih `null` untuk android & ios → tombol
>    "Update Sekarang" belum punya tujuan. Minimal isi salah satu (Android: URL APK langsung;
>    iOS: URL App Store).
> 2. `latest_build` masih tidak sejalan dengan `versionCode` rilis nyata (contoh: API `latest_build: 1`
>    padahal APK yang beredar sudah `versionCode 2`). Backend harus mengisi `latest_build` = `versionCode`
>    (Android) / `CFBundleVersion` (iOS) build terbaru, atau aturan "build tertinggal → wajib update"
>    salah picu.

### 1.1 Endpoint

```
GET /app-version
```

**Publik** — tidak butuh `Authorization` (dicek juga di layar login). `Accept: application/json` tetap dikirim.

**Tanpa query.** Response memuat blok untuk tiap platform; client memilih blok sesuai `Platform.OS`,
lalu membandingkan sendiri dengan versi terpasang (`react-native-device-info` — `getVersion()` /
`getBuildNumber()`).

### 1.2 Response `200`

```json
{
  "success": true,
  "data": {
    "android": {
      "latest_version": "0.3",
      "latest_build": 3,
      "min_supported_version": "0.2",
      "download_url": "https://cdn.smartbattalion.example/apk/SmartBattalion-v0.3(3)-release.apk",
      "store_url": null,
      "release_notes": "- Perbaikan sinkronisasi lokasi\n- Tambah riwayat peminjaman senjata",
      "released_at": "2026-09-15T10:00:00+07:00"
    },
    "ios": {
      "latest_version": "0.3",
      "latest_build": 3,
      "min_supported_version": "0.2",
      "download_url": null,
      "store_url": "https://apps.apple.com/app/id6500000000",
      "release_notes": "- Perbaikan sinkronisasi lokasi\n- Tambah riwayat peminjaman senjata",
      "released_at": "2026-09-15T10:00:00+07:00"
    }
  }
}
```

Field berlaku untuk tiap blok platform:

| field | tipe | keterangan |
|-------|------|------------|
| `latest_version` | string | versi rilis terbaru (format sama dengan `versionName`, mis. `"0.3"`) |
| `latest_build` | number \| null | build number terbaru (opsional) |
| `min_supported_version` | string | versi minimum yang masih boleh dipakai |
| `download_url` | string \| null | link **langsung** ke APK terbaru (Android sideload). `null` kalau distribusi lewat store |
| `store_url` | string \| null | link Play Store / App Store (diutamakan di iOS) |
| `release_notes` | string \| null | catatan rilis untuk ditampilkan di modal (plain text / markdown ringan) |
| `released_at` | string \| null | ISO-8601 |

> **Perbandingan versi** dilakukan di client dengan semantic-version compare (`0.2` < `0.3` < `0.10`),
> bukan string compare. Urutan cek dari versi + build terpasang vs blok platform:
> 1. `build` terpasang **<** `latest_build` (ada APK lebih baru) → update **wajib** (harus unduh APK
>    baru). Dicek **paling awal**, sebelum `version` string — mis. `latest_build` 2 vs APK build 1 →
>    modal muncul; `latest_build` 2 vs APK build 2 → tidak muncul (2 < 2 salah). `latest_build`
>    diterima number (`2`) maupun string (`"2"`).
> 2. `version` terpasang **<** `min_supported_version` → update **wajib**
> 3. `min_supported_version` **≤** `version` terpasang **<** `latest_version` → update **disarankan**
> 4. selain itu → tidak ada update
>
> Cek `build` dilewati kalau `latest_build` (atau build terpasang) tidak diketahui. Kalau `version`
> terpasang tidak bisa diparse **dan** build tidak tertinggal, anggap tidak ada update (jangan blokir
> user karena format versi aneh).

### 1.3 Perilaku app

- **Update wajib** → `StatusModal` non-dismissable (`onRequestClose` no-op — pola sama seperti gate
  lokasi di `Home`), **bertema primary/biru** dengan ikon badge "download", satu tombol **"Update"**
  yang membuka `download_url` (atau `store_url`) via `Linking.openURL`; kalau dua-duanya `null`,
  tombol tetap "Update" tapi hanya cek ulang endpoint (menunggu backend mengisi URL). Di build debug
  (`__DEV__`) ada aksi sekunder "Lewati (dev)" supaya app tetap bisa dipakai saat pengembangan — di
  build release tidak ada.
- **Update disarankan** → `StatusModal` biasa (juga primary/biru + ikon "download") dengan aksi
  "Update" + "Nanti"; "Nanti" menyimpan `latest_version` yang di-skip di AsyncStorage (key
  `skipped_app_version`) supaya tidak muncul lagi untuk versi itu sampai ada rilis lebih baru.
- Request gagal (network / non-2xx) → **diabaikan diam-diam**, app jalan normal (jangan blokir user
  hanya karena cek versi gagal).

---

## 2. Home Komandan

### 2.1 Ringkasan Situasi + Distribusi Status

Mengisi bagian **"Ringkasan Situasi"** (4 kartu: Total Personel, Di Markas, Di Luar Markas, Absen)
dan **"Distribusi Status Personel"** bila nanti diaktifkan lagi.

```
GET /dashboard/situation
```

**Query** (opsional)

| Parameter | Keterangan |
|-----------|------------|
| `unit_id` | filter per unit |
| `date` | default: hari ini |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "as_of": "2026-08-30T15:07:00+07:00",
    "total_personnel": 427,
    "summary": [
      { "key": "at_base",   "label": "Di Markas",     "count": 381, "percent": 89.2 },
      { "key": "off_base",  "label": "Di Luar Markas", "count": 46,  "percent": 10.8 },
      { "key": "absent",    "label": "Absen",          "count": 5,   "percent": 1.2 }
    ],
    "status_distribution": [
      { "key": "active",    "label": "Aktif",      "count": 376, "percent": 88.1 },
      { "key": "field_duty","label": "Dinas Luar", "count": 28,  "percent": 6.6 },
      { "key": "permit",    "label": "Izin",       "count": 12,  "percent": 2.8 },
      { "key": "sick",      "label": "Sakit",      "count": 6,   "percent": 1.4 },
      { "key": "leave",     "label": "Cuti",       "count": 3,   "percent": 0.7 },
      { "key": "inactive",  "label": "Tidak Aktif","count": 2,   "percent": 0.4 }
    ],
    "active_alerts": 1
  }
}
```

### 2.2 Aktivitas Terbaru (Pergerakan)

Bagian **"Aktivitas Terbaru → Pergerakan Terakhir"**.

```
GET /activities/movements
```

**Query** (opsional)

| Parameter | Keterangan |
|-----------|------------|
| `unit_id` | filter per unit |
| `page`, `per_page` | pagination — default `per_page` 10 |
| `direction` | `in` \| `out` |

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": 91,
      "direction": "out",
      "personnel": { "service_number": "3101050010", "full_name": "Serka Andi Pratama", "rank": "SERKA" },
      "location_label": "Pos Utama",
      "purpose": "Dinas",
      "note": "Keluar Markas",
      "occurred_at": "2026-08-30T14:32:00+07:00"
    },
    {
      "id": 90,
      "direction": "in",
      "personnel": { "service_number": "3101050011", "full_name": "Praka Rizky Maulana", "rank": "PRAKA" },
      "location_label": "Pos Utama",
      "purpose": null,
      "note": "Masuk Markas",
      "occurred_at": "2026-08-30T13:58:00+07:00"
    }
  ],
  "meta": { "current_page": 1, "last_page": 5, "per_page": 10, "total": 47 }
}
```

### 2.3 Pengumuman & Alert (list)

Bagian **"Aktivitas Terbaru → Pengumuman & Alert"**.

```
GET /announcements
```

**Query** (opsional)

| Parameter | Keterangan |
|-----------|------------|
| `page`, `per_page` | pagination — default `per_page` 10 |
| `type` | `alert` \| `announcement` \| `info` |
| `since` | ISO-8601 — hanya yang terbit setelah waktu ini |

**Response `200`**
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
      "created_by": { "id": 1, "name": "Komandan Batalyon" },
      "published_at": "2026-08-30T09:30:00+07:00"
    },
    {
      "id": 11,
      "type": "announcement",
      "title": "Apel Pagi",
      "body": "Besok 06:00 di Lapangan Utama.",
      "severity": "normal",
      "created_by": { "id": 4, "name": "Pasi Ops" },
      "published_at": "2026-08-30T08:15:00+07:00"
    }
  ],
  "meta": { "current_page": 1, "last_page": 3, "per_page": 10, "total": 24 }
}
```

### 2.4 Kirim Pengumuman (Quick Action) — layar `SendAnnouncement`

Layar form sudah dibangun. Sementara ini **draf lokal**: pengumuman yang dikirim disimpan di
`redux` (dipersist) dan langsung dimunculkan di daftar Notifikasi (§3) di perangkat pengirim.
Begitu endpoint ada, `POST /announcements` menggantikan `announcementCreated` dan `GET
/announcements/mine` mengisi seksi "Riwayat Terkirim".

**Field form → payload**

| Form (label UI)  | field payload  | nilai |
|------------------|----------------|-------|
| Judul            | `title`        | string, ≤ 80 |
| Isi Pengumuman   | `body`         | string, ≤ 1000 |
| Tipe             | `type`         | `announcement` \| `alert` \| `info` |
| Kirim ke         | `target.scope` | `all` \| `unit` \| `role` |

Form tidak lagi punya input prioritas — client selalu mengirim `severity: "normal"` (backend boleh
menurunkan dari `type`, mis. `alert` → `high`).

```
POST /announcements
```

**Body**
```json
{
  "type": "announcement",
  "title": "Apel Pagi",
  "body": "Besok 06:00 di Lapangan Utama.",
  "severity": "normal",
  "target": { "scope": "unit", "unit_ids": [3], "role": null }
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Pengumuman terkirim ke 128 personel.",
  "data": {
    "id": 13,
    "type": "announcement",
    "title": "Apel Pagi",
    "body": "Besok 06:00 di Lapangan Utama.",
    "severity": "normal",
    "scope_label": "Kompi Senapan A",
    "recipients_count": 128,
    "created_by": { "id": 1, "name": "Komandan Batalyon" },
    "created_at": "2026-08-30T15:20:00+07:00"
  }
}
```

**Riwayat terkirim (untuk seksi "Riwayat Terkirim" di layar)**
```
GET /announcements/mine        # pengumuman yang dibuat user login
DELETE /announcements/{id}      # tarik/hapus pengumuman
```
`GET /announcements/mine` — array item dengan bentuk = `data` pada response `POST` di atas,
`meta` pagination standar.

---

## 3. Notifikasi (ikon lonceng di header)

### 3.1 List Notifikasi

```
GET /notifications
```

**Query** (opsional)

| Parameter | Keterangan |
|-----------|------------|
| `page`, `per_page` | pagination — default `per_page` 20 |
| `only_unread` | `true` \| `false` |
| `type` | `emergency` \| `announcement` \| `info` \| `system` |

`meta.unread_total` = jumlah belum dibaca (dipakai badge di ikon lonceng).

**Response `200`**
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
      "action": { "type": "emergency", "id": 88 }
    },
    {
      "id": 500,
      "type": "announcement",
      "title": "Apel Pagi",
      "body": "Apel pagi besok pukul 06.00 di Lapangan Utama.",
      "read": false,
      "created_at": "2026-08-30T14:10:00+07:00",
      "action": { "type": "announcement", "id": 11 }
    },
    {
      "id": 499,
      "type": "info",
      "title": "Perawatan Kendaraan",
      "body": "Jadwal perawatan rutin kendaraan dinas telah diperbarui.",
      "read": true,
      "created_at": "2026-08-30T09:00:00+07:00",
      "action": null
    }
  ],
  "meta": { "current_page": 1, "last_page": 4, "per_page": 20, "total": 68, "unread_total": 4 }
}
```

- `action` (opsional): tujuan navigasi saat item ditekan. `type` mengikuti resource yang sudah ada
  (`emergency`, `announcement`, `personnel`, dst) + `id`.

### 3.2 Tandai Dibaca

```
POST /notifications/{id}/read
POST /notifications/read-all
```

**Response `200`**
```json
{ "success": true, "message": "Notifikasi ditandai dibaca.", "data": { "unread_total": 3 } }
```

---

## 4. Sinyal Darurat / Emergency (list & detail)

Melengkapi `POST /panic-buttons` yang sudah ada. Bentuk `personnel` & `location` mengikuti pola
`/locations/overview`.

### 4.1 List

```
GET /panic-buttons
```

**Query** (opsional)

| Parameter | Keterangan |
|-----------|------------|
| `page`, `per_page` | pagination — default `per_page` 20 |
| `status` | `active` \| `acknowledged` \| `resolved` |
| `unit_id` | filter per unit |
| `from`, `to` | rentang waktu (ISO-8601) |

**Response `200`**
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
        "photo": "https://ui-avatars.com/api/?name=Praka+Rizky+Maulana&background=3a7ca5&color=fff"
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
    },
    {
      "id": 87,
      "status": "resolved",
      "personnel": {
        "service_number": "3101050002",
        "full_name": "Anggota Satuan",
        "rank": "PRATU",
        "unit": "Kompi Senapan A",
        "photo": null
      },
      "latitude": -6.15444,
      "longitude": 106.853,
      "accuracy": 11.0,
      "address": "Kompi Senapan A",
      "description": "Sinyal darurat.",
      "created_at": "2026-08-30T12:00:00+07:00",
      "acknowledged_at": "2026-08-30T12:02:00+07:00",
      "resolved_at": "2026-08-30T12:40:00+07:00",
      "handled_by": { "id": 1, "name": "Komandan Batalyon" }
    }
  ],
  "meta": { "current_page": 1, "last_page": 2, "per_page": 20, "total": 23 },
  "filters": { "status": null, "unit_id": null }
}
```

### 4.2 Detail

```
GET /panic-buttons/{id}
```

**Response `200`** — sama seperti satu item list, ditambah `history` pergerakan singkat & `timeline`:
```json
{
  "success": true,
  "data": {
    "id": 88,
    "status": "active",
    "personnel": { "service_number": "3101050004", "full_name": "Praka Rizky Maulana", "rank": "PRATU", "unit": "Kompi Senapan A", "photo": null },
    "latitude": -6.15472, "longitude": 106.85201, "accuracy": 12.5,
    "address": "Pos Timur, Markas Batalyon",
    "description": "Tombol darurat ditekan.",
    "created_at": "2026-08-30T15:03:00+07:00",
    "acknowledged_at": null, "resolved_at": null, "handled_by": null,
    "timeline": [
      { "event": "created", "actor": null, "at": "2026-08-30T15:03:00+07:00" }
    ]
  }
}
```

### 4.3 Update Status

```
PATCH /panic-buttons/{id}
```

**Body**: `{ "status": "acknowledged" }` atau `{ "status": "resolved", "note": "Sudah ditangani tim Pos Timur." }`

**Response `200`**: object detail terbaru (bentuk sama seperti 4.2).

---

## 5. Layar Lain yang Masih Dummy

| Layar / Menu           | Status        | Usulan endpoint |
|------------------------|---------------|-----------------|
| Buku Saku              | kosong        | `GET /handbook` → list kategori + `GET /handbook/{slug}` (isi markdown/HTML) |
| Laporan Cepat (QA)     | ComingSoon    | `POST /quick-reports` (body: `type`, `title`, `body`, `attachments[]`, `location`) + `GET /quick-reports` |
| Jadwal Piket (QA)      | ComingSoon    | `GET /duty-roster?week=` |
| Cuti & Izin (QA)       | ComingSoon    | `GET /leaves?status=` + `POST /leaves` |
| Statistik Unit (QA)    | ComingSoon    | `GET /dashboard/stats?range=` |
| Riwayat (tab)          | kosong        | agregat dari `/activities/movements`, `/leaves`, `/quick-reports` milik user login |
| Lainnya (tab)          | kosong        | menu statis di client (tidak perlu API) |

### 5.1 Buku Saku (contoh)

```
GET /handbook
```
```json
{
  "success": true,
  "data": [
    { "slug": "protap-jaga", "title": "Protap Jaga", "icon": "shield-check", "updated_at": "2026-07-01T09:00:00+07:00" },
    { "slug": "kontak-darurat", "title": "Kontak Darurat", "icon": "phone", "updated_at": "2026-06-15T09:00:00+07:00" }
  ]
}
```

```
GET /handbook/{slug}
```
```json
{
  "success": true,
  "data": {
    "slug": "protap-jaga",
    "title": "Protap Jaga",
    "content_format": "markdown",
    "content": "## Protap Jaga\n\n1. ...",
    "updated_at": "2026-07-01T09:00:00+07:00"
  }
}
```

### 5.2 Laporan Cepat (contoh)

```
POST /quick-reports
```
```json
{
  "type": "kejadian",
  "title": "Pohon tumbang di gerbang timur",
  "body": "Akses terhalang, perlu bantuan.",
  "location": { "latitude": -6.1547, "longitude": 106.852, "accuracy": 10.0 },
  "attachments": []
}
```
**Response `201`**
```json
{
  "success": true,
  "message": "Laporan terkirim.",
  "data": {
    "id": 71,
    "type": "kejadian",
    "title": "Pohon tumbang di gerbang timur",
    "status": "submitted",
    "reported_by": { "id": 22, "name": "Serka Andi Pratama" },
    "created_at": "2026-08-30T15:40:00+07:00"
  }
}
```
