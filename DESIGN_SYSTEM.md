# DESIGN_SYSTEM.md

Panduan desain visual untuk **Smart Battalion**. Dokumen ini adalah **satu sumber kebenaran**
untuk tampilan aplikasi — dipakai saat:

- membuat mockup / canvas desain baru (`/design`), dan
- mengimplementasikan layar baru di kode React Native.

> **Untuk Claude / AI:** sebelum membuat atau mengubah desain apa pun, baca dokumen ini **dan**
> `src/theme/colors.ts`. Ikuti token & pola di sini persis. Kalau user melampirkan gambar
> referensi, referensi itu menang untuk hal yang spesifik terlihat di gambar; dokumen ini
> mengisi sisanya (warna token, spacing, komponen yang tidak terlihat, state). Jangan mengarang
> warna / font / komponen baru — kalau butuh sesuatu yang belum ada di sini, tanyakan dulu lalu
> tambahkan ke dokumen ini di perubahan yang sama.

---

## 0. Prinsip

1. **Referensi dulu.** Setiap layar baru harus punya rujukan: layar sejenis yang sudah ada,
   gambar yang dilampirkan user, atau bagian dokumen ini. Tidak mendesain "dari nol/dari ingatan".
2. **Light mode only.** Tidak ada dark theme, tidak ada toggle.
3. **Konsisten > pintar.** Pakai ulang komponen yang sudah ada. Layar baru memakai kosakata
   visual yang sama (token, radius, shadow, density), bukan gaya baru.
4. **Tenang & institusional.** Aplikasi kesatuan militer — rapi, terbaca, tidak ramai. Hindari
   dekorasi berlebihan.

---

## 1. Token warna

### 1a. Token aplikasi (kode) — `src/theme/colors.ts`

Ini yang dipakai komponen RN saat ini. **Jangan menulis hex mentah di komponen** — tambah token
di `src/theme/colors.ts`.

| Token | Hex | Pakai |
|---|---|---|
| `background` | `#F5F6F8` | latar layar `MainLayout` (putih sedikit abu — kartu `surface` #FFF di atasnya) |
| `surface` | `#FFFFFF` | kartu, header |
| `border` | `#E4E9F2` | garis pemisah / border kartu |
| `text` | `#0F172A` | teks utama |
| `textMuted` | `#64748B` | teks sekunder |
| `primary` | `#2563EB` | aksi utama, link, ikon aktif |
| `primaryForeground` | `#FFFFFF` | teks di atas primary |
| `primarySurface` | `#DBEAFE` | latar chip/badge biru |
| `danger` | `#DC2626` / surface `#FEE2E2` / muted `#FCA5A5` | darurat, error, destruktif |
| `success` | `#16A34A` / surface `#DCFCE7` / subtle `#F0FDF7` | status aktif, sehat, verified |
| `warning` | `#F59E0B` / surface `#FEF3C7` | peringatan ringan |
| `neutralSurface` | `#F1F5F9` | latar netral |
| `overlay` | `rgba(15,23,42,0.45)` | dim di belakang modal |

Gradien identitas modul (dipakai di kartu katalog):
`personnel` biru `#3B82F6→#2563EB` · `persit` pink `#F472B6→#EC4899` · `vehicles` hijau
`#10B981→#0EA5E9` · `weapon` ungu `#8B5CF6→#4F46E5` · `entry`/distribusi jingga `#F59E0B→#EF4444`.

### 1b. Token "canvas theme" (evolusi visual — target tampilan baru)

Tampilan yang dipakai di canvas desain (lebih lembut, ada shadow biru). **Saat
mengimplementasikan ini ke kode, tambahkan sebagai token baru** di `src/theme/colors.ts`.

> **Revisi latar 2026-09-01 — "putih sedikit abu".** Latar semua layar **non-Auth** tidak lagi
> gradient lavender-biru; sekarang near-white `#F7F8FA → #F2F4F7` (`pageGradient*`), kartu konten
> tetap `surface` #FFF. Blob pojok putih di `atoms/ScreenBackground` **dihapus** (tak kelihatan di
> latar near-white); `headerSurface` jadi `#FFFFFF` solid + `headerShadow` netral (bukan `cardShadow`
> biru). Layar **Autentikasi** (Login/OTP/Lupa Password/Ganti Password) **tetap** gradient lavender
> + gunung + blob, lewat token terpisah `authGradient*` (`AuthBackground` / `AuthLayout`).
Sudah dipakai penuh di **layar Autentikasi** (Login, Login-OTP, Lupa Password, Ganti Password) —
lihat komponen `AuthBackground` / `AuthLayout` / `GradientButton` / `AuthField` / `AuthToggle` —
**dan seluruh grup layar Komandan** (CommanderHome, CatalogList, CatalogDetail, PersonnelTracking,
PersonnelMap, SendAnnouncement, AlarmSatuan, EmergencyList) plus ketiga Home dan tab bar bawah,
**dan seluruh grup "Semua Peran"** (Emergency, Notifications, Profile, Settings, ComingSoon —
semua `MainLayout variant="canvas"` + `subtitle`; `StatusModal` sudah §5.15).
Infrastruktur bersama:

- `atoms/ScreenBackground` — gradient backdrop near-white untuk layar non-Auth (tanpa blob/gunung/
  watermark; `AuthBackground` yang masih pakai blob + gunung, khusus Auth).
- `templates/MainLayout` prop `variant="canvas"` + `subtitle` — header besar `22/800` tanpa
  nav-bar/border, tombol back kotak putih `40×40`. `variant` default `'plain'` (layar lama tak
  berubah).
