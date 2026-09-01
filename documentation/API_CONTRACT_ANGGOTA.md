# API Contract — Home Anggota (Draf)

Draf kontrak API untuk layar **Home Anggota** (`src/screens/Home/MemberHome`). Semua surface di
layar ini **masih memakai data dummy** kecuali yang disebut "sudah nyata" di bawah. Bentuk envelope,
pagination (`?page=&per_page=`), waktu ISO-8601 dengan offset, dan enum `snake_case` mentah
**seragam dengan API yang sudah berjalan** (`/auth/*`, `/locations/*`, `/catalog/*`) —
sama seperti `API_CONTRACT.md`, tidak diulang di sini.

> Status: **usulan frontend**. Nama field/endpoint boleh disesuaikan tim backend selama bentuk
> envelope & pagination tetap konsisten dengan endpoint yang sudah berjalan.

Semua endpoint di bawah berskup **user yang login** (diambil dari `Authorization: Bearer <token>`),
jadi tidak perlu parameter `personnel`/`service_number` di path.

---

## 0. Yang sudah nyata (tidak perlu endpoint baru)

| Bagian layar                     | Sumber data sekarang                                   |
|----------------------------------|-------------------------------------------------------|
| Header + Kartu Anggota (identitas)| `GET /auth/me` → `user.personnel` (sudah dipakai)     |
| QR Code di Kartu Anggota         | **payload = NRP** (`personnel.service_number`) apa adanya — tidak perlu API |
| Tile "Lokasi Terakhir" & "Update Terakhir" (Status Saya) | `GET /locations/me` (sudah dipakai di Profile) |
| Shortcut "Peta Personel"         | `GET /locations/overview` (sudah ada)                 |
| Shortcut "Pengumuman" / "Lihat Semua" pengumuman | layar `Notifications` (lihat `API_CONTRACT.md` §3) |
| "Aktivitas Terbaru → Lihat Semua" & shortcut "Riwayat Pergerakan" | tab `visitor` ("Riwayat visitor") di `CatalogDetail` personel diri sendiri — diisi `visitor_log_history` dari `GET /catalog/personnel/{personnel}` |

---

## 1. Kartu Anggota — status verifikasi identitas

Mengisi badge **"Terverifikasi"** di pojok kanan atas Kartu Anggota dan (opsional) membatasi masa
berlaku QR.


```
GET /me/id-card
```

**Response `200`**
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

- `verification_status`: `verified` | `pending` | `unverified` (client fallback netral untuk nilai lain).
- `qr_payload`: string yang di-encode ke QR. **Default = NRP.** Field ini disediakan supaya backend
  bisa mengganti ke token bertanda-tangan nanti tanpa ubah client.
- `qr_expires_at`: `null` = tidak kedaluwarsa. Kalau diisi, client bisa menampilkan hitung mundur /
  auto-refresh (belum diimplementasikan).

---

## 2. Status Saya

Mengisi 4 tile di bagian **"Status Saya"**: Status Saat Ini, Tugas / Dinas, Lokasi Terakhir,
Update Terakhir. (Lokasi Terakhir + Update Terakhir sudah bisa diisi dari `GET /locations/me` —
endpoint ini melengkapi 2 tile sisanya + memberi label lokasi yang lebih manusiawi.)

```
GET /me/status
```

**Response `200`**
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

- `presence.key`: `at_base` | `off_base` | `on_leave` | `absent` (fallback netral untuk nilai lain).
- `duty.key`: `internal_duty` | `field_duty` | `guard` | `standby` | `off` | dst — dikirim mentah,
  label dari `duty.label`.
- `location.label`: hasil reverse-geocode / nama pos di sisi backend (client tidak reverse-geocode).
- `location.accuracy_label`: string siap tampil (mis. "Akurasi tinggi" / "Akurasi sedang"). Kalau
  tidak ada, client turunkan sendiri dari `accuracy` di `GET /locations/me`.

---

## 3. Aset Saya

