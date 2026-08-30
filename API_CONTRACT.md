# API Contract — Smart Battalion (Draf)

Draf kontrak API untuk endpoint yang **belum ada** dan saat ini masih memakai data dummy di aplikasi.
Semua bentuk di bawah dibuat **seragam dengan API yang sudah berjalan** (`/auth/*`, `/locations/*`,
`/catalog/*`, `/panic-buttons`). Begitu backend menyediakan endpoint ini, tinggal ganti sumber data
di layar terkait (dummy-nya sudah dibentuk sama persis).

> Status: **usulan frontend**. Nama field/endpoint boleh disesuaikan tim backend selama bentuk
> envelope & pagination tetap konsisten.

---

## 1. Konvensi Umum

- **Base URL**: sama dengan sekarang — `Config.API_BASE_URL` sudah termasuk suffix `/api`. Path di
  bawah ditulis tanpa `/api` (mis. `/notifications`).
- **Auth**: `Authorization: Bearer <access_token>` + `Accept: application/json` untuk semua endpoint
  di bawah (kecuali disebut publik).
- **Envelope sukses** (identik dengan endpoint lain):
  ```json
  { "success": true, "message": "..opsional..", "data": <object|array>, "meta": { }, "filters": { } }
  ```
  - `data`: object untuk detail, array untuk list.
  - `meta`: **hanya untuk list berpaginasi** — `{ "current_page", "last_page", "per_page", "total" }`.
  - `filters`: opsional, echo filter aktif (pola sama seperti `/locations/overview`).
- **Envelope gagal**:
  ```json
  { "success": false, "message": "Pesan error untuk ditampilkan ke user" }
  ```
  Kode: `401` (token invalid → app auto-refresh/logout), `403`, `404`, `422` (validasi), `500`.
- **Pagination**: query `?page=<n>&per_page=<n>`. Default `per_page` 15–50 (samakan dengan katalog).
- **Waktu**: ISO-8601 dengan offset, mis. `"2026-08-30T14:32:00+07:00"` (sama seperti
  `location.captured_at`).
- **Enum**: dikirim `snake_case` / `UPPER_SNAKE` mentah; label untuk user dirapikan di client
  (`titleCase()`), sama seperti field katalog.

---

## 2. Home Komandan

### 2.1 Ringkasan Situasi + Distribusi Status

Mengisi bagian **"Ringkasan Situasi"** (4 kartu: Total Personel, Di Markas, Di Luar Markas, Absen)
dan **"Distribusi Status Personel"** bila nanti diaktifkan lagi.

```
GET /dashboard/situation
```

Query opsional: `unit_id`, `date` (default hari ini).

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

Query opsional: `unit_id`, `page`, `per_page` (default 10), `direction` (`in|out`).

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

Query opsional: `page`, `per_page` (default 10), `type` (`alert|announcement|info`), `since`.

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

### 2.5 Alarm Stelling (Quick Action "Alarm Satuan") — layar `AlarmSatuan`

**Sudah diintegrasikan** ke 3 endpoint di bawah (real). Aktivasi alarm belum ada endpoint-nya —
untuk sekarang layar hanya **memantau** status + daftar kode + riwayat.

```
GET /stelling-alarms/current      # aktivasi terbaru; data = null bila belum pernah
GET /stelling-alarms              # daftar kode alarm aktif (+ warna + audio_url)
GET /stelling-alarms/history      # riwayat aktivasi, maks 20, terbaru → terlama
GET /stelling-alarms/{alarm}/audio  # streaming audio, Authorization: Bearer {token}, 404 bila belum ada
```

`GET /stelling-alarms/current`
```json
{
  "success": true,
  "data": {
    "id": 12,
    "code": "NAGA MERAH",
    "condition": "Bahaya Udara",
    "audio_url": "https://app.smartbattalion.id/api/stelling-alarms/5/audio",
    "activated_at": "2026-08-28T00:10:00+07:00",
    "broadcast_status": "sent"
  }
}
```

`GET /stelling-alarms`
```json
{
  "success": true,
  "data": [
    { "id": 1, "code": "KOMODO", "name": "KOMODO", "condition": "Apel Luar Biasa",
      "color": "#3b82f6", "is_active": true,
      "audio_url": "https://app.smartbattalion.id/api/stelling-alarms/1/audio" },
    { "id": 5, "code": "NAGA MERAH", "name": "NAGA MERAH", "condition": "Bahaya Udara",
      "color": "#dc2626", "is_active": true,
      "audio_url": "https://app.smartbattalion.id/api/stelling-alarms/5/audio" }
  ]
}
```

`GET /stelling-alarms/history` — array item dengan bentuk = `data` pada `/current`.

- `broadcast_status`: dikenal `sent` | `pending` | `failed` (client fallback netral untuk nilai lain).
- **Catatan pemutaran audio in-app:** app belum bisa memutar `audio_url` di dalam aplikasi —
  belum ada library audio native terpasang (`react-native-video`/`-sound`/dsb). Broadcast alarm
  saat ini berbunyi lewat channel notifikasi darurat (Notifee, `Siren.mp3` bundled). Untuk memilih
  audio per-`code` sesuai kontrak ("Mobile memilih audio berdasarkan code yang diterima")
  diperlukan penambahan dependency audio + rebuild.

**Usulan endpoint aktivasi** (bila komandan boleh mengaktifkan dari mobile — belum dikonfirmasi):
```
POST /stelling-alarms/{alarm}/activate     # body: {} atau { "note": "..." }
```
Response = bentuk `data` pada `/current` (aktivasi baru).

---

## 3. Notifikasi (ikon lonceng di header)

### 3.1 List Notifikasi

```
GET /notifications
```