- `molecules/SearchFilterBar` — baris "search + tombol filter" canvas (§5.9), dipakai CatalogList
  & PersonnelTracking.
- `atoms/GradientAvatar` — avatar bundar gradient + inisial + status-dot (§5.8), react-native-svg.
- `theme/shadows.ts` — preset shadow siap-pakai (lihat §1c).

Juga dipakai di **layar Anggota** (tab Riwayat, HealthMyHistory, HealthRecordDetail, BukuSaku,
Lainnya) — tab Riwayat/BukuSaku/Lainnya pakai `atoms/ScreenBackground` + `HomeHeader`,
HealthMyHistory & HealthRecordDetail pakai `MainLayout variant="canvas"`; state kosong "belum ada
konten" lewat `molecules/EmptyState`
(icon-chip `chipSurface` 64 + judul `20/700` + pesan `15` muted).

Dan **seluruh grup layar Petugas Kesehatan** (HealthDashboard, HealthPersonnelSearch,
HealthPersonnelProfile, HealthRecordInput — semua `MainLayout variant="canvas"` + `subtitle`).
Pola bersama di grup ini: `molecules/PersonAvatar` (fallback inisial kini `atoms/GradientAvatar`
biru, bukan lagi kotak `primarySurface`), `molecules/SearchFilterBar` (tanpa tombol filter,
prop `autoFocus`) untuk baris pencarian, kartu list `borderSoft` + `cardShadow`, CTA utama
`atoms/GradientButton`. Form (`HealthRecordInput`): field pilih pakai icon-chip `chipSurface` 32,
`molecules/DateTimeField` kini bergaya canvas (`borderSoft` + radius 14 + `smallButtonShadow`),
`TextField` di-override ke radius 14 / `borderSoft`, footer tombol di-pin pakai `floatingSurface`
+ `tabBarShadow` (tanpa border atas).

Token yang **sudah ada** di `src/theme/colors.ts`: `heading` `#1E293B` · `placeholder` `#94A3B8` ·
`borderSoft` `#E7EDF9` · `chipSurface` `#EEF3FD` · `pageGradientStart` `#F7F8FA` /
`pageGradientMid` `#F4F6F9` / `pageGradientEnd` `#F2F4F7` (latar near-white non-Auth) ·
`authGradientStart/Mid/End` `#EFF1FA`/`#E7ECF8`/`#E2EAF6` (latar lavender khusus Auth) ·
`gradientPrimaryStart` `#3B82F6` /
`gradientPrimaryEnd` `#2563EB` · `authMountainBack/Mid/Front` `#CBD8EE`/`#B6C7E6`/`#9FB5DC` (siluet
gunung Login) · `decorBlobStrong/Soft` `rgba(255,255,255,0.5/0.35)` (blob pojok — Auth saja) ·
`pillTrackSurface/Border` `rgba(255,255,255,0.55/0.8)` (track toggle pill di atas gradient) ·
`headerSurface` `#FFFFFF` (Home header) · `floatingSurface` `rgba(255,255,255,0.94)` (kartu di
atas peta) · `warningText` `#B45309` · `dangerText` `#B91C1C` · `alertBannerStart/End/Border`
`#FEECEC`/`#FDE0E0`/`#FBD5D5` (banner emergency CommanderHome) · `mapCanvasStart/End`
`#E8F0E6`/`#E3EDF7` · `gradientInactiveStart/End` `#A78BFA`/`#8B5CF6` (avatar nonaktif) ·
`gradientDangerStart`/`gradientWarnStart`/`gradientSuccessStart` `#F87171`/`#FBBF6B`/`#4ADE80`
(avatar ber-tint status) · `gradientDangerCtaStart` `#EF4444` (start gradient tombol/ikon danger —
red-500, sepadan dengan `gradientPrimaryStart`; **bukan** `#F87171`/`#FCA5A5` yang terlihat pudar di
ukuran CTA) · `haloPrimary`/`haloDanger` `rgba(37,99,235,0.10)`/`rgba(220,38,38,0.10)`
(cincin "halo" di belakang badge ikon StatusModal §5.15) · `notifUnreadSurface`/`notifUnreadBorder`
`#EEF4FF`/`#BFD3FB` (baris notifikasi belum dibaca).

| Nama | Nilai | Pakai |
|---|---|---|
| Latar layar non-Auth | `linear-gradient(180deg, #F7F8FA 0%, #F4F6F9 45%, #F2F4F7 100%)` | putih sedikit abu — semua layar kecuali Auth |
| Latar layar Auth | `linear-gradient(180deg, #EFF1FA 0%, #E7ECF8 45%, #E2EAF6 100%)` | lavender-biru + gunung — Login/OTP/Lupa/Ganti Password |
| `borderSoft` | `#E7EDF9` | border kartu (lebih lembut dari `border`) |
| `heading` | `#1E293B` | judul & angka besar |
| `placeholder` | `#94A3B8` | teks placeholder input |
| `chipSurface` | `#EEF3FD` | latar icon-chip & tombol aksi kecil |
| `dividerOnGradient` | `#CBD5E1` | pemisah "•", garis tipis di atas latar gradient |
| Gradient primary | `linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)` | tombol utama, avatar, tab aktif |
| Gradient danger (CTA) | `linear-gradient(135deg, #EF4444 0%, #DC2626 100%)` | `GradientButton` tone danger (Logout), badge ikon error `StatusModal` |
| `warningText` | `#B45309` | teks di atas `warningSurface` (kontras cukup) |

### 1c. Bayangan (shadow)

