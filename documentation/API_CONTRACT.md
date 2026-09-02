# API Contract — Smart Battalion

**Pengecekan frontend terakhir: 1 September 2026, 18.59 WIB**

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

> [!DONE] Dipakai di "Ringkasan Situasi" Home Komandan. Kartu pertama selalu Total Personel (`total_personnel`), sisanya diambil dari `summary[]` (maks 4 kartu). Ikon & warna kartu ditentukan dari `key` tiap item — sudah dikenali: `at_base`, `off_base`, `absent`, `on_leave`; `key` lain akan tampil dengan ikon & warna default. Banner "Sinyal Darurat Aktif" mengambil angka dari `active_alerts`.
>
> Catatan: `status_distribution[]` belum ditampilkan di aplikasi. Supaya ikon & warna kartu cocok, pastikan `key` pada `summary[]` konsisten dengan daftar di atas; teks kartu diambil apa adanya dari `label`.

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

> [!DONE] Di Home Komandan, "Aktivitas Terbaru" menampilkan 3 pergerakan terbaru. Tiap baris bisa di-tap untuk membuka detail personel yang bersangkutan. "Lihat Semua" membuka halaman **Aktivitas** — daftar lengkap dengan tarik-untuk-refresh dan "muat lebih banyak".
>
> Catatan: halaman ini khusus data satuan (untuk komandan). Home Anggota memakai endpoint lain (`GET /me/movements`, lihat API_CONTRACT_ANGGOTA §4) untuk aktivitas milik user sendiri.

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

> [!DONE] `GET /announcements` sudah dipakai di seluruh aplikasi. "Pengumuman Terbaru" tampil di Home Komandan & Home Anggota (masing-masing 3 terbaru), dan tiap baris **bisa di-tap** untuk membuka pop-up baca-penuh (judul + isi lengkap + pengirim/waktu). "Lihat Semua" membuka halaman **Pengumuman** — daftar lengkap dengan tarik-untuk-refresh dan "muat lebih banyak", tiap baris juga bisa di-tap. Semua diambil dari data list; **tidak ada endpoint detail terpisah**.
>
> Catatan: belum ada status "sudah dibaca" per-pengumuman di sini (itu ditangani lewat Notifikasi, §3). Warna tipe pengumuman: Peringatan → merah, Pengumuman → kuning, Info → biru. `severity` dari server belum dipakai di tampilan. Query `since` belum dipakai.

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

> [!PARTIAL] Form "Kirim Pengumuman" sudah bisa mengirim pengumuman ke server. Setelah berhasil, muncul notifikasi sukses dan pengumuman langsung tampil di daftar; kalau gagal, pesan error dari server ditampilkan. Masih ada dua hal yang belum lengkap — lihat rincian di bawah.

**Yang masih kurang / butuh backend:**

- **Belum ada pilihan tujuan yang spesifik.** Di form, "Kirim ke" bisa dipilih Semua / Satuan / Peran, tapi aplikasi belum punya daftar satuan maupun daftar peran untuk ditawarkan ke user, jadi pengumuman untuk sekarang selalu terkirim tanpa detail satuan/peran. Perlu diputuskan: apakah server otomatis menentukan tujuan dari satuan si pengirim, atau backend menyediakan daftar satuan & peran supaya aplikasi bisa menampilkannya sebagai pilihan.
- **"Riwayat Terkirim" masih menampilkan semua pengumuman**, bukan hanya yang dikirim user yang sedang login, karena belum ada endpoint "pengumuman yang saya kirim" dan belum ada endpoint untuk menghapus pengumuman. Sementara ini tombol hapus per-pengumuman disembunyikan. Begitu kedua endpoint itu tersedia, riwayat bisa disaring per pengirim dan tombol hapus dimunculkan lagi.

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

> [!DONE] Dipakai di halaman Notifikasi (ikon lonceng), untuk **semua role** (komandan & anggota). Daftar dengan tarik-untuk-refresh + "muat lebih banyak", angka di badge lonceng diambil dari `meta.unread_total`. Data di-load saat aplikasi dibuka & tiap kali kembali aktif. Baris di-tap → ditandai sudah dibaca + membuka pop-up baca-penuh (judul + isi). Kalau item punya `action` bertipe darurat, pop-up menampilkan tombol untuk membuka detail / daftar sinyal darurat.
>
> Catatan: `action` bertipe selain darurat belum menuju ke mana-mana (mis. `announcement` — belum ada halaman detail satu pengumuman), tapi isinya tetap bisa dibaca penuh di pop-up.

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

