# Panduan Format — Dokumentasi API Contract

Dokumentasi ini cuma **2 berkas markdown**:

1. **`STYLE_GUIDE.md`** (berkas ini) — aturan sistem / format penulisan.
2. **`API_CONTRACT.md`** — daftar API + status integrasinya.

Baca berkas ini sebelum menambah / mengubah section di `API_CONTRACT.md` supaya
konsisten & ter-render benar oleh viewer (`_viewer.template.html` → `index.html`).

> `STYLE_GUIDE.md` **tidak** ikut di-render ke `index.html` dan tidak ikut di-deploy
> (ada di `.vercelignore` bersama `_viewer.template.html` / `regen-html.py`). Yang
> di-deploy hanya `index.html` (render dari `API_CONTRACT.md`).

---

## 1. Berkas & alur render

| Berkas | Peran | Di-deploy? |
|---|---|---|
| `API_CONTRACT.md` | **Sumber kebenaran** — semua endpoint & status, satu berkas | tidak (di-inline) |
| `STYLE_GUIDE.md` | Aturan format berkas di atas (author-only) | tidak |
| `_viewer.template.html` | Shell viewer + CSS + renderer markdown mini | tidak |
| `regen-html.py` | Inject `API_CONTRACT.md` + logo ke template → tulis `index.html` | tidak |
| `LogoIcon.png` | Logo **berwarna** (header + ikon judul) — di-inline base64 | tidak |
| `LogoIcon-gray.png` | Logo **grayscale** (favicon `<head>` + apple-touch) — di-inline base64 | tidak |
| `index.html` | Output ter-commit & yang di-deploy Vercel (root `documentation/`) | **ya** |
| `vercel.json` / `.vercelignore` | Konfigurasi deploy (semua "tidak" di atas ada di `.vercelignore`) | ya |

`API_CONTRACT.md` dibagi jadi **4 bagian per peran** dengan heading `#`: `# Umum`,
`# Komandan`, `# Anggota`, `# Petugas Kesehatan` — tiap `#` jadi satu grup akordeon di
Daftar Isi viewer. Heading `#` pertama (`# API Contract — Smart Battalion Apps`) diabaikan
viewer (intro halaman statis di template).

Setiap habis mengedit `.md` **atau** tanggal pengecekan:

```bash
python3 documentation/regen-html.py
```

- Tanggal "Pengecekan terakhir" (tampil di **header kanan-atas** viewer) = konstanta `CHECKED`
  di `regen-html.py` — bump tiap kali sweep status. Baris `**Pengecekan terakhir: ...**` di
  header `API_CONTRACT.md` disamakan dengan nilai itu.
- Kalau logo diganti, timpa `LogoIcon.png` lalu `python3 - <<'…'` bikin ulang `LogoIcon-gray.png`
  (grayscale, alpha dipertahankan) — lihat riwayat `regen-html.py` untuk snippet PIL-nya.
- `index.html` wajib ikut di-commit (itu artifact rilis, bukan hasil build CI).

---

## 2. Istilah & struktur heading

### 2a. Cara menyebut tiap tingkatan

Pakai istilah ini konsisten di chat, commit, dan komunikasi ke tim backend:

| Di berkas | Sebutan | Nomor tampil di viewer | Di viewer |
|---|---|---|---|
| `#` pertama | **judul dokumen** | — | intro (tidak jadi grup) |
| `#` berikutnya | **bagian** | `1.` `2.` `3.` … (urutan bagian) | grup akordeon + `<h1>` "N. Judul" |
| `##` | **poin** | `<bagian>.<lokal>` mis. `2.4` | baris TOC level-2 |
| `###` | **sub-poin** | `<bagian>.<lokal>` mis. `2.4.3` | baris TOC level-3 + kartu putih |
| `> [!KIND] …` | **badge status** | pill di kanan baris | callout di isi |

**Penomoran ditulis LOKAL di markdown, viewer yang menambah nomor bagian di depan.** Contoh:
`## 4. Sinyal Darurat` di bagian ke-2 → tampil **`2.4 Sinyal Darurat`**; `### 4.3 Update Status`
→ tampil **`2.4.3 Update Status`**. Jadi di markdown tetap tulis `## 4.` / `### 4.3` (jangan
`## 2.4`).

Menyebut sesuatu: *"badge di sub-poin 2.4.3"*, *"poin 2.3 payung"*, *"tambah sub-poin di poin
Autentikasi"*. Sebuah **poin** yang punya **sub-poin** disebut **poin payung** (lihat §2c) —
baris TOC-nya kosong (tanpa badge).

### 2b. Level heading