Query opsional: `page`, `per_page` (default 20), `only_unread` (`true|false`), `type`.

- `type`: `emergency | announcement | info | system`
- `meta.unread_total` = jumlah belum dibaca (dipakai badge di ikon lonceng).

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

Query opsional: `page`, `per_page` (default 20), `status` (`active | acknowledged | resolved`),
`unit_id`, `from`, `to`.

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

## 5. Detail Personel — Tab "Riwayat Keluar Masuk"

Saat ini tab ini memakai `MOVEMENT_DUMMY_ENTRIES` di
`src/screens/CatalogDetail/PersonnelTabs`. `{personnel}` = **NRP / service_number** (sama seperti
`GET /catalog/personnel/{personnel}` dan `GET /locations/{personnel}`).

```
GET /catalog/personnel/{personnel}/movements
```

Query opsional: `page`, `per_page` (default 15), `from`, `to`.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": 3310,
      "exit_at": "2026-08-28T13:00:00+07:00",
      "entry_at": "2026-08-28T17:00:00+07:00",
      "purpose": "Jaga Depan",
      "destination": "Pos Depan",
      "note": null,
      "approved_by": { "id": 5, "name": "Pasi Ops" },
      "recorded_by": { "id": 8, "name": "Piket Provost" }
    },
    {
      "id": 3298,
      "exit_at": "2026-08-27T08:00:00+07:00",
      "entry_at": "2026-08-27T12:00:00+07:00",
      "purpose": "Latihan Lapangan",
      "destination": "Lapangan B",
      "note": "Bersama Regu 2",
      "approved_by": { "id": 5, "name": "Pasi Ops" },
      "recorded_by": { "id": 8, "name": "Piket Provost" }
    },
    {
      "id": 3271,
      "exit_at": "2026-08-25T09:30:00+07:00",
      "entry_at": null,
      "purpose": "Izin Keluar Markas",
      "destination": "Kota",
      "note": "Belum kembali",
      "approved_by": { "id": 5, "name": "Pasi Ops" },
      "recorded_by": { "id": 8, "name": "Piket Provost" }
    }
  ],
  "meta": { "current_page": 1, "last_page": 4, "per_page": 15, "total": 52 }
}
```

- `entry_at` = `null` → masih di luar markas (belum absen masuk). Client menampilkan `-`.
- Client memformat tanggal sendiri (`formatDateTime`), tidak perlu field `*_formatted`.

Opsional (unit-wide, kalau nanti dibutuhkan di layar Riwayat): `GET /movements?unit_id=&direction=`
dengan item yang menyertakan objek `personnel` seperti pada `/activities/movements` (§2.2).

---

## 6. Keluarga (Persit)

### 6.1 List & Detail (sudah ada — didokumentasikan untuk keseragaman)

```
GET /catalog/persit
GET /catalog/persit/{id}        # {id} = id numerik persit, BUKAN membership_number
```

`GET /catalog/persit` — item:
```json
{
  "id": 45,
  "membership_number": "KTA-333459",
  "full_name": "Ny. Siti Anastasia Suartini",
  "family_relation": "wife",
  "phone": "6281581019906",
  "spouse": { "service_number": "3101050001", "full_name": "Anastasia Suartini", "rank": null },
  "status": "active",
  "tenant_id": 1
}
```

`GET /catalog/persit/{id}` — detail:
```json
{
  "success": true,
  "data": {
    "id": 45,
    "membership_number": "KTA-333459",
    "full_name": "Ny. Siti Anastasia Suartini",
    "family_relation": "wife",
    "phone": "6281581019906",
    "birth_place": "Gunungsitoli",
    "birth_date": "1997-07-02",
    "birth_date_formatted": "02 Jul 1997",
    "blood_type": "A",
    "address": "Psr. Bakau No. 392, Gunungsitoli 49504, Malut",
    "occupation": "Perawat",
    "photo": null,
    "status": "active",
    "tenant_id": 1,
    "spouse": { "id": 12, "service_number": "3101050001", "full_name": "Anastasia Suartini", "rank": null }
  }
}
```

### 6.2 Tab "Lokasi" di detail Persit

Tidak butuh endpoint baru — tab Lokasi memakai **`GET /locations/{spouse.service_number}`** yang
sudah ada (posisi pasangan prajurit). Bila `spouse` `null`, client menampilkan empty-state tanpa
memanggil API.

Bila nanti backend ingin menyediakan endpoint eksplisit:
```
GET /catalog/persit/{id}/spouse-location   # proxy ke /locations/{spouse_nrp}, bentuk response = PersonnelLocationDetail
```

---

## 7. Layar Lain yang Masih Dummy

| Layar / Menu           | Status        | Usulan endpoint |
|------------------------|---------------|-----------------|
| Buku Saku              | kosong        | `GET /handbook` → list kategori + `GET /handbook/{slug}` (isi markdown/HTML) |
| Laporan Cepat (QA)     | ComingSoon    | `POST /quick-reports` (body: `type`, `title`, `body`, `attachments[]`, `location`) + `GET /quick-reports` |
| Jadwal Piket (QA)      | ComingSoon    | `GET /duty-roster?week=` |
| Cuti & Izin (QA)       | ComingSoon    | `GET /leaves?status=` + `POST /leaves` |
| Statistik Unit (QA)    | ComingSoon    | `GET /dashboard/stats?range=` |
| Riwayat (tab)          | kosong        | agregat dari `/activities/movements`, `/leaves`, `/quick-reports` milik user login |
| Lainnya (tab)          | kosong        | menu statis di client (tidak perlu API) |

### 7.1 Buku Saku (contoh)

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

### 7.2 Laporan Cepat (contoh)

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
