# SMART ACADEMY — MOBILE UI/UX DEVELOPMENT BRIEF

## 1. Tujuan

Buat UI/UX mobile untuk modul **SMART ACADEMY** di aplikasi Smart Battalion.

SMART ACADEMY pada mobile bukan tempat untuk melakukan management penuh.

Seluruh management utama tetap dilakukan melalui dashboard web, seperti:

- membuat program,
- membuat materi,
- membuat assessment,
- membuat question bank,
- mengatur scoring,
- assign participant,
- mengelola instructor,
- mengelola competency,
- dan reporting kompleks.

Mobile hanya berfungsi untuk kebutuhan:

```text
ANGGOTA
→ belajar
→ mengerjakan assessment
→ melihat hasil
→ melihat competency

INSTRUKTUR
→ melihat peserta
→ input nilai
→ verifikasi hasil

KOMANDAN
→ monitoring
→ melihat progress
→ melihat hasil satuan
```

Prinsip utama:

```text
Admin      → Manage
Anggota    → Learn & Execute
Instruktur → Assess & Verify
Komandan   → Monitor
```

---

# 2. Design Direction

Gunakan design system mobile Smart Battalion existing.

Visual harus:

- light mode,
- modern,
- clean,
- profesional,
- administratif,
- sederhana,
- tidak terlihat seperti aplikasi militer/tactical,
- tidak menggunakan visual perang,
- tidak cyberpunk,
- tidak terlalu banyak gradient,
- tidak terlalu banyak card,
- tidak terasa seperti AI-generated dashboard.

Prioritaskan:

- whitespace,
- hierarchy jelas,
- typography mudah dibaca,
- touch target nyaman,
- informasi penting langsung terlihat,
- navigation sederhana.

---

# 3. Entry Point

Pada dashboard utama Smart Battalion tambahkan quick action/menu:

```text
Smart Academy
```

Icon gunakan icon education/learning yang sederhana.

Contoh:

```text
book
graduation cap
document check
```

Jangan gunakan icon tactical/military.

---

# 4. Role-Based Experience

SMART ACADEMY hanya memiliki satu entry point.

Setelah masuk, konten menyesuaikan permission user.

Possible POV:

```text
Anggota
Instruktur
Komandan
```

User dapat memiliki lebih dari satu permission.

Jika user adalah anggota sekaligus instruktur, jangan membuat dua aplikasi terpisah.

Gunakan contextual navigation.

---

# 5. Navigation Structure

Untuk mobile jangan membuat terlalu banyak bottom navigation baru.

Gunakan navigation internal SMART ACADEMY.

Rekomendasi:

## Anggota

```text
Smart Academy
├── Home
├── Program Saya
├── Hasil
└── Kemampuan
```

## Instruktur

```text
Smart Academy
├── Home
├── Program Saya
├── Penilaian
└── Verifikasi
```

## Komandan

```text
Smart Academy
├── Overview
├── Program
└── Anggota
```

Bisa menggunakan tab atau segmented navigation.

Tidak harus menggunakan bottom navigation tambahan jika membuat UX menjadi terlalu kompleks.

---

# PART A — POV ANGGOTA

# 6. Academy Home — Anggota

Halaman pertama setelah anggota membuka SMART ACADEMY.

Tujuan:

memberikan gambaran singkat dan shortcut untuk melanjutkan aktivitas.

Layout:

```text
SMART ACADEMY

Halo, [Nama]

Program Aktif       2
Belum Dimulai       1
Selesai             4

────────────────────

Lanjutkan Belajar

[Program Card]

────────────────────

Perlu Dikerjakan

Assessment
Praktik
Materi

────────────────────

Program Saya
```

Jangan tampilkan terlalu banyak analytics.

---

# 7. Continue Learning

Section paling utama.

Jika user memiliki program yang sedang berjalan:

```text
Lanjutkan Belajar

Menembak Senapan
Progress 60%

Berikutnya:
Ujian Teori

[Lanjutkan]
```