Mengisi bagian **"Aset Saya"** (kartu Senjata Dinas + Kendaraan). Data ini sebetulnya sudah ada di
katalog (`/catalog/weapon-assignments`, `/catalog/vehicles`) tapi terfilter ke pemiliknya — endpoint
ini ringkasan "milik saya" supaya client tidak perlu menarik seluruh daftar lalu memfilter.

```
GET /me/assets
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "weapons": [
      {
        "id": 21,
        "weapon_number": "SB-0231",
        "serial_number": "PINDAD-21B0231",
        "category": "SS2-V1",
        "condition_status": "good",
        "condition_label": "Baik",
        "assigned_at": "2025-01-10T00:00:00+07:00"
      }
    ],
    "vehicles": [
      {
        "id": 8,
        "brand_model": "Toyota Hilux Double Cabin",
        "plate_number": "D 1234 AB",
        "stnk_valid_until": "2026-11-12",
        "stnk_status": "active",
        "stnk_status_label": "STNK Aktif"
      }
    ]
  }
}
```

- Array kosong → client menampilkan empty-state ("Belum ada senjata dinas" / "Belum ada kendaraan").
- `condition_status` / `stnk_status`: enum mentah; `*_label` opsional (client punya fallback
  `titleCase()`).
- `stnk_status`: `active` | `expiring_soon` | `expired`.

---

## 4. Aktivitas Terbaru (pergerakan saya)

Mengisi bagian **"Aktivitas Terbaru"** di Home (3 entri teratas) — **diflatten jadi 1 baris per
lintasan** (masuk ATAU keluar). Serupa dengan `visitor_log_history` pada `GET /catalog/personnel/{personnel}`,
tapi untuk diri sendiri dan sebagai endpoint list tersendiri.

```
GET /me/movements
```

**Query** (opsional)

| Parameter | Keterangan |
|-----------|------------|
| `page`, `per_page` | pagination — default `per_page` 10 |

**Response `200`**
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
    },
    {
      "id": 5477,
      "direction": "in",
      "occurred_at": "2026-08-29T17:42:00+07:00",
      "location_label": "Pos Utama",
      "purpose": null,
      "note": "Masuk Markas"
    }
  ],
  "meta": { "current_page": 1, "last_page": 6, "per_page": 10, "total": 58 }
}
```

- `direction`: `in` (masuk markas) | `out` (keluar markas).
- Client menampilkan `note` sebagai judul, `location_label` / `purpose` sebagai detail, dan
  `occurred_at` diformat relatif / jam.

---

## 5. Pengumuman Terbaru

Mengisi bagian **"Pengumuman Terbaru"** di Home (3 entri teratas) — **subset dari
`API_CONTRACT.md` §2.3 (`GET /announcements`)**, difilter ke pengumuman yang menyasar user login.
Tidak butuh endpoint baru; cukup panggil `GET /announcements?per_page=3`. Field yang dipakai layar:

| Field (dari §2.3) | Dipakai untuk        |
|-------------------|----------------------|
| `title`           | judul baris          |
| `body`            | detail (1 baris)     |
| `created_by.name` | label pengirim ("Pasi Ops") |
| `published_at`    | jam / tanggal relatif |
| `type`            | ikon + warna aksen (`alert` merah, `announcement` biru, `info` abu) |

Sampai `GET /announcements` tersedia, layar memakai `DUMMY_NOTICES` yang bentuknya sudah disamakan
dengan tabel di atas.

---

## 6. Shortcut "Kontak Darurat" (Akses Cepat)

Saat ini `ComingSoon`. Usulan:

```
GET /emergency-contacts
```
```json
{
  "success": true,
  "data": [
    { "id": 1, "label": "Piket Batalyon", "phone": "62211234567", "category": "command" },
    { "id": 2, "label": "Kesehatan / Poliklinik", "phone": "62211234568", "category": "medical" },
    { "id": 3, "label": "Provos", "phone": "62211234569", "category": "security" }
  ]
}
```
Client menampilkan daftar tombol tap-to-call (`tel:`), dikelompokkan per `category`.
