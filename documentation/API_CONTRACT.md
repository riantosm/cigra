# API Contract — Smart Battalion

**Pengecekan frontend terakhir: 1 September 2026, 17.03 WIB**

Kontrak API untuk surface yang masih dummy + status integrasinya di app. Envelope, pagination
(`?page=&per_page=`), waktu ISO-8601 dengan offset, dan enum `snake_case` mentah — seragam dengan
API yang sudah berjalan (`/auth/*`, `/locations/*`, `/catalog/*`, `/panic-buttons`).

Legenda badge: **Sudah diintegrasikan** · **Ada catatan** (jalan, perlu penyesuaian) ·
**Error backend** (alur terblokir) · **Belum ada endpoint** (layar masih dummy).

---

## 1. Cek Versi Aplikasi

> [!DONE] FE selesai & terverifikasi di device (`appVersion.service.ts`, `utils/appVersion.ts`, `hooks/useAppVersionGate.ts`, `organisms/AppVersionGate` di `RootNavigator`). Endpoint live & sesuai kontrak. Catatan operasional: isi `download_url`/`store_url` + `latest_build` = `versionCode` rilis di backend sebelum flownya benar-benar mendorong update.

`GET /app-version` — publik, tanpa `Authorization`.

**Query:** — · **Payload:** —

**Response `200`**

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
    "ios": { "_": "bentuk sama; download_url null, store_url terisi" }
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

---

## 2. Home Komandan

### 2.1 Ringkasan Situasi

> [!TODO] `CommanderHome` `situationStats` masih hardcoded.

`GET /dashboard/situation`

**Query (opsional):** `unit_id` (filter unit) · `date` (default hari ini). · **Payload:** —

**Response `200`** — `data`: `as_of`, `total_personnel`, `summary[]` (`key`, `label`, `count`, `percent`),
`status_distribution[]` (bentuk sama), `active_alerts`.

```json
{
  "success": true,
  "data": {
    "as_of": "2026-08-30T15:07:00+07:00",
    "total_personnel": 427,
    "summary": [
      { "key": "at_base", "label": "Di Markas", "count": 381, "percent": 89.2 },
      { "key": "off_base", "label": "Di Luar Markas", "count": 46, "percent": 10.8 },
      { "key": "absent", "label": "Absen", "count": 5, "percent": 1.2 }
    ],
    "status_distribution": [
      { "key": "active", "label": "Aktif", "count": 376, "percent": 88.1 }
    ],
    "active_alerts": 1
  }
}
```

### 2.2 Aktivitas Terbaru (Pergerakan)

> [!TODO] Belum ada endpoint.

`GET /activities/movements`

**Query (opsional):** `unit_id` · `page`, `per_page` (default 10) · `direction` (`in` | `out`). · **Payload:** —

**Response `200`** — array + `meta` pagination. Item: `id`, `direction`,
`personnel{service_number, full_name, rank}`, `location_label`, `purpose`, `note`, `occurred_at`.

```json
{
  "success": true,
  "data": [
    { "id": 91, "direction": "out",
      "personnel": { "service_number": "3101050010", "full_name": "Serka Andi Pratama", "rank": "SERKA" },
      "location_label": "Pos Utama", "purpose": "Dinas", "note": "Keluar Markas",
      "occurred_at": "2026-08-30T14:32:00+07:00" }
  ],
  "meta": { "current_page": 1, "last_page": 5, "per_page": 10, "total": 47 }
}
```

### 2.3 Pengumuman & Alert (list)

> [!TODO] Endpoint mungkin sudah ada di backend, tapi `MemberHome` + `Notifications` masih pakai data `DUMMY_*` — layar belum dihubungkan.

`GET /announcements`

**Query (opsional):** `page`, `per_page` (default 10) · `type` (`alert` | `announcement` | `info`) ·
`since` (ISO-8601, hanya yang terbit setelah waktu ini). · **Payload:** —

**Response `200`** — array + `meta`. Item: `id`, `type`, `title`, `body`, `severity`,
`created_by{id, name}`, `published_at`.

```json
{
  "success": true,
  "data": [
    { "id": 12, "type": "alert", "title": "ALARM: KADAL",
      "body": "Kontigensi. Seluruh personel siaga di titik kumpul.", "severity": "high",
      "created_by": { "id": 1, "name": "Komandan Batalyon" },
      "published_at": "2026-08-30T09:30:00+07:00" }
  ],
  "meta": { "current_page": 1, "last_page": 3, "per_page": 10, "total": 24 }
}
```

### 2.4 Kirim Pengumuman

> [!TODO] Layar `SendAnnouncement` selesai; untuk sementara menyimpan ke redux lokal (`announcementCreated`, dipersist) dan langsung muncul di Notifikasi. Tinggal ganti ke `POST /announcements` + `GET /announcements/mine`.

`POST /announcements`

**Query:** — · **Payload:**

| field | nilai |
|---|---|
| `title` | string, ≤ 80 |
| `body` | string, ≤ 1000 |
| `type` | `announcement` \| `alert` \| `info` |
| `severity` | selalu `"normal"` dari client (backend boleh naikkan dari `type`, mis. `alert` → `high`) |
| `target` | `{ scope, unit_ids, role }` |

`target.scope`: `all` | `unit` | `role`. `unit_ids`: array angka (dipakai saat `scope = unit`).
`role`: string (dipakai saat `scope = role`), selain itu `null`.