Jika lebih dari satu, tampilkan maksimal 2–3.

Sisanya melalui:

```text
Lihat Semua
```

---

# 8. Program Saya

Halaman:

```text
Program Saya
```

Filter sederhana:

```text
Semua
Berjalan
Belum Dimulai
Selesai
```

Program card minimal menampilkan:

```text
Nama Program
Jenis Program
Progress
Deadline
Status
```

Contoh:

```text
Latihan Menembak Senapan

Training

████████░░ 80%

Deadline 20 Sep 2026

Sedang Berjalan
```

CTA:

```text
Lanjutkan
```

---

# 9. Program Detail

Ini merupakan halaman utama setiap program.

Layout:

```text
< Back

MENEMBAK SENAPAN

Training

Progress
60%

Deadline
20 Sep 2026

────────────────────

Tentang Program

...

────────────────────

Materi & Aktivitas

✓ Materi Dasar
✓ SOP Safety
✓ Video Safety

○ Ujian Teori
○ Praktik Lapangan
○ Hasil Akhir
```

Gunakan curriculum/timeline sederhana.

---

# 10. Component Status

Gunakan status:

```text
Selesai
Tersedia
Belum Tersedia
Sedang Dikerjakan
Menunggu Verifikasi
Tidak Lulus
Lulus
```

Locked component:

```text
🔒 Selesaikan Materi Dasar terlebih dahulu
```

Gunakan lock hanya jika memang ada prerequisite.

---

# 11. Material Detail

Support tipe:

```text
Text
PDF
Video
Image
Document
External Link
```

---

# 12. Text Material

Layout reading-friendly.

```text
< Back

Judul Materi

Estimasi baca optional

────────────────────

CONTENT

────────────────────

[Tandai Sudah Dipelajari]
```

---

# 13. PDF / Document

Tampilkan:

```text
Judul File

PDF • 2.4 MB

[Buka Dokumen]
```

Jika existing application memiliki document viewer, gunakan existing viewer.

Jangan membuat custom viewer jika tidak diperlukan.

---

# 14. Video Material

Layout:

```text
Video Player

Judul

Description

[Tandai Sudah Dipelajari]
```

---

# 15. External Link

Tampilkan:

```text
Judul Resource

Description

[Buka Tautan]
```

---

# 16. Assessment Intro

Sebelum mulai ujian:

```text
Ujian Teori

50 Soal

45 Menit

Percobaan
1x

Passing Grade
75

────────────────────

Pastikan koneksi internet stabil sebelum memulai.

[Mulai Assessment]
```

Jika sudah ada attempt aktif:

```text
[Lanjutkan Assessment]
```

---

# 17. Assessment Interface

Assessment harus menggunakan focused UI.

Satu layar hanya fokus terhadap satu question.

Layout:

```text
< Keluar

12 / 50

00:32:14

────────────────────

Pertanyaan

Lorem ipsum...

────────────────────

○ A. ...
○ B. ...
○ C. ...
○ D. ...

────────────────────

[Sebelumnya]    [Berikutnya]
```

---

# 18. Assessment Progress

Gunakan progress bar:

```text
████████░░
12 / 50
```

Jangan memenuhi layar dengan question navigator kecuali diperlukan.

---

# 19. Assessment Auto Save

Ketika jawaban dipilih:

```text
Menyimpan...
```

kemudian:

```text
Tersimpan
```

Status dibuat kecil/subtle.

Jangan menggunakan modal setiap save.

---

# 20. Assessment Navigation

Jika:

```text
can_go_back = true
```

tampilkan:

```text
Sebelumnya
Berikutnya
```

Jika:

```text
can_go_back = false
```

hanya tampilkan:

```text
Berikutnya
```

---

# 21. Submit Confirmation

Ketika user akan submit:

```text
Kirim Jawaban?

Dijawab
47

Belum Dijawab
3

Setelah dikirim, jawaban tidak dapat diubah.

[Batal]

[Kirim Jawaban]
```

