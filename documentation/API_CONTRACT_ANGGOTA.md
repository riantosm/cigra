# API Contract — Home Anggota

**Pengecekan frontend terakhir: 1 September 2026, 17.03 WIB**

Kontrak API untuk layar **Home Anggota** (`src/screens/Home/MemberHome`). Envelope, pagination,
format waktu, dan enum seragam dengan `API_CONTRACT.md`. Semua endpoint di bawah berskup **user
yang login** (dari `Authorization: Bearer <token>`) — tidak perlu parameter NRP di path.

Legenda badge: **Sudah diintegrasikan** · **Ada catatan** · **Error backend** · **Belum ada endpoint**.

---

## 0. Yang sudah nyata (tidak perlu endpoint baru)

| Bagian layar | Sumber data sekarang |
|---|---|
| Header + Kartu Anggota (identitas) | `GET /auth/me` → `user.personnel` |
| Tile "Lokasi Terakhir" & "Update Terakhir" | `GET /locations/me` |
| Shortcut "Peta Personel" | `GET /locations/overview` |
| "Aktivitas Terbaru → Lihat Semua" | layar `MyMovements` → `GET /me/movements` (paginasi) |
| "Pengumuman Terbaru" + "Lihat Semua" | `GET /announcements` (lihat `API_CONTRACT.md` §2.3) — bukan endpoint khusus anggota |

---

## 1. Kartu Anggota — status verifikasi identitas

> [!DONE] Terintegrasi di `MemberHome` (`getMyIdCardApi`). `verification_status === 'verified'` → badge "Terverifikasi"; `qr_payload` → nilai QR (fallback ke NRP).

`GET /me/id-card`

**Query:** — · **Payload:** —

**Response `200`** — `data`: `{ service_number, verification_status, verified_at, qr_payload, qr_expires_at }`

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
- `qr_payload`: string yang di-encode ke QR, default = NRP.
- `qr_expires_at`: `null` = tidak kedaluwarsa.

## 2. Status Saya

> [!DONE] Terintegrasi (`getMyStatusApi`) — mengisi 3 tile pertama + label lokasi. Tile jatuh ke "Belum Ada Data" kalau request gagal.

`GET /me/status`

**Query:** — · **Payload:** —

**Response `200`** — `data`: `as_of`, `presence{key, label, since}`,
`duty{key, label, period_label, starts_at, ends_at}`, `location{label, accuracy_label, status, captured_at}`.

```json
{
  "success": true,
  "data": {
    "as_of": "2026-08-30T09:41:00+07:00",
    "presence": { "key": "at_base", "label": "Di Markas", "since": "2026-08-30T08:14:00+07:00" },
    "duty": {
      "key": "internal_duty", "label": "Dinas Dalam", "period_label": "Hari ini",
      "starts_at": "2026-08-30T07:00:00+07:00", "ends_at": "2026-08-30T19:00:00+07:00"
    },
    "location": {
      "label": "Markas", "accuracy_label": "Akurasi tinggi",
      "status": "fresh", "captured_at": "2026-08-30T09:39:00+07:00"
    }
  }
}
```

- `presence.key`: `at_base` | `off_base` | `on_leave` | `absent`.
- `duty.key`: `internal_duty` | `field_duty` | `guard` | `standby` | `off` | dst — label dari `duty.label`.
- `location.label`: hasil reverse-geocode / nama pos di backend (client tidak reverse-geocode).
- `location.accuracy_label`: string siap tampil; kalau kosong client turunkan dari `accuracy` `GET /locations/me`.

## 3. Aset Saya

> [!BUG] `GET /me/assets` mengembalikan `500 "Server Error"`. FE sudah wired (`getMyAssetsApi`, di-guard `Promise.allSettled`) — kartu Senjata/Kendaraan tetap di placeholder sampai backend diperbaiki.

`GET /me/assets`

**Query:** — · **Payload:** —

**Response `200`** — `data`: `{ weapons: [...], vehicles: [...] }`

```json
{
  "success": true,
  "data": {
    "weapons": [
      { "id": 21, "weapon_number": "SB-0231", "serial_number": "PINDAD-21B0231",
        "category": "SS2-V1", "condition_status": "good", "condition_label": "Baik",
        "assigned_at": "2025-01-10T00:00:00+07:00" }
    ],
    "vehicles": [
      { "id": 8, "brand_model": "Toyota Hilux Double Cabin", "plate_number": "D 1234 AB",
        "stnk_valid_until": "2026-11-12", "stnk_status": "active", "stnk_status_label": "STNK Aktif" }
    ]
  }
}
```

- Array kosong → client menampilkan empty-state ("Belum ada senjata dinas" / "Belum ada kendaraan").
- `condition_status` / `stnk_status`: enum mentah; `*_label` opsional (client punya fallback `titleCase()`).
- `stnk_status`: `active` | `expiring_soon` | `expired`.

## 4. Aktivitas Terbaru (pergerakan saya)

> [!DONE] `MemberHome` "Aktivitas Terbaru" menampilkan 3 teratas (`getMyMovementsApi({ per_page: 3 })`). "Lihat Semua" → layar **`MyMovements`** (route `myMovements`) — `getMyMovementsApi({ page, per_page: 20 })` full list, pull-to-refresh + "muat lebih banyak" (pakai `meta.current_page`/`last_page`; kalau `meta` absen, lanjut selama halaman terakhir mengembalikan 20 item penuh). Baris pakai `TimelineRow` (arah in/out, `note`/label arah sebagai judul, `location_label · purpose` detail, waktu relatif `occurred_at`).

`GET /me/movements`

**Query (opsional):** `page`, `per_page` (default 10). · **Payload:** —

**Response `200`** — array + `meta` (mungkin absen). Item: `{ id, direction, occurred_at, location_label, purpose, note }`.

```json
{
  "success": true,
  "data": [
    { "id": 5501, "direction": "in", "occurred_at": "2026-08-30T08:14:00+07:00",
      "location_label": "Pos Utama", "purpose": null, "note": "Masuk Markas" },
    { "id": 5498, "direction": "out", "occurred_at": "2026-08-30T07:05:00+07:00",
      "location_label": null, "purpose": "Dinas", "note": "Keluar Markas" }
  ],
  "meta": { "current_page": 1, "last_page": 6, "per_page": 10, "total": 58 }
}
```

- `direction`: `in` (masuk markas) | `out` (keluar markas).
- Client: `note` sebagai judul, `location_label` / `purpose` sebagai detail, `occurred_at` diformat relatif.

## 5. Shortcut "Kontak Darurat" (Akses Cepat)

> [!DONE] Terintegrasi — layar `EmergencyContacts` (`getEmergencyContactsApi`), daftar tombol tap-to-call (`tel:`), dikelompokkan per `category`.

`GET /emergency-contacts`

**Query:** — · **Payload:** —

**Response `200`** — `data[]`: `{ id, label, phone, category }`. `category`: `command` | `medical` |
`security` | `general` (nilai lain → grup "Lainnya").

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