| Level | Dipakai untuk | Contoh |
|---|---|---|
| `#` (pertama) | Judul + intro halaman | `# API Contract — Smart Battalion` |
| `#` (berikutnya) | **Bagian** (peran) | `# Komandan` |
| `##` | **Poin** bernomor lokal | `## 8. Kekuatan Apel` |
| `###` | **Sub-poin** bernomor lokal `N.M` | `### 8.3 Detail & Rekap Sesi` |

Penomoran `##` (poin) **di-reset per bagian** (Umum `1..8`, Komandan `1..9`, Anggota `1..6`,
Petugas Kesehatan `1..9`) — slug TOC tetap unik karena diprefix nama bagian. Viewer menambahkan
nomor bagian di depan saat menampilkan (lihat §2a).

- Penomoran poin/sub-poin selalu eksplisit dan urut (`## 1.`, `## 2.` … / `### 2.1`, `### 2.2` …).
- Jangan lewat `####` atau lebih dalam — kalau butuh sub-bagian di dalam sub-poin, pakai
  **bold lead-in** di paragraf/list (`**Yang masih kurang / butuh backend:**`).
- `---` memisahkan tiap **bagian** (`#`). Antar-poin di dalam satu bagian tidak perlu `---`.

### 2c. Poin mandiri vs poin payung

- **Poin mandiri** (`##` tanpa `###`, mis. `## 2. Cek Versi Aplikasi` di bagian Umum):
  berdiri sendiri — isinya langsung callout + endpoint + response.
- **Poin payung** (`##` dengan `###` di bawahnya, mis. `## 1. Autentikasi`,
  `## 8. Kekuatan Apel`): **hanya baris judul** — **tidak boleh ada isi apa pun** di
  antara `## N. Judul` dan `### N.1` (tanpa paragraf pengantar, tanpa callout, tanpa
  tabel). Viewer tidak membungkusnya dalam kartu putih & tidak memberi badge status.
  Konteks fitur (entry point, role gating, dsb.) taruh di callout **sub-poin pertama**.

---

## 3. Badge status (callout)

Empat jenis, ditulis sebagai blockquote GitHub-style di **baris pertama setelah heading**:

| Sintaks | Label viewer | Arti |
|---|---|---|
| `> [!DONE] …` | **Sudah diintegrasikan** (hijau) | FE selesai & terverifikasi |
| `> [!PARTIAL] …` | **Ada catatan** (kuning) | Jalan, tapi perlu penyesuaian / ada bagian belum lengkap |
| `> [!BUG] …` | **Error backend** (merah) | Alur terblokir bug server |
| `> [!TODO] …` | **Belum ada endpoint** (abu) | Layar masih dummy |

Callout multi-paragraf: lanjutkan tiap baris dengan `>` (baris `>` kosong = pemisah paragraf).

### Aturan penempatan — **ini yang wajib**

> **Badge status diletakkan di heading TERDALAM yang punya isi.**

1. **Poin mandiri** (`##` tanpa `###`) → callout menempel di poin itu.
2. **Poin payung** (`##` dengan `###`) → callout menempel di **setiap sub-poin (`###`)**.
   Poin payung **tidak diberi badge status sama sekali** — baris poin di TOC dibiarkan
   kosong, statusnya dibaca dari sub-poin. Rollup agregat **hanya** ada di header **bagian**
   (`# Umum` / `# Komandan` / …): satu pill **per status non-Selesai + jumlahnya** (mis.
   `2 Error`, `1 Belum`), urutan **Error → Belum → Catatan**. Kalau semua sub-poin Selesai →
   satu pill `Selesai` tanpa angka.
3. Satu callout per heading. Kalau satu fitur punya beberapa status (mis. `POST` error
   tapi `GET` jalan), pecah jadi sub-poin terpisah.

Contoh benar (poin payung dengan sub-poin):

```markdown
## 8. Kekuatan Apel

Fitur roll-call/apel. Entry point: quick action "Kekuatan Apel" di Home Komandan —
hanya untuk role `instruktur_apel`.

### 8.1 Daftar Sesi Apel

> [!DONE] Dipakai di layar RollCallList …

### 8.2 Buka Sesi Apel Baru

> [!BUG] `POST /roll-calls` mengembalikan 500 …
```

Contoh **salah** (badge di poin payung, bukan di sub-poin):

```markdown
## 8. Kekuatan Apel

> [!DONE] Semua endpoint di bawah sudah diintegrasikan …   ← JANGAN

### 8.1 Daftar Sesi Apel
…
```

---

## 4. Urutan isi tiap endpoint (sub-poin, atau poin mandiri)

Selalu dengan urutan & label ini:

1. **Callout status** — `> [!KIND] …` (lihat §3).
2. **Chip endpoint** — di paragraf tersendiri, endpoint di dalam backtick:
   `` `GET /dashboard/situation` ``. Viewer merender jadi chip berwarna per verb
   (GET biru, POST hijau, PATCH kuning, PUT oranye, DELETE merah); klik = salin.
   Beberapa endpoint sekaligus dipisah ` · ` (`` `POST /notifications/{id}/read` · `POST /notifications/read-all` ``).
   Path param pakai `{brace}` (`{id}`, `{session}`, `{personnel}` = NRP).
3. **Query & Payload** — **tabel parameter**, kolom persis:
   `| Parameter | Tipe | Wajib | Keterangan |` (tipe: `string` / `integer` / `number` / `boolean` /
   `object` / `array` / `file`; Wajib: `Wajib` / `Opsional` / `Wajib jika …`; Keterangan boleh berisi
   contoh nilai, default, enum, batas panjang).
   - Kalau ada **query params**, didahului lead-in `**Query:**` lalu tabelnya.
   - Kalau ada **body**, didahului lead-in `**Payload (body):**` lalu tabelnya (+ contoh JSON body di
     ` ```json ` bila objek kompleks / bersarang).
   - Kalau endpoint **tidak punya** query & body → satu baris `**Tanpa parameter.**` (tanpa tabel).
   - Path param (`{id}`, `{session}`, `{personnel}`) dijelaskan di baris chip endpoint, **bukan** di tabel ini.
4. **Response** — lead-in `**Response \`<kode>\`:**` **berdiri sendiri** (tidak boleh ada teks lain
   setelah `:**` — tidak ada "`data` = objek …" dsb.), lalu langsung fenced block ` ```json `.
   Bentuk persis (fence `~~~` di bawah cuma pembungkus contoh):

   ~~~markdown
   **Response `200`:**
   ```json
   {
     "success": true,
     "data": { "id": 2, "name": "Contoh" }
   }
   ```

   Catatan: `data.foo` bisa `null` … (kalau perlu — SETELAH blok JSON, bukan di baris lead-in).
   ~~~

   Aturan isi JSON:
   - **Satu properti per baris** (pretty-print `indent 2`). Jangan `"id": 2, "name": "x"` dalam satu baris.
   - Selalu envelope lengkap `{ "success": true, "data": … }` (+ `"meta": {…}` untuk list berpaginasi,
     `"message"` kalau endpoint memang mengembalikannya).
   - Tampilkan **1 contoh item** untuk array (`"data": [ { … } ]`), field lengkap dengan nilai contoh
     yang realistis.
   - Penjelasan bentuk / catatan field → baris **`Catatan: …`** SETELAH blok JSON, bukan di lead-in.
   - Kalau ada beberapa endpoint di satu sub-poin (mis. list + detail), beri **satu blok JSON per
     bentuk**, masing-masing didahului lead-in-nya (`**Response list `200`:**` / `**Response detail `200`:**`).
   - Untuk objek besar berulang (mis. `HealthRecordSummary`, "bentuk = 4.1"), tetap tulis JSON penuh
     minimal sekali; referensi "bentuk = X" hanya boleh dipakai **setelah** bentuk itu ditulis penuh
     di tempat lain.
   - Boleh menambah **tabel `| Field | Tipe | Keterangan |`** di bawah JSON kalau perlu penjelasan
     per-field — tapi tabel **tidak menggantikan** JSON.
   - **Pengecualian:** endpoint yang mengembalikan **berkas biner** (image / PDF / APK) ditulis
     `**Response:** berkas biner (image/jpeg …)` tanpa JSON. Endpoint tanpa REST (mis. FCM topic) tidak
     punya baris Response.
5. **Catatan tambahan** (opsional) — perilaku klien, normalisasi, fallback. Awali
   kalimat yang menjelaskan sisi aplikasi dengan **"FE …"**
   (`FE menormalkan jadi { items, meta }`). Kalau panjang, pakai bullet list.

Barisan `**Query:**` / `**Payload (body):**` / `**Response `<kode>`:**` adalah **bold lead-in
biasa** (bukan heading) supaya tidak muncul di TOC.

---

## 5. Gaya penulisan

- **Bahasa Indonesia.** Istilah `FE` (aplikasi / frontend) & `BE` / backend.
- **Enum & nama field** selalu dalam backtick, `snake_case` mentah dari server:
  `at_base`, `acknowledged`, `instruktur_apel`.
- **Waktu** ISO-8601 dengan offset: `2026-08-30T15:07:00+07:00`.
- **Envelope seragam**: `{ "success": true, "data": … }`. List berpaginasi menambah
  `"meta": { "current_page", "last_page", "per_page", "total" }` (+ `unread_total` dsb.
  bila perlu). Query paginasi: `?page=&per_page=`.
- **Pilihan nilai (enum)**: di **prosa** boleh `` `a` | `b` | `c` `` (pipe dikelilingi spasi);
  **di dalam sel tabel WAJIB pakai `/`** (`` `a` / `b` ``) — pipe mentah memecah kolom tabel.
- Jangan menaruh literal `</script` di mana pun (regen-html.py menolaknya).
- Tabel: header `Title Case` konsisten dengan tabel lain; kolom pertama = nama field/hal
  (viewer menebalkannya). Tabel/JSON/diagram lebar akan scroll di dalam kotaknya (viewer
  memberi `max-height` + scroll pada blok JSON).

---

## 6. Kerangka siap-tempel

Blok luar pakai fence `~~~` supaya fence ```` ``` ```` di dalamnya tetap utuh saat disalin.

### Endpoint GET (list)

~~~markdown
### 7.1 Judul Endpoint

> [!TODO] Ringkasan status dari sisi FE — di mana dipakai, apa yang jalan / belum.

`GET /contoh/endpoint`

**Query:**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `page` | integer | Opsional | default 1 |
| `per_page` | integer | Opsional | default 20 |
| `status` | string | Opsional | `active` / `resolved` |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "status": "active", "label": "Contoh", "created_at": "2026-09-02T10:00:00+07:00" }
  ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 20, "total": 1 }
}
```

Catatan: FE ... (perilaku klien, fallback, normalisasi).
~~~

### Endpoint POST (dengan payload)

~~~markdown
`POST /contoh/endpoint`

**Payload (body):**

| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `title` | string | Wajib | ≤ 80 karakter |
| `target` | object | Wajib | `{ scope, unit_ids, role }` — lihat contoh |

```json
{ "title": "Contoh", "target": { "scope": "all", "unit_ids": [], "role": null } }
```

**Response `201`:**
```json
{ "success": true, "message": "Berhasil.", "data": { "id": 9, "title": "Contoh", "created_by": { "id": 1, "name": "Andi" }, "created_at": "2026-09-02T10:00:00+07:00" } }
```
~~~

---

## 7. Checklist sebelum commit

- [ ] Poin payung (punya sub-poin) = **judul saja** — tanpa isi apa pun; badge status di sub-poin.
- [ ] Tiap sub-poin / poin mandiri punya: callout → chip endpoint → **tabel Query/Payload**
      (`| Parameter | Tipe | Wajib | Keterangan |`, atau `**Tanpa parameter.**`) → **Response `<kode>`:** +
      **contoh JSON di ` ```json `** (bukan prosa).