> [!DONE] Notifikasi ditandai dibaca otomatis saat barisnya di-tap. Ada juga tombol "Tandai semua" di header halaman Notifikasi. Angka `unread_total` dari response dipakai langsung untuk memperbarui badge lonceng.

`POST /notifications/{id}/read` · `POST /notifications/read-all`

**Query:** — · **Payload:** —

**Response `200`**: `{ "success": true, "data": { "unread_total": 3 } }`

---

## 4. Sinyal Darurat / Emergency

### 4.1 List

> [!DONE] Dipakai di halaman Sinyal Darurat: daftar dengan tarik-untuk-refresh + "muat lebih banyak", plus filter status (Aktif / Ditangani / Selesai) yang dikirim sebagai query `status`. Tiap baris membuka halaman detail. Warna badge: Aktif → merah, Ditangani → kuning, Selesai → hijau.
>
> Catatan: `meta.filters` dari response belum dipakai (filter diatur di aplikasi). Belum ada fitur pencarian.

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

> [!DONE] Ada halaman detail sinyal darurat: identitas personel + status, waktu/lokasi/akurasi/keterangan, siapa yang menangani, tombol "Buka di Google Maps", dan **Kronologi** dari `timeline[]`. Tarik-untuk-refresh.
>
> Catatan: `handled_by` bisa berupa object `{ id, name }` atau teks biasa — aplikasi menangani keduanya. Kalau `timeline` kosong, bagian Kronologi disembunyikan.

`GET /panic-buttons/{id}`

**Query:** — · **Payload:** —

**Response `200`** — satu item list (bentuk = 4.1) + `timeline[]` (`{ event, actor, at }`).

### 4.3 Update Status

> [!BUG] Di halaman detail, **khusus komandan**, ada tombol "Tandai Ditangani" (Aktif → Ditangani) dan "Tandai Selesai" (→ Selesai, dengan kolom catatan opsional). Sisi aplikasi sudah jalan: request terkirim, pop-up berhasil muncul. Tapi **status di data tidak benar-benar berubah** — setelah di-refresh, sinyal darurat masih berstatus sama seperti sebelumnya. Perlu dicek di backend apakah `PATCH /panic-buttons/{id}` benar-benar menyimpan perubahan status (dan catatannya).
>
> Catatan lain:
> - Pembatasan "khusus komandan" ini hanya di sisi aplikasi — server tetap harus menolak permintaan ini dari user non-komandan.
> - Setelah update, aplikasi mengambil ulang detail lengkap lewat `GET /panic-buttons/{id}` (tidak memakai response PATCH langsung), karena response PATCH sempat tidak mengembalikan data lengkap (mis. tanpa `personnel`) yang bikin halaman error. Idealnya response PATCH mengembalikan object detail yang sama persis dengan endpoint detail.

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

---

## 6. Kekuatan Apel

> [!DONE] Fitur roll-call/apel. Entry point: quick action "Kekuatan Apel" di Home Komandan — **hanya
> tampil untuk user dengan role `instruktur_apel`** (backend juga menegakkan izinnya) → daftar sesi.
> Semua endpoint di bawah sudah diintegrasikan (`services/api/rollCall.service.ts`,
> `types/rollCall.types.ts`, 6 layar `RollCall*`) & diuji di device (input Hadir & Tidak Hadir + Tutup
> Sesi jalan). `{session}` = id numerik sesi. Alur input: Detail → Input Absen (Hadir / Tidak Hadir) →
> **langsung** ke layar Cari Personel (Scan QR lewat ikon di header layar itu; `react-native-vision-camera`,
> minta izin kamera, kalau ditolak permanen muncul popup ke Pengaturan).
>
> **Catatan data:** pada sebagian sesi uji, `recap.present` tidak konsisten dengan panjang array `present[]`
> di response detail (mis. recap present 7 tapi `present: []`). FE menampilkan apa adanya dari masing-masing
> field — perlu backend menyamakan `recap` dengan isi array.

### 6.1 Daftar Sesi Apel

`GET /roll-calls` — paginated (Laravel paginator di dalam `data`).

**Query:** `page`, `per_page`