Preset RN siap-pakai di **`src/theme/shadows.ts`** — import dari sana, jangan tulis prop shadow
inline: `cardShadow`, `cardShadowRaised`, `ctaPrimaryShadow`, `ctaDangerShadow`,
`smallButtonShadow`, `headerShadow`, `tabBarShadow`.

| Nama | Nilai CSS (canvas) | RN kira-kira |
|---|---|---|
| Kartu (default) | `0 6px 20px rgba(37,99,235,0.06)` | `shadowColor:'#2563EB', shadowOpacity:0.06, shadowRadius:20, shadowOffset:{0,6}, elevation:2` |
| Kartu menonjol | `0 8px 24px rgba(37,99,235,0.08)` | elevation 3 |
| Tombol/CTA primary | `0 14px 30px rgba(37,99,235,0.30)` | elevation 8 |
| Tombol/CTA danger | `0 14px 30px rgba(220,38,38,0.30)` | elevation 8 |
| Tombol kecil (kotak) | `0 4px 12px rgba(37,99,235,0.10)` | elevation 3 |
| Home header (`headerShadow`) | `0 4px 16px rgba(15,23,42,0.05)` | `shadowColor:'#0F172A', shadowOpacity:0.05, shadowRadius:16, offset:{0,4}, elevation:2` |
| Tab bar bawah | `0 -6px 24px rgba(37,99,235,0.12)` | elevation 8, offset y -4 |

Warna shadow **selalu bernuansa biru** (`rgba(37,99,235,...)`) atau warna aksen komponen —
tidak pernah hitam murni, **kecuali** `overlay` dan `headerShadow` (netral slate — bar putih solid
di atas latar near-white butuh bayangan tak berwarna).

---

## 2. Radius & spacing

- **Radius:** pill `999` (tombol, badge, toggle, status pill) · kartu `16` · kartu kecil / field
  `14` · icon-chip / tombol kotak `12` · avatar = lingkaran penuh.
- **Spacing:** kelipatan 4. Padding layar horizontal `20–24`. Padding kartu `16`. Gap antar kartu
  di list `12–14`. Gap section header ke konten `12`. Jarak antar section `16–24`.
- **Hit target minimal 44px** untuk semua elemen yang bisa ditekan.

---

## 3. Tipografi