---

# 22. Assessment Result

Jika result boleh langsung ditampilkan:

```text
Assessment Selesai

Nilai
88

LULUS

Benar
44

Salah
6

[Kembali ke Program]
```

Jika result perlu review:

```text
Assessment Selesai

Jawaban berhasil dikirim.

Hasil akan tersedia setelah proses penilaian selesai.
```

---

# 23. Psychology Assessment

UI tetap menggunakan assessment interface yang sama.

Namun jangan menampilkan:

```text
Benar
Salah
```

Contoh Likert:

```text
Pernyataan:

Saya nyaman bekerja dalam tim.

○ Sangat Tidak Sesuai
○ Tidak Sesuai
○ Netral
○ Sesuai
○ Sangat Sesuai
```

---

# 24. Psychology Result

Jika diperbolehkan ditampilkan:

```text
Hasil Assessment

Discipline
91

Teamwork
82

Adaptability
79

Accuracy
88
```

Gunakan progress indicator sederhana.

Jangan membuat diagnosis atau label psikologi yang tidak disediakan backend.

---

# 25. Tes Kecermatan

Gunakan dedicated focused interface.

Contoh:

```text
Section 3 / 10

00:37

────────────────────

QUESTION

────────────────────

[A]
[B]
[C]
[D]
```

Ketika timer section selesai:

```text
auto next
```

Jangan tampilkan tombol previous jika backend tidak mengizinkan.

---

# 26. Practical Self Entry

Jika program memperbolehkan anggota memasukkan nilai sendiri:

```text
Input Hasil Praktik

Lari 3200 Meter

Jarak
[3200] meter

Waktu
[12:31]

Catatan
[optional]

[Kirim untuk Diverifikasi]
```

Field bersifat dynamic sesuai config backend.

---

# 27. Practical Submission Confirmation

Setelah submit:

```text
Hasil Berhasil Dikirim

Status

Menunggu Verifikasi Instruktur
```

CTA:

```text
Kembali ke Program
```

---

# 28. Practical Rejected

Jika ditolak:

```text
Hasil Ditolak

Alasan:

Waktu tidak sesuai dengan pencatatan lapangan.

[Input Ulang]
```

Hanya tampilkan Input Ulang jika backend mengizinkan.

---

# 29. Hasil Saya

Halaman:

```text
Hasil Saya
```

Filter:

```text
Semua
Lulus
Tidak Lulus
```

Card:

```text
Menembak Senapan

Final Score
90

LULUS

12 Sep 2026
```

---

# 30. Result Detail

```text
Menembak Senapan

LULUS

Final Score
90

────────────────────

Ujian Teori

88

────────────────────

Practical

91

────────────────────

Tanggal Selesai

12 September 2026
```

---

# 31. Kemampuan Saya

Halaman:

```text
Kemampuan Saya
```

Card:

```text
Menembak Senapan

90

Aktif
```

Contoh lainnya:

```text
First Aid

84

Berlaku sampai
12 Feb 2027
```

---

# 32. Competency Status

Support:

```text
Aktif
Akan Kedaluwarsa
Kedaluwarsa
```

---

# 33. Competency Detail

```text
Menembak Senapan

Current Score

90

────────────────────

Riwayat

Sep 2026
90

Jun 2026
85

Jan 2026
78
```

Optional:

simple trend chart.

Jangan membuat chart kompleks.

---

# PART B — POV INSTRUKTUR

# 34. Academy Home — Instruktur

Tujuan:

memberikan shortcut terhadap pekerjaan instructor.

Layout:

```text
SMART ACADEMY

Instruktur

────────────────────

Program Saya

3 Program Aktif

────────────────────

Perlu Dikerjakan

42
Belum Dinilai

7
Menunggu Verifikasi

────────────────────

Program Terbaru
```

---

# 35. Program Saya — Instruktur

Card:

```text
Menembak Senapan

150 Peserta

Belum Dinilai
42

Menunggu Verifikasi
7

[Buka Program]
```

---

# 36. Instructor Program Detail

Layout:

```text
Menembak Senapan

150 Peserta

────────────────────

Progress Penilaian

108 / 150

────────────────────

Quick Action

[Input Nilai]

[Verifikasi]

────────────────────

Peserta
```

---

# 37. Participant List

Header:

```text
Peserta
```

Search:

```text
Cari nama / NRP
```

Filter:

```text
Semua
Belum Dinilai
Menunggu
Terverifikasi
```

Card:

```text
Pratu Ahmad

NRP 123456

Kompi A

Belum Dinilai
```

---

# 38. Participant Detail — Instructor

```text
Pratu Ahmad

NRP 123456
Kompi A

────────────────────

Status

Practical
Belum Dinilai

Theory
88

────────────────────

[Input Nilai]
```

---

# 39. Input Nilai

Form mengikuti dynamic metrics backend.

Contoh menembak:

```text
Input Nilai

Pratu Ahmad

Jumlah Tembakan
[10]

Jumlah Kena
[8]

Total Point
[82]

Catatan
[optional]

[Simpan Nilai]
```

---

# 40. Quick Scoring Workflow

Setelah save:

```text
Nilai berhasil disimpan.

Pratu Ahmad

82

[Peserta Berikutnya]

[Kembali ke Daftar]
```

`Peserta Berikutnya` penting untuk kondisi lapangan.

---

# 41. Verification Queue

Halaman:

```text
Menunggu Verifikasi
```

Card:

```text
Pratu Ahmad

Lari 3200 Meter

12:31

Dikirim
09 Sep • 08:31

[Review]
```

---

# 42. Verification Detail

```text
Pratu Ahmad

Lari 3200 Meter

────────────────────

Jarak

3200 meter

Waktu

12:31

────────────────────

Submitted At

09 Sep 2026
08:31

────────────────────

[Tolak]

[Koreksi]

[Verifikasi]
```

---

# 43. Verify Flow

Tap:

```text
Verifikasi
```

Confirmation sheet:

```text
Verifikasi hasil ini?

[Cancel]

[Ya, Verifikasi]
```

Setelah success:

```text
Terverifikasi
```

---

# 44. Reject Flow

Tap:

```text
Tolak
```

Bottom sheet:

```text
Alasan Penolakan

[Input reason]

[Batal]

[Tolak Hasil]
```

Reason wajib.

---

# 45. Correction Flow

```text
Koreksi Hasil

Waktu Lama
12:41

Waktu Baru
[12:31]

Alasan Koreksi
[Kesalahan pencatatan]

[Simpan Koreksi]
```

---

# 46. Instructor History

Optional V1.

Jika dibuat:

```text
Riwayat
```

Menampilkan:

```text
Verified
Pratu Ahmad
12:31
10:32

Corrected
Pratu Budi
11:49
10:40
```

---

# PART C — POV KOMANDAN

# 47. Academy Overview — Komandan

Mobile commander hanya untuk monitoring.

Tidak ada management CRUD.

Layout:

```text
SMART ACADEMY

Overview

Program Aktif

6

Completion

87%

Pass Rate

91%

Perlu Perhatian

34
```

Gunakan maksimal 4 metric utama.

---

# 48. Perlu Perhatian

Section:

```text
Perlu Perhatian
```

Contoh:

```text
15 anggota belum menyelesaikan program wajib

8 anggota tidak lulus assessment

11 hasil praktik belum diverifikasi

6 competency akan kedaluwarsa
```

Setiap row clickable.

---

# 49. Program Aktif — Komandan

Card:

```text
Menembak Senapan

150 Peserta

Completion
78%

Pass Rate
91%

Deadline
20 Sep
```

---

# 50. Commander Program Detail

```text
Menembak Senapan

────────────────────

Peserta

150

────────────────────

Completion

78%

────────────────────

Pass Rate

91%

────────────────────

Status Peserta

Completed
117

In Progress
22

Not Started
11

────────────────────

[Lihat Peserta]
```