- [ ] Enum & field dalam backtick, waktu ISO-8601 + offset, envelope `{ success, data }`.
- [ ] Endpoint ada di **bagian peran** yang benar (Umum / Komandan / Anggota / Petugas Kesehatan).
- [ ] Penomoran poin/sub-poin urut & sesuai posisi; tiap bagian punya deret poin sendiri.
- [ ] Response: lead-in `**Response `<kode>`:**` **bersih** (tanpa teks setelahnya) → blok JSON
      envelope penuh, **1 properti per baris**; catatan field di baris `Catatan:` setelah blok.
- [ ] Enum di dalam sel tabel pakai `/` (bukan `|`).
- [ ] Header `**Pengecekan terakhir: …**` = `CHECKED` di `regen-html.py`.
- [ ] `python3 documentation/regen-html.py` dijalankan, `index.html` ikut di-commit.
- [ ] CLAUDE.md (bagian `documentation/`) di-update bila ada perubahan konvensi.

---

## 8. Fitur viewer (mekanik `_viewer.template.html`)

Tidak perlu ditulis di `API_CONTRACT.md` — otomatis dari renderer. Jangan hapus tanpa alasan:

- **Judul & ikon:** header kiri-atas = logo berwarna + "API Contract / SMART BATTALION APPS";
  `<h1>` intro = logo berwarna + "API Contract — Smart Battalion Apps"; favicon = logo grayscale.
- **Header kanan-atas:** pill "Draf" + "Pengecekan terakhir <tanggal>" + toggle tema.
- **Daftar Isi:** kotak **search** (cocokkan judul + nomor + **path endpoint** tiap sub-poin) +
  **chip filter status** (Semua / Selesai / Catatan / Error / Belum). Tiap `<li>` TOC membawa
  `data-search` & `data-status` — renderer yang mengisinya dari `toc[].search` / `toc[].status`.
- **Grup TOC** akordeon, default tertutup, rapat saat tertutup; auto-buka saat search/filter aktif.
- **Blok JSON:** `max-height` + scroll internal, tombol "Salin".
- **Chip endpoint** klik = salin; **tema** gelap/terang lewat toggle (bukan ikut OS).