Font: **system default** (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`). Aplikasi
belum memakai custom font — pertahankan kecuali user minta.

| Peran | Ukuran / weight | Warna |
|---|---|---|
| Judul halaman (header) | `22` / `800`, letter-spacing `-0.4` | `heading` |
| Sub-judul header | `13` / `400` | `textMuted` |
| Judul section | `15` / `700` | `heading` |
| Judul section (label kecil) | `13` / `700`, UPPERCASE, letter-spacing `0.4` | `primary` |
| Judul kartu | `14–15` / `700` | `heading` |
| Body | `13–14` / `400–500` | `text` |
| Meta / caption | `11–13` | `textMuted` |
| Angka statistik | `18` / `700` | `heading` |
| Label tombol | `16` / `700` (utama), `14` / `600` (kecil) | sesuai varian |
| Badge / pill | `11–12` / `600–700`, UPPERCASE | sesuai varian |

---

## 4. Ikon

- Sumber: `src/components/atoms/Icon` (`IconName`). **Selalu pakai ikon dari set ini.**
- Gaya: stroke-based, `viewBox 0 0 24 24`, `stroke-width 1.8`, `stroke-linecap/linejoin: round`,
  `fill: none`.
- Ukuran: `13–16` inline dengan teks · `18–20` di baris/aksi · `24` di tab bar · `28` di kartu
  quick-action · `40` di layar aksi tunggal (Emergency).
- **Tidak pernah emoji / dingbat** sebagai ikon UI.
- Ikon di dalam chip: bungkus dengan `chipSurface` rounded-square (`12` radius, `30–40px`).

---

## 5. Komponen

### 5.1 Header layar `[← judul]` (stack screen)

Dipakai di semua layar non-tab (`MainLayout`). Format:

```
[ ← ]  Judul Halaman            [ ikon ]   ← ikon kanan opsional
       Sub-judul kecil muted
```

- Tombol back: `40×40`, radius `12`, `surface` putih, shadow "tombol kecil", ikon `arrow-left` `22`
  warna `heading`.
- Judul `22/800/-0.4` `heading`; sub-judul `13` `textMuted`, `margin-top 2`.
- Header **tidak** punya garis bawah / latar nav-bar — duduk langsung di atas latar gradient.
  Padding `20px 20px 12px`.
- Ikon kanan: tombol kotak putih yang sama (`40×40`, radius `12`, shadow), ikon warna `primary`
  `20`. **Saat ini hanya layar Profile yang punya ikon kanan** (gerigi → Settings).

### 5.2 Home header (tab screen)

Latar `rgba(255,255,255,0.72)` + shadow kartu (tanpa border). Kiri: logo polos `44×44` (langsung
`<Image>`, **tanpa** kartu/badge putih/shadow di belakangnya — direvisi 2026-09-22 supaya logo baru
tampil penuh, bukan terkurung kotak) + `Selamat {pagi/siang/sore/malam}, {Role}` `12` muted / nama
`15/700` `heading` / satuan `12` muted. Kanan: tombol lonceng (`40`, radius `14`, `chipSurface`,
badge angka merah) + avatar (`40` lingkaran, gradient primary, inisial putih `16/700`). Pola logo
polos ini (bukan kartu) juga dipakai `AcademyHeader` (`44×44`), `NavBar` (`44×44`, sudah dari
awal tanpa kartu), dan logo splash besar di `Login`/`AppBootstrap` (`92×92`/`88×88`, langsung
`<Image>` tanpa kartu putih + shadow).

> **Logo ikut `BRAND` otomatis — `src/assets/logo/`.** Dua file PNG tersimpan: `LogoCigra.png`
> (crest elang, brand "cigra") dan `LogoSakaraguna.png` (api oranye, brand "sakaraguna" — logo
> yang lebih dulu ada, di-restore dari git history `HEAD` commit `5d95d32` saat brand "cigra"
> ditambahkan 2026-09-22). `src/assets/logo/index.ts` meng-export `LogoIcon` lewat lookup
> `{ sakaraguna: ..., cigra: ... }[Config.BRAND]` (`react-native-config`, dari `.env`) — ganti
> `BRAND` di `.env` + rebuild native sudah cukup, **tidak ada file lain yang perlu diedit** untuk
> pindah logo. Lihat `CLAUDE.md` "App branding (multi-brand)" untuk cakupan penuh (applicationId,
> ikon launcher, `google-services.json` juga ikut `BRAND` yang sama).
> **Gaya di sekitar logo (kartu/tanpa-kartu, ukuran) TIDAK ikut brand** — sengaja dibuat satu gaya
> "polos" (langsung `<Image>`, tanpa kartu/badge/shadow, diperbesar — direvisi 2026-09-22) untuk
> semua brand di `HomeHeader`/`AcademyHeader`/`NavBar`/`Login`/`AppBootstrap`, supaya menambah
> brand baru tidak perlu menyentuh style. Kalau suatu brand butuh gaya beda (mis. logo yang lebih
> ramai secara visual butuh kartu lagi), itu perubahan terpisah yang perlu diminta eksplisit.

### 5.3 Kartu

`surface` putih, border `1px borderSoft`, radius `16`, shadow "kartu (default)", padding `16`.

### 5.4 SectionCard

Kartu + header: ikon `18` `primary` + judul `13/700` UPPERCASE `primary` letter-spacing `0.4`,
`margin-bottom 8`. Isi = baris `InfoRow`.

### 5.5 InfoRow

Baris `space-between`, `padding 10px 0`, garis bawah `borderSoft` (kecuali baris terakhir).
Kiri: ikon `18` `primary` + label `14` `textMuted`. Kanan: value `14/600` `heading`, rata kanan.

### 5.6 Tombol

| Varian | Tampilan |
|---|---|
| Primary | pill `999`, gradient primary, teks putih `16/700`, shadow CTA primary, tinggi `54–56` |
| Secondary | pill `999`, `surface` putih, border `borderSoft`, teks `heading` `14/600`, shadow kecil |
| Danger | pill `999`, gradient danger, teks putih `16/700`, shadow CTA danger |
| Ghost / link | teks saja `primary` `13–14/600` |

Tombol kecil (mis. "Muat lebih banyak"): pill/rounded `12`, latar `chipSurface`, ikon + teks
`primary` `13/600`.

Komponen: `atoms/GradientButton` (Primary/Danger), `atoms/Button` (Secondary/plain).
`molecules/OpenMapsButton` ("Buka di Google Maps") = **Secondary pill** — latar putih (gradasi
tipis ke `chipSurface`), border `borderSoft`, shadow kecil, ikon `map-pin` + teks `primary`
`14/600` di **tengah**, pill `999`, tinggi `48`; prop `floating` = absolut di bawah layar.

### 5.7 Badge / status pill

Pill `999`, `padding 4px 10px`, teks `11–12/600–700` UPPERCASE.
`success` → latar `#DCFCE7` teks `#16A34A` + titik `6px` hijau.
`primary` → latar `#EEF3FD` / `#DBEAFE` teks `#2563EB`.
`neutral` → latar `#EEF3FD` / `#F1F5F9` teks `#64748B` + titik abu.
`warning` → latar `#FEF3C7` teks `#B45309` + titik amber.
`danger` → latar `#FEE2E2` teks `#DC2626` + titik merah.

Komponen: `atoms/Badge` (`variant` = `success | primary | neutral | warning | danger`, prop
`icon` untuk ganti titik dengan ikon). `molecules/LocationStatusBadge` khusus status lokasi
(punya "(Nx lalu)" yang ter-tick tiap detik).

### 5.8 Baris list (list row)

Kartu (5.3) dengan `padding 16`, gap antar kartu `12–14`. Isi:
`[avatar]  [nama + meta]  [badge]  [chevron]`

- Avatar: lingkaran `44–52`, gradient (primary untuk aktif; ungu `#A78BFA→#8B5CF6` untuk
  nonaktif), inisial putih `18–20/700`. **Status dot** opsional: absolut kanan-bawah, `13px`,
  border putih `2.5px`, hijau `#16A34A` (aktif) / abu `#94A3B8` (nonaktif).
- Nama `16/700` `heading`.
- Meta: baris `flex-wrap`, tiap segmen = ikon `13` `textMuted` + teks `13` `textMuted`, dipisah
  "•" warna `dividerOnGradient`. Segmen tanpa teks di-drop (tidak ada "•" nyangkut). Di kode,
  `CatalogListItem.metaSegments` (`{ icon, text }[]`) diisi per-resource di `catalogResources.tsx`.
- `badge` & `chevron` rata **tengah vertikal** (`alignSelf: 'center'` — Badge default-nya
  `flex-start`). Chevron `18` `#94A3B8` (`placeholder`).

### 5.9 Field input

`surface` putih, radius `14`, border `borderSoft`, tinggi `52–56`, shadow kecil, `padding 0 14–18`.
Placeholder `placeholder` `15`. Ikon kiri: polos `18` `textMuted` **atau** icon-chip (`chipSurface`
rounded-square) untuk form. Label di atas: `14/500` `textMuted`, `margin-bottom 6`.

**Tombol filter** (di sebelah search bar): kotak `52`, radius `14`, **`surface` putih + border
`borderSoft` + shadow kecil** (sama seperti field search), ikon `filter` `20` `primary`. Tidak
pakai latar biru.

### 5.10 Tab bar bawah (bottom nav)

Absolut bawah, tinggi `64`, sudut atas radius `24`, `surface` putih, shadow tab bar. 5 item.
Item **aktif**: dibungkus pill gradient primary (`padding 6px 14px`, radius `999`, shadow) — ikon
& teks putih. Item nonaktif: ikon + teks `#94A3B8` `10/600`. **Label 1 baris, tidak boleh
wrap** (`numberOfLines={1}` di RN) — ukuran `10px` supaya "Buku Saku" muat satu baris.
Item tengah = tombol Emergency: lingkaran `56`, gradient danger, terangkat `-20px`, shadow danger.

### 5.11 Tab detail (collapsing tabs)

Header kartu (avatar `88` + judul `20/700` + badge + meta rows) yang ikut scroll, lalu tab bar
menempel. **Wajib tetap `react-native-collapsible-tab-view` + `MaterialTabBar`** (gestur swipe
antar-tab tidak boleh hilang) — jadi semua styling lewat prop-nya:

- **Bar** (`MaterialTabBar style`): `surface` putih, `borderBottomWidth 1 / borderBottomColor
  borderSoft`, shadow lembut `0 6px 16px rgba(37,99,235,0.06)`.
- **Item** (`tabStyle` + label render `TabBarLabel`): kolom, ikon `19` di atas + label
  `12/600` (`700` saat aktif), `line-height 14`, boleh 2 baris (`numberOfLines={2}`), tengah.
- **Indikator** (`indicatorStyle`): garis bawah **pendek & membulat** — `height: 3`,
  `borderRadius: 999`, `width: 40` (bukan selebar tab), `backgroundColor: primary`. MaterialTabBar
  memusatkan indikator lebar-tetap di bawah tab aktif.
- Warna: `activeColor = primary`, `inactiveColor = #94A3B8`.
- **Latar di belakang header card**: `CollapsingTabsDetail` meng-override `headerContainerStyle`
  library-nya (bawaannya `backgroundColor: 'white'` + shadow hitam) jadi `pageGradientStart` +
  shadow mati — supaya area di belakang card menyatu dengan latar gradient layar, bukan kotak
  putih. Tab bar tetap punya latar putih + shadow biru sendiri.

**Tab "Lokasi"** (artboard "Catalog Detail - Lokasi", `organisms/LocationPanel`): badge status
`LocationStatusBadge emphasis` (pill besar UPPERCASE) berdiri sendiri di atas · peta `180` (radius
`16`, `borderSoft`, shadow default) · `OpenMapsButton` · grid 2 kolom kartu "Koordinat" / "Akurasi"
(`14` radius, `borderSoft`) · pill-bar gelap `heading` "Riwayat Pergerakan" · kartu list baris =
titik (`primary` utk terbaru, `placeholder` sisanya) + waktu `13/600` + koordinat/akurasi `12`
muted · tombol "Muat lebih banyak" pill tint `primary` (`bg #2563EB14`, border `#2563EB29`).

### 5.12 Strip "Sistem terhubung"

Kartu (5.3) `padding 12`, radius `16`, shadow "kartu (default)", `space-between`. Kiri: titik hijau `8px`
(halo `0 0 0 3px rgba(22,163,74,0.18)`) + "Sistem terhubung" `12` muted. Kanan: ikon `refresh` `13`
`primary` + "Terakhir sinkron: HH:MM". Menekan strip = trigger refresh yang sama dengan pull-to-refresh.

Komponen: `molecules/SyncStrip` (`syncedLabel` + `onPress`) — dipakai identik di ketiga Home
(Commander / Member / HealthOfficer). Jangan salin markup-nya inline.

### 5.13 StatCard

Kartu kecil (radius `16`, border `borderSoft`, shadow default), `padding 12`. Format:
`[ikon + label]` (satu baris, ikon `16`, label `12/600` `#334155`) / angka `18/700` `heading` /
persen `11/600` muted / progress bar (`track` `4px` `chipSurface`, `fill` warna kategori).

### 5.13b Chip ikon gradient ("Aksen Gradient") + kartu hero Ringkasan Situasi

Sejak redesign **CommanderHome 2026-09-22** ("Opsi C · Aksen Gradient" dari canvas), beberapa
icon-chip yang tadinya tint flat (`${color}1F` di atas `surface` putih) sekarang boleh memakai
**gradient 2-tone** (react-native-svg, pola yang sama dengan `GradientAvatar`/`GradientButton`) —
ikon jadi putih, bukan berwarna. Pasangan warnanya **selalu** salah satu token gradient yang sudah
ada di `theme/colors.ts` (`gradientPersonnelStart/End`, `gradientFamilyStart/End`,
`gradientWarnStart`+`warning`, `gradientSuccessStart`+`success`, `gradientEntryStart/End`,
`gradientWeaponStart/End`, `gradientHealthStart/End`, `gradientDangerStart`+`danger`,
`gradientPrimaryStart/End`) — **tidak pernah** warna baru dikarang untuk ini.

- Komponen: `atoms/GradientIconChip` (`icon`, `colors:[start,end]`, `size`, `iconSize`, `radius`) —
  chip kotak membulat, dipakai lewat prop opsional `gradientColors` di `screens/Home/
  QuickActionButton`, `screens/Home/ActivityRow`, `screens/Home/AnnouncementRow`, dan
  `organisms/MessageDetailSheet` (fallback ke tint flat lama kalau prop-nya tidak diisi — jadi
  pemanggil lama tidak perlu ikut berubah). Ini **bukan** "gradient di mana-mana" (§7) — kartu &
  section tetap flat, gradient cuma di chip ikon kecil, sama seperti avatar bergradient yang sudah
  lama ada di aplikasi.
- Dipakai di: `CommanderHome` (grid Quick Action + bottom sheet "Lainnya" lewat
  `QuickActionSheet`, baris Aktivitas Terbaru, baris Pengumuman Terbaru), `HealthOfficerHome`
  (3 quick action), layar `ActivityMovements` ("Lihat Semua" Aktivitas), `Announcements` ("Lihat
  Semua" Pengumuman — dulu `iconCircle` flat, sekarang `GradientIconChip` langsung, tanpa fallback),
  dan `Notifications` (chip per tipe: `emergency`/`announcement`/`info` dapat gradient, tipe apa pun
  yang mengandung substring `"disposition"` — backend punya beberapa varian tak konsisten:
  `disposition_completed`/`disposition_recipient_completed`/`disposition_follow_up`/
  `letter_disposition`, belum ada di `API_CONTRACT.md` — dipetakan ke ikon `mail` + gradient
  personnel; `system` sengaja tetap flat, tak punya identitas warna kuat).
- **`screens/Home/SituationHeroCard`** menggantikan grid 2×2 `StatCard` + banner alert terpisah di
  `CommanderHome` "Ringkasan Situasi": satu kartu — header gradient primary (angka total besar +
  ikon `shield-check`), lalu strip sinyal darurat yang **menyatu** di bawahnya (merah kalau
  `active_alerts > 0`, hijau tenang "Tidak ada sinyal darurat aktif" kalau tidak — dua-duanya
  `PressableScale` ke `EmergencyList`), lalu baris mini-stat (ikon+angka+label+persen, garis
  `borderSoft` vertikal antar kolom, bukan kartu terpisah-pisah). `StatCard` sendiri tidak dihapus —
  masih dipakai apa adanya di `HealthOfficerHome` ("Ringkasan Pemeriksaan", section berbeda, bukan
  "Ringkasan Situasi").
- **Peta Personel Real-time (CommanderHome)**: kartu preview map dapat bingkai gradient tipis
  (`padding:2` + `Rect` gradient primary radius18, map di dalamnya radius16) + chip mengambang kiri
  atas ("`N`/`total` dipantau", `floatingSurface` + `smallButtonShadow`) + pill mengambang kanan
  bawah ("Peta Lengkap", `primary` + `ctaPrimaryShadow`) — dekoratif saja, seluruh kartu tetap satu
  `PressableScale` ke `PersonnelMap` fullscreen.

**Rollout 2026-09-22 (lanjutan) — chip flat lain di seluruh app ikut dikonversi**, supaya satu
gaya konsisten di mana pun ada icon-chip (bukan cuma Home): `SendAnnouncement` (`FieldHeader` tiap
field form + kartu Riwayat Terkirim), `RollCallDetail` ("Input Absen" `ChoiceRow` Hadir/Tidak
Hadir), `RollCallEntry` (chip "Status Kehadiran" & "Keterangan"), `BukuSaku` (`rowIcon` tiap bab) +
`BukuSakuDetail` (`recordIcon` marker `record_display`), `molecules/HealthRecordCard` (dipakai
`HealthMyHistory`/`HealthDashboard`/`HealthPersonnelProfile` — chip `heartbeat` jadi gradient
health), `MemberHome` (`ShortcutButton` "Akses Cepat", `StatusTile` "Status Saya", `NoticeRow`
"Pengumuman Terbaru", `TimelineRow` "Aktivitas Terbaru", chip patroli mengambang), dan hampir
seluruh Smart Academy (`AcademyMemberHome` pendingIcon, `AcademyInstructorHome` progIcon/verifIcon,
`AcademyCommanderOverview`+`AcademyCmdAttention` attentionIcon per-status, `AcademyCmdCompetency`
medal, `AcademyMaterial` fileIcon, `AcademyAttemptResult` badge LULUS/TIDAK LULUS jadi gradient
success/danger, `AcademyProgramDetail` node timeline "selesai" jadi gradient success + check).
`src/utils/gradientColor.ts` (`gradientForColor`) menerjemahkan satu warna flat yang sudah ada
(dari array/lookup status→warna yang sudah dipakai lebih dulu) jadi pasangan gradient tanpa perlu
menulis ulang tiap lookup — dipakai di `MemberHome`'s 4 baris. Tidak disentuh (out of scope): grid
Quick Action `HealthOfficerHome`-nya sendiri sebenarnya sudah dikonversi di rollout awal;
`molecules/EmptyState`, `RollCallList`/`RollCallScan`/`RollCallSearch`, dan hampir semua layar
Academy assessment/attempt (tak punya pola icon-chip flat — ikonnya inline di pill/banner, bukan
kotak/lingkaran ber-tint terpisah) sengaja dibiarkan flat.

### 5.14 Latar dekoratif

**Layar non-Auth:** latar polos near-white `pageGradient*` (`atoms/ScreenBackground`), **tanpa
blob** — sejak revisi "putih sedikit abu" 2026-09-01 (§1b) blob putih tak lagi kelihatan di latar
terang, jadi dihapus.

**Layar Auth (`atoms/AuthBackground`):** 1–2 "blob" `rgba(255,255,255,0.35–0.5)` lingkaran besar
(`200–240px`) di pojok atas, `position: absolute`, `pointer-events: none`, `overflow: hidden` di
root; Login juga punya siluet gunung 3 lapis di bawah + watermark perisai di kanan. **Jangan
berlebihan.**

### 5.15 StatusModal — popup konfirmasi / hasil

Komponen: `src/components/organisms/StatusModal` (sudah sesuai spek ini di kode). Dipakai untuk
**semua** feedback aksi (sukses/gagal) dan konfirmasi destruktif — bukan `Alert.alert`. Satu
varian dipakai per konteks; begitu redesign satu, yang lain ikut. Badge ikon = SVG rect gradient
+ `View` halo (`haloPrimary`/`haloDanger`); tombol primary = `atoms/GradientButton` (`height`
prop, default 56 → 52 di sini), tombol sekunder = pill putih inline.

- **Backdrop:** `overlay` (`rgba(15,23,42,0.45)`), center, `padding 0 32px`.
- **Kartu:** `surface` putih, radius `24`, `padding 28px 24px`, `align-items: center`, `gap 10`,
  shadow kuat `0 30px 70px rgba(15,23,42,0.35)`. Lebar = penuh dikurangi padding backdrop.
- **Badge ikon:** lingkaran `64`, gradient sesuai varian + halo
  `0 0 0 8px rgba(<aksen>,0.10), 0 10px 22px rgba(<aksen>,0.28)`, `margin-bottom 6`. Isi = ikon
  stroke putih (bukan glyph teks): `success` → gradient primary + centang (`M5 13l4 4L19 7`,
  stroke `2.4`); `error` → gradient danger + `alert-triangle` (stroke `2`). Prop opsional `icon`
  meng-override glyph tanpa mengubah warna varian — mis. `download` (`M12 3v11M7 10l5 5 5-5M5 20h14`,
  stroke `2`) dipakai `AppVersionGate` supaya modal "Update" tetap primary/biru tapi ikonnya
  bermakna unduh, bukan centang.
- **Judul:** `18/700` `heading`, center. **Pesan:** `14` `textMuted`, center, `line-height 20`.
- **Aksi:** baris `gap 12`, `margin-top 16`, lebar penuh. Tombol tinggi `48–52`, pill `999`,
  `flex: 1`:
  - 1 tombol (hasil sukses/gagal tanpa pilihan) → primary gradient (sukses) / danger gradient
    (gagal), lebar penuh.
  - 2 tombol (konfirmasi) → sekunder (putih, border `borderSoft`, teks `heading` `15/600`) di
    kiri + primary/danger gradient di kanan.

Contoh di canvas: artboard **"Settings Popup"** (konfirmasi Logout, varian error, 2 tombol) &
**"Emergency Popup"** (Sinyal Terkirim, varian success, 1 tombol) — masing-masing artboard
**terpisah** (duplikat halamannya + overlay modal) supaya halaman aslinya tetap terlihat bersih di
artboard "Settings" / "Emergency".

### 5.16 Kartu daftar ringkas (list-card) & pemotongan teks

Untuk daftar pendek di dalam satu kartu (Aktivitas Terbaru, Pengumuman Terbaru di MemberHome):

- Kartu `list-card`: `padding: 0 14px`, radius `16`, border `borderSoft`, shadow default.
- Tiap baris: `padding: 12px 0`, **garis tipis `1px borderSoft` sebagai pemisah** antar baris
  (`:not(:last-child)`) — bukan jarak kosong saja.
- Grup teks baris = flex-column dengan **`gap: 4px`** antara judul, deskripsi, dan sub-baris
  (jangan menempel).
- Baris "aktivitas/pergerakan": ikon-chip `32` (radius `10`) berwarna sesuai arah (masuk = hijau
  tint, keluar = jingga tint), **bukan avatar inisial**; judul = nama/aksi, deskripsi = detail,
  kanan = waktu saja. MemberHome & CommanderHome memakai struktur baris yang **identik** — beda
  hanya isinya.
- **Judul maksimal 1 baris** → `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
  (butuh `min-width: 0` di kontainer flex-nya).
- **Deskripsi maksimal 2 baris** → `-webkit-line-clamp: 2` (`display: -webkit-box;
  -webkit-box-orient: vertical; overflow: hidden`).
- Aturan 1-baris judul / 2-baris deskripsi ini **default untuk semua baris daftar** di aplikasi.

**Kartu aset / kartu yang bisa diketuk:** nama aset 1 baris (ellipsis), tambahkan **chevron `14`
`#94A3B8`** di pojok kanan header kartu sebagai penanda bisa diketuk (bukan tombol "Lihat Semua"
terpisah). Section header kartu aset tidak pakai link "Lihat Semua".

---

### 5.17 Tagihan Koperasi — kartu nominal, alokasi per jenis, tren

Dari canvas "Tagihan Koperasi" (2026-09-24). Pola untuk layar yang menampilkan **nominal rupiah**:

- **Kartu nominal (Home)** — `screens/Home/CoopBillCard` / `CoopReportCard`: header = chip gradient
  `wallet` (success) + judul `13/700` + sub `12` muted + chevron; nominal besar `26–28/800`
  (`letter-spacing -0.5`); di kanannya `molecules/CoopDeltaPill` (naik/turun vs periode lalu);
  kalimat selisih `12` muted; lalu isi; ditutup `molecules/StatDividerRow`.
- **`molecules/CoopDeltaPill`** — bentuk Badge (§5.7) dengan ikon tren. **Tagihan turun = hijau**
  (`success`), **naik = amber** (`warningText` di `warningSurface` — bukan merah, bukan alarm),
  sama = abu. Peta di `utils/coopSalary.ts` `COOP_TREND_META`.
- **`molecules/StatDividerRow`** — baris mini-stat rata kiri (label `11` muted di atas, angka
  `13/700` / `15/700`), garis `borderSoft` vertikal antar kolom, `border="top"` (penutup kartu)
  atau `"both"` (di tengah kartu). Pakai ini, jangan menggambar ulang baris stat.
- **`molecules/CoopCategoryBreakdown`** — bar bertumpuk (gap `2`, pill) + legenda. `compact`:
  jenis bernilai saja, titik `8`. `full`: **ketujuh jenis selalu tampil** (yang nol dipudarkan:
  swatch `border`, teks `placeholder`, persen "–") + persen + baris "Jumlah". Warna per jenis =
  token `coopCategory*` (nilainya sama dengan aksen yang sudah ada, jadi palet tidak bertambah).
- **`molecules/TrendBarChart`** — batang vertikal tanpa lib chart; batang terakhir (periode
  terbaru) `primary` + label tebal, sisanya `primarySurface`; scroll horizontal bila banyak.
  Batang flat — tidak pakai gradient (§7).
- Nominal selalu memakai teks `*_formatted` dari backend; hanya selisih yang dihitung klien
  (`formatRupiah`, format sama: `Rp 150.000` / `-Rp 150.000`).

---

## 6. Arketipe layar

| Tipe | Contoh | Struktur |
|---|---|---|
| Auth | Login, ForgotPassword | latar gradient + gunung, konten di tengah vertikal, logo polos (bukan kartu), form, tombol pill |
| Tab home | MemberHome, CommanderHome, HealthOfficerHome | Home header + strip sinkron + section-section + tab bar bawah |
| Stack detail | Profile, CatalogDetail, Settings | Header `[← judul/sub]` + ScrollView berisi kartu/SectionCard |
| List | CatalogList, EmergencyList, Notifications | Header `[← judul/sub]` + (search + filter) + list kartu |
| Form | HealthRecordInput, ChangePassword | Header + field-field + tombol primary di footer yang di-pin |
| Aksi tunggal | Emergency | tanpa header nav, satu elemen fokus di tengah |

---

## 7. Hindari "kesan AI-generated"

Aturan keras — langgar salah satu = desain terasa seperti template AI:

- ❌ **Gradient di mana-mana.** Gradient hanya untuk: latar layar, tombol utama, avatar, tab
  aktif. Kartu, section, teks = flat.
- ❌ **Emoji sebagai ikon.** Selalu ikon stroke dari `Icon`.
- ❌ **Kartu dengan sudut membulat + garis aksen kiri berwarna.** Bukan pola kita.
- ❌ **Font "AI": Inter, Roboto sebagai display, Poppins, Fraunces.** Pakai system font.
- ❌ **Data-slop:** angka/statistik/ikon/progress bar yang tidak berguna hanya untuk "mengisi".
  Setiap elemen harus punya alasan.
- ❌ **Section pengisi.** Jangan menambah section/teks yang tidak diminta. Kalau merasa perlu,
  **tanya user dulu**.
- ❌ **Lorem ipsum / "Selamat datang di aplikasi kami" / copy generik.** Tulis copy spesifik
  konteks kesatuan; fakta yang belum ada → placeholder `[SEPERTI INI]`.
- ❌ **Semua serba tengah, semua kartu seragam ukuran, spacing seragam tanpa hierarki.** Bikin
  hierarki: satu elemen dominan per layar, sisanya jelas subordinat.
- ✅ Ikuti density, shadow, radius, dan pola yang sudah ada di dokumen ini.
- ✅ Kalau ada layar sejenis, **contoh anatominya persis** (jumlah baris, urutan, ikon).

---

## 8. Alur kerja: bikin desain baru yang konsisten

Untuk **user** — lakukan ini tiap minta desain:

1. **Sebutkan layar / komponennya** dan untuk siapa (komandan / anggota / petugas kesehatan).
2. **Lampirkan referensi** kalau punya (screenshot desain lain, dribbble, dsb.). Kalau tidak,
   bilang "ikuti DESIGN_SYSTEM.md" — Claude akan pakai pola di dokumen ini.
3. **Jawab 2 pertanyaan arah** yang Claude ajukan: (a) mockup statis atau prototipe bisa diklik,
   (b) kalau aesthetic masih terbuka, pilih 1 dari 2–4 sketsa arah.
4. **Iterasi di canvas.** Edit langsung di canvas untuk perubahan kecil (geser, ganti teks,
   warna) lalu **Save**; minta Claude untuk perubahan struktural. Claude selalu baca versi
   terakhir sebelum mengubah, jadi editanmu tidak hilang.
5. Kalau ketemu pola baru yang bagus, minta Claude **menambahkannya ke DESIGN_SYSTEM.md** supaya
   konsisten ke depan.

Untuk **Claude** — tiap task desain:
1. Baca `DESIGN_SYSTEM.md` + `src/theme/colors.ts` + layar sejenis yang sudah ada.
2. Kalau ada gambar referensi: ambil nilai spesifik yang terlihat (layout, ukuran, warna khusus)
   dari gambar; sisanya dari dokumen ini.
3. Konfirmasi arah (statis/prototipe; aesthetic bila terbuka).
4. Bangun pakai token & komponen di §1–§5. Tidak ada hex mentah, tidak ada komponen baru diam-diam.
5. Sebutkan di handover apa yang di-match dan apa yang placeholder.
6. Update dokumen ini kalau ada token/komponen baru.