---

# 51. Participant List — Commander

Search:

```text
Cari nama / NRP
```

Filter:

```text
Semua
Belum Mulai
Berjalan
Lulus
Tidak Lulus
```

Card:

```text
Pratu Ahmad

Kompi A

Progress
80%

Score
88

Lulus
```

---

# 52. Personnel Academy Detail — Commander

```text
Pratu Ahmad

NRP 123456

────────────────────

Program Aktif

Menembak Senapan
80%

────────────────────

Hasil Terakhir

Ujian Teori
88

────────────────────

Kemampuan

Menembak
90

Garjas
82
```

Jangan menampilkan seluruh personnel profile.

Hanya data academy.

---

# 53. Competency Monitoring — Commander

Mobile cukup simple.

Section:

```text
Kompetensi
```

Filter:

```text
Aktif
Akan Kedaluwarsa
Kedaluwarsa
```

Card:

```text
First Aid

6 anggota

Akan Kedaluwarsa
```

Tap:

```text
→ list anggota
```

---

# 54. Commander Restrictions

Di mobile commander jangan menyediakan:

```text
Tambah Program
Edit Program
Tambah Materi
Tambah Soal
Edit Assessment
Assign Participant
Manage Instructor
Edit Scoring
Delete Data
```

Seluruhnya tetap web management.

---

# PART D — SHARED COMPONENTS

# 55. Program Card

Gunakan reusable component.

Possible variants:

```text
Member
Instructor
Commander
```

Namun visual language tetap sama.

---

# 56. Status Badge

Gunakan reusable badge.

Program:

```text
Belum Dimulai
Berjalan
Selesai
```

Result:

```text
Lulus
Tidak Lulus
```

Verification:

```text
Menunggu
Terverifikasi
Ditolak
Dikoreksi
```

Competency:

```text
Aktif
Akan Kedaluwarsa
Kedaluwarsa
```

---

# 57. Search Component

Gunakan component existing.

Placeholder:

```text
Cari nama / NRP
```

Jangan membuat custom search baru jika Smart Battalion sudah memiliki smart search.

---

# 58. Filter

Mobile filter gunakan:

```text
horizontal chips
```

atau:

```text
bottom sheet filter
```

Jangan menggunakan sidebar.

---

# 59. Empty State

Anggota:

```text
Belum ada program yang ditugaskan.
```

Instruktur:

```text
Belum ada program yang ditugaskan kepada Anda.
```

Komandan:

```text
Belum ada program aktif.
```

---

# 60. Loading State

Gunakan skeleton.

Jangan hanya menampilkan spinner fullscreen untuk seluruh halaman.

---

# 61. Error State

Contoh:

```text
Data gagal dimuat.

[Coba Lagi]
```

Assessment error:

```text
Jawaban belum berhasil tersimpan.

[Coba Lagi]
```

Jangan membuang answer local state ketika request gagal.

---

# 62. Offline / Poor Connection

Untuk assessment:

frontend harus mempertahankan jawaban sementara.

Jika save API gagal:

```text
Belum tersinkron
```

Ketika connection kembali:

retry.

Namun backend tetap SSOT.

---

# 63. Confirmation Pattern

Gunakan bottom sheet untuk:

```text
submit assessment
verify result
reject result
```

Jangan gunakan dialog berulang untuk aktivitas biasa.

---

# 64. Notification

Mobile notification dapat mendukung:

```text
Program baru ditugaskan

Deadline mendekat

Assessment tersedia

Assessment selesai dinilai

Practical result diverifikasi

Practical result ditolak

Competency akan kedaluwarsa
```

Notification tap harus deep link ke relevant academy page.

---

# 65. Mobile Route / Screen Mapping

Contoh conceptual route:

```text
/academy

/academy/programs

/academy/program/:id

/academy/material/:id

/academy/assessment/:id

/academy/attempt/:id

/academy/result/:id

/academy/competencies

/academy/competency/:id
```

Instructor:

```text
/academy/instructor

/academy/instructor/program/:id

/academy/instructor/participant/:id

/academy/instructor/input-score/:id

/academy/instructor/verifications

/academy/instructor/verification/:id
```

Commander:

```text
/academy/commander

/academy/commander/program/:id

/academy/commander/program/:id/participants

/academy/commander/personnel/:id
```

Gunakan navigation pattern existing mobile project.

---

# 66. MVP Screen List

## Anggota

Wajib dibuat:

```text
01 Academy Home
02 Program Saya
03 Program Detail
04 Material Detail
05 Assessment Intro
06 Assessment Question
07 Assessment Submit
08 Assessment Result
09 Practical Self Entry
10 Hasil Saya
11 Result Detail
12 Kemampuan Saya
13 Competency Detail
```

---

## Instruktur

Wajib dibuat:

```text
01 Instructor Academy Home
02 Program Saya
03 Program Detail
04 Participant List
05 Participant Detail
06 Input Nilai
07 Verification Queue
08 Verification Detail
09 Reject Flow
10 Correction Flow
```

---

## Komandan

Wajib dibuat:

```text
01 Commander Academy Overview
02 Active Programs
03 Program Detail
04 Participant List
05 Personnel Academy Detail
06 Attention List
07 Competency Monitoring
```

---

# 67. Phase 2

Tidak perlu diprioritaskan di MVP:

```text
Certificate Viewer

QR Certificate

Advanced Chart

Ranking

Offline Full Assessment

Discussion

Comment

Chat Instructor

Calendar Academy khusus

Advanced Analytics

Instructor Analytics

Leaderboard
```

---

# 68. Jangan Dibuat di Mobile

Management berikut WEB ONLY:

```text
Create Program

Edit Program

Curriculum Builder

Material Management

Assessment Builder

Question Bank

Question Editor

Psychology Dimension Builder

Scoring Rules

Bulk Participant Assignment

Instructor Management

Competency Master

Complex Reporting

Academy Configuration
```

Mobile jangan menjadi mini CMS.

---

# 69. Main UX Principle

Gunakan pola:

```text
MEMBER

Open
→ Learn
→ Answer
→ Submit
→ Result
```

```text
INSTRUCTOR

Open
→ Find Participant
→ Input / Review
→ Verify
```

```text
COMMANDER

Open
→ See Overview
→ Identify Problem
→ Drill Down
```

Semakin sedikit langkah untuk flow tersebut semakin baik.

---

# 70. Prioritas Informasi per Role

## Anggota

Urutan prioritas:

```text
1. Apa yang harus saya kerjakan?
2. Sampai mana progress saya?
3. Kapan deadline?
4. Berapa hasil saya?
5. Bagaimana competency saya?
```

## Instruktur

```text
1. Program mana yang saya tangani?
2. Siapa yang belum dinilai?
3. Siapa yang menunggu verifikasi?
4. Bagaimana input nilai dengan cepat?
```

## Komandan

```text
1. Bagaimana kondisi keseluruhan?
2. Program mana yang bermasalah?
3. Siapa yang belum selesai?
4. Siapa yang tidak lulus?
5. Kompetensi apa yang perlu diperhatikan?
```

UI harus menjawab pertanyaan tersebut terlebih dahulu.

---

# 71. Visual Hierarchy

Urutan hierarchy:

```text
Page Title

Primary Status / Important Action

Main Content

Secondary Information
```

Jangan jadikan semua informasi terlihat sama penting.

---

# 72. Card Design

Card harus sederhana.

Gunakan:

```text
judul
status
1–3 metadata
primary action
```

Jangan memasukkan terlalu banyak informasi ke satu card.

---

# 73. Color Usage

Gunakan warna design system existing.

Warna status hanya sebagai reinforcement.

Jangan hanya bergantung kepada warna.

