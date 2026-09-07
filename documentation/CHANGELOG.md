# Changelog — SmartBattalion

Semua perubahan penting pada aplikasi dicatat di sini.

Format tiap rilis memakai tiga kategori (gaya changelog Claude):

- **Baru** — fitur / layar / kemampuan yang sebelumnya tidak ada.
- **Ditingkatkan** — sesuatu yang sudah ada, dibuat lebih baik (tampilan, performa, alur).
- **Perbaikan** — bug yang diperbaiki.

Kategori yang tidak punya isi pada suatu rilis boleh dihilangkan. Rilis terbaru di atas.
Isi tiap rilis disusun dari riwayat commit (`git log`) pada rentang `versionCode` terkait.

Berkas ini dirender jadi `documentation/changelog.html` (jalankan
`python3 documentation/regen-html.py` setelah mengedit) — di halaman itu tiap rilis
punya tombol **Salin** untuk menyalin catatan rilisnya sebagai teks siap-tempel.

**Batas panjang:** teks yang tersalin oleh tombol **Salin** tiap rilis harus **< 1500
karakter** (termasuk baris-baru & tanda titik). `regen-html.py` menolak build kalau ada
rilis yang lewat — ringkas dulu bulletnya. Yang dihitung = judul rilis + nama kategori +
bullet dengan penanda markdown dibuang & baris sambungan digabung jadi satu spasi.

APK release setiap build otomatis disalin ke `documentation/`
(`SmartBattalion-v<versionName>(<versionCode>)-release.apk`) tapi file `.apk`-nya
tidak ikut di-commit (`documentation/*.apk` di `.gitignore`) dan tidak ikut
ter-deploy (`.vercelignore`). Yang di-commit hanya berkas `.md`/`.html`.

---

## Belum dirilis

### Baru

- Fitur **Patroli** (quick action komandan): daftar rute patroli + checkpoint, sesi patroli
  berjalan dengan progres checkpoint, mulai & selesaikan patroli. Alur scan QR checkpoint +
  foto bukti (selfie) sudah tersedia layarnya — pengiriman ke server menunggu endpoint backend.

## v0.5.0 (versionCode 5)

_4 September 2026_

### Baru

- Academy kini jadi bagian tersendiri dengan lima sub-menu: Beranda, Akademik, Psikologi, Jasmani,
  Riwayat.
- Academy › Akademik: alur latihan TKD lengkap (data contoh) — kerjakan soal TWK/TIU/TKP dengan
  timer & tanda ragu, Navigasi Soal, lalu Hasil Tryout dan Pembahasan. Psikologi, Jasmani, dan
  Riwayat sudah punya halamannya; bank soal & kalkulatornya menyusul.
- Buku Saku kini terhubung ke server sebagai E-Book: daftar Bab & halamannya, isi materi (teks &
  gambar) tampil langsung.
- Anggota: daftar "Keluarga (Persit)" di Home & Profil, bisa dibuka ke halaman detail.
- Komandan: kode alarm stelling di "Alarm Satuan" kini bisa diketuk untuk mengaktifkan &
  menyiarkannya (dengan konfirmasi).

### Ditingkatkan

- Setelah login, sinkronisasi akun & izin lokasi pindah ke layar "Memeriksa aplikasi…", jadi tidak
  ada lagi jeda diam di tombol "Masuk".
- QR Kartu Anggota kini dari layanan generator sehingga logo satuan bisa tampil di tengah kode.
- "Alarm Satuan": indikator warna pada daftar kode alarm kini seragam merah.
- Menu "Laporan Cepat" (belum berfungsi) dihapus dari Akses Cepat Komandan.

### Perbaikan

- Field kosong dari server (dikirim sebagai "-") tidak lagi bocor ke tampilan (pemisah "·"
  menggantung, "- · data", tanggal lahir "-, ...").

---

## v0.4.0 (versionCode 4)

_2 September 2026_

### Baru

- **Kekuatan Apel** (komandan, khusus peran `instruktur_apel`): buat sesi apel, input absen manual maupun lewat pemindaian QR anggota, dan rekap kehadiran lengkap dengan keterangan absen.
- Bottom sheet detail **"Aset Saya"** di Home anggota — ketuk kartu aset untuk melihat rinciannya.

### Ditingkatkan

- Viewer kontrak API dirombak: dipisah per peran (Umum / Komandan / Anggota / Petugas Kesehatan), tabel parameter query & payload, serta contoh response JSON di tiap endpoint.
- Bentuk data kendaraan pada `/me/assets` dirapikan.

---

## v0.3.0 (versionCode 3)

_1 September 2026_

### Baru

- **Cek versi aplikasi** (`GET /app-version`): saat dibuka, aplikasi membandingkan `versionCode` / `versionName` yang terpasang dengan rilis terbaru dari backend.
- **Update wajib** — dialog tidak bisa ditutup, tombolnya membuka tautan unduh / halaman store; muncul bila build terpasang lebih lama dari `min_supported_version` atau `latest_build`.
- **Update disarankan** — bisa ditunda lewat "Nanti"; versi yang di-skip diingat sampai ada rilis lebih baru.
- Pengecekan diulang otomatis setiap aplikasi kembali aktif; kegagalan request diabaikan diam-diam (tidak pernah memblokir pengguna karena cek gagal).

### Ditingkatkan

- Gradient tombol darurat (CTA danger) diperdalam.

---

## v0.2.0 (versionCode 2)

_30 Agustus – 1 September 2026_

### Baru

- **Modul Kesehatan** + peran **Petugas Kesehatan**: Home khusus, dashboard, pencarian anggota, input & riwayat pemeriksaan. Anggota juga bisa melihat riwayat kesehatannya sendiri.
- **Layanan mandiri anggota** di Home: kartu anggota, status kehadiran/dinas/lokasi, daftar aset, aktivitas terbaru, dan kontak darurat.
- Dashboard komandan, "Aktivitas Terbaru", **Pengumuman**, dan pusat **Notifikasi** kini terhubung ke API (sebelumnya data contoh).
- Viewer kontrak API yang bisa dideploy (`documentation/`).

### Ditingkatkan

- Design system baru **"canvas"** diterapkan menyeluruh — latar near-white, kartu putih, tombol pil bergradasi.
- Performa render daftar dan layar detail katalog.

### Perbaikan

- Gap kosong pada tab detail katalog saat berpindah dari tab yang sudah di-scroll.

---

## v0.1.0 (versionCode 1)

_27 – 30 Agustus 2026_

### Baru

- Rilis awal: login dengan password, navigasi tab bawah, dan design system dasar.
- **Login OTP**, alur lupa password & ganti password, serta layar Pengaturan.
- **Tombol panik** (panic button), pelacakan lokasi latar belakang, dan tampilan posisi di profil.
- **Push notification** (FCM) untuk sinyal darurat.
- **Direktori katalog**: personel, Persit, kendaraan, dan senjata.
- **Peta personel real-time** dan dashboard komandan.
- **Kartu anggota** dan layar detail katalog dengan tab (Informasi / Riwayat / Lokasi).

### Ditingkatkan

- Redesign layar profil & splash, serta perbaikan akurasi GPS.
- Refresh access token otomatis saat request kena `401`.
- Data personel / Persit / kendaraan / senjata mengikuti bentuk response backend terbaru (`last_status_location`, `visitor_log_history`, `weapon_loan_history`, `holder_info`).

### Perbaikan

- Foto (secure image) gagal tampil.
- Data tidak ter-fetch setelah login.
- Gap pada bottom tab bar; timing spinner pull-to-refresh di Home.