```json
{
  "type": "announcement",
  "title": "Apel Pagi",
  "body": "Besok 06:00 di Lapangan Utama.",
  "severity": "normal",
  "target": { "scope": "unit", "unit_ids": [3], "role": null }
}
```

**Response `201`** — `data`: item pengumuman + `scope_label`, `recipients_count`, `created_by`, `created_at`.

**Riwayat terkirim:** `GET /announcements/mine` (array bentuk = `data` di atas + `meta`) ·
`DELETE /announcements/{id}` (tarik / hapus).

---

## 3. Notifikasi (ikon lonceng di header)

### 3.1 List

> [!TODO] `Notifications` pakai `DUMMY_NOTIFICATIONS` + digabung pengumuman lokal dari redux. Badge lonceng = 2 dummy-unread + jumlah pengumuman terkirim.

`GET /notifications`

**Query (opsional):** `page`, `per_page` (default 20) · `only_unread` (`true` | `false`) ·
`type` (`emergency` | `announcement` | `info` | `system`). · **Payload:** —

**Response `200`** — array + `meta` (termasuk `meta.unread_total` untuk badge lonceng). Item:
`id`, `type`, `title`, `body`, `read`, `created_at`, `action` (`{type, id}` tujuan navigasi, opsional / `null`).

```json
{
  "success": true,
  "data": [
    { "id": 501, "type": "emergency", "title": "Sinyal Darurat Baru",
      "body": "Praka Rizky Maulana menekan tombol darurat di Pos Timur.",
      "read": false, "created_at": "2026-08-30T15:03:00+07:00",
      "action": { "type": "emergency", "id": 88 } }
  ],
  "meta": { "current_page": 1, "last_page": 4, "per_page": 20, "total": 68, "unread_total": 4 }
}
```

### 3.2 Tandai Dibaca

> [!TODO] Belum ada endpoint.

`POST /notifications/{id}/read` · `POST /notifications/read-all`

**Query:** — · **Payload:** —

**Response `200`**: `{ "success": true, "data": { "unread_total": 3 } }`

---

## 4. Sinyal Darurat / Emergency

### 4.1 List

> [!TODO] Melengkapi `POST /panic-buttons` yang sudah live. `EmergencyList` masih `DUMMY_EMERGENCIES`. Bentuk `personnel` mengikuti `/locations/overview`.

`GET /panic-buttons`

**Query (opsional):** `page`, `per_page` (default 20) · `status` (`active` | `acknowledged` | `resolved`) ·
`unit_id` · `from`, `to` (rentang waktu ISO-8601). · **Payload:** —

**Response `200`** — array + `meta` + `filters`. Item: `id`, `status`,
`personnel{service_number, full_name, rank, unit, photo}`, `latitude`, `longitude`, `accuracy`,
`address`, `description`, `created_at`, `acknowledged_at`, `resolved_at`, `handled_by`.

```json
{
  "success": true,
  "data": [
    { "id": 88, "status": "active",
      "personnel": { "service_number": "3101050004", "full_name": "Praka Rizky Maulana", "rank": "PRATU", "unit": "Kompi Senapan A", "photo": null },
      "latitude": -6.15472, "longitude": 106.85201, "accuracy": 12.5,
      "address": "Pos Timur, Markas Batalyon", "description": "Tombol darurat ditekan.",
      "created_at": "2026-08-30T15:03:00+07:00",
      "acknowledged_at": null, "resolved_at": null, "handled_by": null }
  ],
  "meta": { "current_page": 1, "last_page": 2, "per_page": 20, "total": 23 },
  "filters": { "status": null, "unit_id": null }
}
```

### 4.2 Detail

> [!TODO] Belum ada endpoint.

`GET /panic-buttons/{id}`

**Query:** — · **Payload:** —

**Response `200`** — satu item list (bentuk = 4.1) + `timeline[]` (`{ event, actor, at }`).

### 4.3 Update Status

> [!TODO] Belum ada endpoint.

`PATCH /panic-buttons/{id}`

**Query:** — · **Payload:** `{ "status": "acknowledged" }` atau
`{ "status": "resolved", "note": "Sudah ditangani tim Pos Timur." }`

**Response `200`** — object detail terbaru (bentuk = 4.2).

---

## 5. Layar Lain yang Masih Dummy

Semua layar di bawah belum ada endpoint.

| Layar | Usulan endpoint |
|---|---|
| Buku Saku | `GET /handbook` (list) + `GET /handbook/{slug}` (isi markdown/HTML) |
| Laporan Cepat | `POST /quick-reports` + `GET /quick-reports` |
| Jadwal Piket | `GET /duty-roster?week=` |
| Cuti & Izin | `GET /leaves?status=` + `POST /leaves` |
| Statistik Unit | `GET /dashboard/stats?range=` |
| Riwayat (tab) | agregat `/activities/movements` + `/leaves` + `/quick-reports` milik user login |
| Lainnya (tab) | menu statis di client — tanpa API |

### 5.1 Buku Saku

> [!TODO] Belum ada endpoint.

`GET /handbook` → `data[]`: `{ slug, title, icon, updated_at }`

`GET /handbook/{slug}` → `data`: `{ slug, title, content_format: "markdown", content, updated_at }`

### 5.2 Laporan Cepat

> [!TODO] Belum ada endpoint.

`POST /quick-reports`

**Payload:** `{ type, title, body, location: { latitude, longitude, accuracy }, attachments: [] }`

**Response `201`** — `data`: `{ id, type, title, status: "submitted", reported_by, created_at }`