Tetap gunakan text:

```text
Lulus
Tidak Lulus
Menunggu
```

---

# 74. Assessment Design Priority

Assessment merupakan area dengan risiko UX paling tinggi.

Pastikan:

- question readable,
- answer easy to tap,
- timer jelas,
- progress jelas,
- autosave state terlihat,
- tidak mudah accidental submit,
- tidak kehilangan jawaban saat reconnect,
- tidak terlalu banyak distraction.

---

# 75. Practical Scoring Design Priority

Instructor kemungkinan menggunakan fitur sambil berada di lapangan.

UI harus:

- large touch target,
- numeric keyboard sesuai field,
- sedikit tap,
- search cepat,
- save cepat,
- next participant mudah.

Jangan membuat form terlalu panjang jika metrics hanya sedikit.

---

# 76. Responsive Consideration

Target utama native mobile.

Gunakan desain yang optimal mulai dari:

```text
360px
390px
430px
```

Pastikan:

- tidak ada horizontal overflow,
- button tidak terlalu kecil,
- assessment nyaman pada layar kecil,
- keyboard tidak menutupi field penting.

---

# 77. Accessibility

Minimum:

```text
text readable

status tidak bergantung warna saja

button memiliki label jelas

tap target cukup besar

contrast sesuai design system
```

---

# 78. Expected Deliverables

Tim UI/UX/mobile developer harus menghasilkan:

```text
Screen flow

High fidelity UI

Reusable component mapping

Empty state

Loading state

Error state

Permission-based states

Assessment interaction states

Verification interaction states

Responsive mobile states
```

---

# 79. Acceptance Checklist

## General

- [ ] SMART ACADEMY memiliki satu entry point
- [ ] UI menyesuaikan permission
- [ ] menggunakan design system Smart Battalion
- [ ] light mode
- [ ] tidak terlihat seperti tactical app
- [ ] tidak terlalu banyak cards
- [ ] navigation sederhana

## Anggota

- [ ] dapat melihat program
- [ ] dapat melihat progress
- [ ] dapat membuka materi
- [ ] dapat mengerjakan assessment
- [ ] dapat melihat timer
- [ ] jawaban autosave
- [ ] dapat resume attempt
- [ ] dapat submit assessment
- [ ] dapat input practical result jika diperbolehkan
- [ ] dapat melihat verification
- [ ] dapat melihat hasil
- [ ] dapat melihat competency

## Instruktur

- [ ] dapat melihat assigned program
- [ ] dapat melihat participant
- [ ] tersedia smart search
- [ ] dapat input nilai
- [ ] dapat input nilai secara cepat per participant
- [ ] tersedia next participant
- [ ] dapat melihat pending verification
- [ ] dapat verify
- [ ] dapat reject dengan reason
- [ ] dapat melakukan correction dengan reason

## Komandan

- [ ] dapat melihat academy overview
- [ ] dapat melihat program aktif
- [ ] dapat melihat completion rate
- [ ] dapat melihat pass rate
- [ ] dapat melihat perhatian/issue
- [ ] dapat drill down program
- [ ] dapat melihat participant
- [ ] dapat melihat academy detail anggota
- [ ] dapat melihat competency status
- [ ] tidak memiliki management CRUD pada interface ini

---

# 80. Final Product Direction

SMART ACADEMY mobile harus terasa seperti bagian native dari Smart Battalion.

Bukan LMS standalone.

Bukan marketplace course.

Bukan mini dashboard administrator.

Experience akhirnya harus sederhana:

```text
ANGGOTA
lihat tugas
→ belajar
→ ujian
→ lihat hasil
```

```text
INSTRUKTUR
lihat peserta
→ input nilai
→ verifikasi
```

```text
KOMANDAN
lihat overview
→ lihat masalah
→ lihat detail
```

Jika suatu fitur tidak membantu salah satu dari tiga flow utama tersebut, pertimbangkan untuk tidak memasukkannya ke MVP mobile.