**Response `200`:**
```json
{ "success": true, "data": {
  "current_page": 1,
  "data": [ { "id": 1, "tenant_id": 1, "date": "2026-08-28", "time": "07:00:00",
    "name": "Apel Pagi Satuan", "status": "open", "created_by": 2, "closed_by": null,
    "closed_at": null, "created_at": "...", "updated_at": "...",
    "recap": { "total": 41, "present": 0, "absent": 2, "unmarked": 39, "percentage": 0 } } ],
  "total": 1
} }
```
FE menormalkan jadi `{ items, meta: { current_page, last_page, per_page, total } }` — `last_page`/`per_page`
dihitung sendiri kalau backend tidak mengirimnya. Sejak 2026-09-02 tiap item punya `recap` (bentuk sama
seperti 6.3) — dipakai kartu daftar untuk menampilkan "N hadir · N tidak hadir · N belum" tanpa buka detail
(FE menganggapnya opsional).

### 6.2 Buka Sesi Apel Baru

> [!BUG] Diuji di device 2026-09-02: `POST /roll-calls` mengembalikan **500 "Server Error"** untuk
> payload yang sesuai kontrak (`{date:"2026-09-03","time":"07:00","name":"Apel Pagi Satuan"}`). FE
> sudah benar & menampilkan modal error; menunggu perbaikan backend. `GET /roll-calls` sudah jalan
> (mengembalikan list kosong).

`POST /roll-calls`

**Payload:** `{ "date": "2026-08-28", "time": "13:30", "name": "Apel Siang Satuan" }` — `date` = `YYYY-MM-DD`
(wajib), `time` = `HH:MM` (wajib), `name` opsional.

**Response `200/201`** — `data`: objek sesi (bentuk = 6.1) dengan `status: "open"`.

### 6.3 Detail & Rekap Sesi

`GET /roll-calls/{session}`

**Response `200`:**
```json
{ "success": true, "data": {
  "session": { "id": 1, "tenant_id": 1, "date": "2026-08-28", "time": "07:00:00", "name": "Apel Pagi Satuan", "status": "open" },
  "recap": { "total": 120, "present": 115, "absent": 3, "unmarked": 2, "percentage": 95.8 },
  "breakdown": [ { "name": "Sakit", "count": 2 } ],
  "present": [ { "id": 10, "personnel_id": 45, "status": "present", "personnel": { "id": 45, "full_name": "Andi Pratama", "service_number": "123456" } } ],
  "absent": [ { "id": 11, "personnel_id": 46, "status": "absent", "absence_reason_id": 2, "note": "Sakit flu berat", "absence_reason": { "id": 2, "name": "Sakit" }, "personnel": { "id": 46, "full_name": "Budi Santoso", "service_number": "123457" } } ],
  "unmarked": [ { "id": 47, "full_name": "Candra Wijaya", "service_number": "123458" } ]
} }
```
`unmarked[]` = objek Personnel langsung (`id` = personnel_id), bukan objek entry.

### 6.4 Input Kehadiran Anggota

`POST /roll-calls/{session}/entries`

**Payload:**
| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `personnel_id` | integer | Ya | ID internal Personnel |
| `status` | string | Ya | `present` atau `absent` |
| `absence_reason_id` | integer | Wajib jika `absent` | id dari 6.6 |
| `note` | string | Tidak | catatan; FE mengisinya saat keterangan = "Lainnya" |

**Response `200/201`** — `data`: `{ id, roll_call_session_id, personnel_id, status, absence_reason_id, note, input_by_user_id, updated_at }`

### 6.5 Tutup Sesi Apel

`POST /roll-calls/{session}/close` — mengunci sesi.

**Response `200/201`** — `data`: `{ id, status: "closed", closed_by, closed_at }`

### 6.6 Daftar Keterangan Absen

`GET /roll-calls/absence-reasons`

**Response `200`** — `data[]`: `{ id, name, description, sort_order }`. FE menampilkan tiap `name` sebagai chip;
`name` yang mengandung "lain" (mis. "Lainnya") memunculkan kolom teks bebas → dikirim sebagai `note`.

### 6.7 Smart Search Personnel

`GET /roll-calls/personnel/search?q={keyword}` — cari anggota aktif dalam satuan (nama/NRP), real-time.

**Response `200`** — `data[]`: `{ id, full_name, service_number }`. FE memakai `id` sebagai `personnel_id`
saat input kehadiran / setelah scan QR (cocokkan `service_number` dengan payload QR).
