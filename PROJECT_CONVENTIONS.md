# Konvensi Project React Native

Template konvensi kode untuk project **React Native CLI (bukan Expo) + TypeScript**. Isinya
struktur folder, penamaan file, format CHANGELOG + alur rilis, dan build Android yang otomatis
menyalin APK ke `documentation/`.

Ganti placeholder `<AppName>` (contoh: `SmartBattalion`) sesuai nama project.

---

## 0. Init project baru (instruksi untuk AI)

> Bagian ini untuk AI (Claude Code) yang diminta **membuat project baru** memakai file ini,
> baik lewat perintah "init project pakai PROJECT_CONVENTIONS.md" maupun skill `/init-rn`.
> Kalau file ini hanya dipakai sebagai acuan di project yang sudah ada, lewati §0.

### 0.1 Batasan (WAJIB, berlaku selama init dan sesudahnya)

Tugasnya **hanya membuat project** (file + dependency JS). Hal berikut **DILARANG** kecuali
user menyuruhnya secara eksplisit di chat, dan izin itu hanya berlaku untuk perintah yang
disebut, bukan izin umum untuk seterusnya:

- ❌ **Build apa pun**: `npm run android`, `npm run ios`, `npx react-native run-*`,
  `./gradlew assemble*` / `npm run android-d` / `android-r`, `xcodebuild`.
- ❌ **Menjalankan emulator / simulator** atau menginstal ke device.
- ❌ **Menjalankan Metro**: `npm start`, `npx react-native start`.
- ❌ **`pod install`** (skip saat init dengan `--install-pods false`).
- ❌ **`git commit` / `git push`**. `git init` boleh (bawaan CLI init).

Yang **boleh** tanpa izin: membuat/mengedit file, `npm install` dependency, `npx tsc --noEmit`,
dan `npm run lint` untuk verifikasi.

Setelah selesai, cukup **tuliskan** perintah build/run yang bisa user jalankan sendiri, jangan
dieksekusi.

### 0.2 Tanyakan dulu sebelum membuat apa pun

Pakai tool pertanyaan (AskUserQuestion, maksimal 4 pertanyaan per putaran) dalam 3 putaran.
Untuk jawaban teks bebas (nama, package), beri opsi saran dan biarkan user mengisi "Other",
atau tanyakan langsung di chat.

**Putaran 1: identitas & mode**

1. **Nama app** (display name di bawah ikon launcher), misalnya `Smart Battalion`.
2. **Package name / bundle id**, misalnya `com.perusahaan.namaapp` (huruf kecil, dipisah titik).
3. **Nama folder / project** (PascalCase, tanpa spasi). Default: diturunkan dari nama app.
4. **Mode awal**:
   - *Blank*: kerangka + struktur folder saja, layar placeholder.
   - *Rencana dulu*: AI menyusun daftar fitur, layar, route, dan domain untuk disetujui
     user, baru di-scaffold.

**Putaran 2: arsitektur**

5. **Navigasi**: bottom tab + stack, atau stack saja. Kalau pakai tab: berapa tab dan apa
   namanya, serta tab bar bawaan library atau custom (komponen sendiri lewat prop `tabBar`).
6. **Auth**: ada login atau tidak. Kalau ada: layar Login + guard `RequireAuth`/`RequireGuest`
   + token di redux-persist (whitelist `auth`).
7. **State**: Redux Toolkit + redux-persist, atau state lokal saja.
8. **Backend API**: sudah ada (minta `API_BASE_URL`) / belum (pakai placeholder di `.env`) /
   tidak pakai API.

**Putaran 3: fitur & dokumentasi**

9. **Fitur opsional** (pilih banyak): push notification (Firebase + notifee), maps
   (`react-native-maps`), kamera/QR (`react-native-vision-camera`), lokasi
   (`@react-native-community/geolocation`), animasi (`reanimated` + `moti`), multi-brand.
10. **Versi awal**: `versionName` / `versionCode`. Default `0.1.0` / `1`.
11. **Dokumentasi**: cukup `CHANGELOG.md`, atau sekalian `regen-html.py` + `changelog.html`.

Kalau mode *Rencana dulu*: susun rencananya (fitur → layar → route → domain/service), tampilkan,
lalu **tunggu persetujuan**.

Terakhir, tampilkan **ringkasan semua jawaban** dan tunggu konfirmasi sebelum mulai.

### 0.3 Langkah scaffold

1. **Buat project** (tanpa pod install):
   ```bash
   npx @react-native-community/cli@latest init <Folder> --package-name <package> --title "<Nama App>" --install-pods false
   ```
   Kalau flag `--package-name` / `--title` tidak didukung versi CLI-nya, ubah manual
   (`applicationId` + `namespace` di `android/app/build.gradle`, `app_name` di `strings.xml`).
2. **Install dependency** sesuai jawaban:
   - selalu: `@react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context`;
     dev: `babel-plugin-module-resolver patch-package`
   - bottom tab: `@react-navigation/bottom-tabs`
   - state: `@reduxjs/toolkit react-redux redux-persist @react-native-async-storage/async-storage`
   - API: `axios react-native-config`
   - fitur opsional: sesuai daftar di pertanyaan 9
3. **Struktur & konfigurasi**: folder `src/` sesuai §1, alias `@/` di `tsconfig.json` + `babel.config.js`,
   `theme/colors.ts` + `theme/shadows.ts`, `navigation/paths.ts` (`ROUTES`) + `types.ts` +
   `RootNavigator.tsx` (+ `MainTabNavigator.tsx` kalau pakai tab, satu layar placeholder per tab),
   `store/` (kalau pakai Redux), `services/api/axiosInstance.ts` (kalau pakai API), `.env` + `.env.example`.
   Pakai react-native-config? Tambahkan `apply from: … dotenv.gradle` di `android/app/build.gradle`.
   Tulis `App.tsx` supaya membungkus Provider / PersistGate / NavigationContainer sesuai pilihan.
4. **Gradle**: `versionName` / `versionCode` sesuai jawaban, `outputFileName`, task salin APK (§4.2).
   Scripts `android-c/d/r` + `postinstall` di `package.json` (§4.1). `.gitignore` sesuai §4.3.
5. **Dokumentasi**: `documentation/CHANGELOG.md` dengan `## Belum dirilis` kosong (§5.1). Kalau
   diminta, tambahkan juga `regen-html.py` + `_changelog.template.html` (§5.4).
6. **Salin file ini** (`PROJECT_CONVENTIONS.md`) ke root project baru, dan buat `CLAUDE.md` yang
   berisi commands, arsitektur, dan **batasan §0.1** supaya sesi berikutnya ikut mematuhinya.
7. **Verifikasi** hanya dengan `npx tsc --noEmit` + `npm run lint`. **Jangan build.**
8. **Laporan akhir**: apa saja yang dibuat, dan perintah yang bisa user jalankan sendiri
   (`cd ios && bundle exec pod install`, `npm start`, `npm run android`). Tuliskan saja, jangan
   dijalankan.

---

## 1. Struktur folder

```
<root>/
├── android/                  # native Android (gradle: salin APK otomatis, lihat §4)
├── ios/
├── documentation/            # CHANGELOG + render HTML-nya + drop APK (APK tidak di-commit)
│   ├── CHANGELOG.md
│   ├── changelog.html        # hasil generate, di-commit
│   ├── _changelog.template.html
│   └── regen-html.py
├── patches/                  # patch-package (dipasang lewat script postinstall)
├── src/
│   ├── assets/               # gambar, logo, suara, per jenis: assets/logo/, assets/sound/
│   ├── components/           # UI generik, atomic design (lihat §2)
│   │   ├── atoms/
│   │   ├── molecules/
│   │   ├── organisms/
│   │   └── templates/
│   ├── contexts/             # React Context (sedikit saja, state utama di Redux)
│   ├── hooks/                # custom hooks: useXxx.ts
│   ├── navigation/           # navigator, route names, param types, guard
│   ├── screens/              # satu folder per route (setara "page" di web)
│   ├── services/
│   │   └── api/              # axiosInstance.ts + <domain>.service.ts
│   ├── store/
│   │   ├── index.ts          # configureStore + redux-persist
│   │   ├── hooks.ts          # useAppDispatch / useAppSelector
│   │   ├── middleware/
│   │   └── slices/           # <domain>Slice.ts
│   ├── theme/                # colors.ts, shadows.ts (design token)
│   ├── types/                # <domain>.types.ts + index.ts (barrel)
│   └── utils/                # helper murni: format.ts, location.ts, …
│       └── __tests__/
├── .env / .env.example       # react-native-config (.env di-gitignore)
├── CLAUDE.md                 # onboarding doc untuk sesi AI, wajib ikut di-update
└── PROJECT_CONVENTIONS.md    # dokumen ini
```

### Aturan dasar

- **Satu domain, satu file per lapisan.** Fitur "pengumuman" misalnya:
  `types/announcement.types.ts` → `services/api/announcement.service.ts` →
  `store/slices/announcementSlice.ts` (kalau perlu state global) → `screens/Announcements/`.
- **Redux slice hanya kalau state dipakai lintas layar** (auth, badge notifikasi). Fitur yang
  alurnya tertutup di beberapa layar cukup pakai state lokal per layar + panggil service langsung.
- **redux-persist pakai whitelist**, biasanya hanya `auth`. Data lain selalu di-fetch ulang.
- `utils/` berisi fungsi murni tanpa JSX. Kalau butuh JSX atau state React, pindahkan ke
  `hooks/` atau `components/`.

### Path alias `@/`

Semua import internal pakai `@/…`, jangan pernah `../../../`. Alias ini harus dideklarasikan di
**dua tempat** yang isinya selalu sama:

```jsonc
// tsconfig.json
"compilerOptions": { "paths": { "@/*": ["./src/*"] } }
```

```js
// babel.config.js
plugins: [
  ['module-resolver', { root: ['.'], alias: { '@': './src' },
    extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json', '.ts', '.tsx'] }],
  'react-native-reanimated/plugin', // kalau dipakai: WAJIB paling akhir
],
```

---

## 2. Komponen: atomic design

Setiap komponen berupa **folder berisi satu `index.tsx`**, tidak pernah file datar `Name.tsx`.

| Lapisan | Isi | Contoh |
|---|---|---|
| `atoms/` | elemen terkecil, tanpa komposisi komponen lain | `Button`, `Badge`, `Icon`, `PressableScale` |
| `molecules/` | gabungan beberapa atom | `SearchFilterBar`, `DateTimeField`, `InfoRow` |
| `organisms/` | blok UI besar, boleh berisi state UI | `StatusModal`, `FilterSheet`, `BottomSheet` |
| `templates/` | kerangka layout layar | `MainLayout`, `AuthLayout` |

- Semua isi `components/` **generik**: tidak ada fetch data dan tidak ada logika bisnis.
- `screens/<NamaLayar>/index.tsx` = satu route. Sub-folder
  `screens/<NamaLayar>/<Bagian>/index.tsx` hanya untuk potongan UI yang **tidak** dipakai di
  luar layar tersebut. Kalau nanti dipakai di dua tempat, pindahkan ke `components/`.

### Pola wajib di dalam komponen

```tsx
import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';

export type ButtonVariant = 'primary' | 'danger';

export interface ButtonProps extends PressableProps {   // 1. props = named export interface
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, ViewStyle> = { // 2. varian = union + Record, bukan if/switch
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.danger },
};

export default function Button({ variant = 'primary', style, ...rest }: ButtonProps) { // 3. default export
  return <Pressable style={[styles.base, variantStyles[variant], style]} {...rest} />; // 4. style array
}

const styles = StyleSheet.create({                         // 5. StyleSheet di bawah file
  base: { borderRadius: 12, paddingVertical: 14 },
});
```

- Warna **selalu** dari `theme/colors.ts`, tidak pernah hex inline. Butuh warna baru? Tambahkan
  token di sana. Shadow juga begitu: preset di `theme/shadows.ts`, lalu di-spread.
- Semua yang bisa di-tap memakai satu primitive bersama (`atoms/PressableScale`), bukan
  `TouchableOpacity` atau boilerplate press-scale yang ditulis ulang di tiap tempat.
- Preset animasi dikumpulkan di `utils/motion.ts` dan tidak ditulis inline.
- Feedback sukses/gagal memakai modal komponen sendiri (`organisms/StatusModal`), bukan
  `Alert.alert`, supaya tampilannya konsisten.
- Komponen yang meneruskan ref: `forwardRef<ComponentRef<typeof Pressable>, Props>(…)`.

---

## 3. Penamaan file

| Jenis | Pola | Contoh |
|---|---|---|
| Komponen | `PascalCase/index.tsx` | `atoms/GradientButton/index.tsx` |
| Layar | `screens/PascalCase/index.tsx`, prefix domain supaya berkelompok | `RollCallList`, `RollCallDetail`, `RollCallCreate` |
| Service API | `camelCase.service.ts` | `announcement.service.ts` |
| Fungsi service | `<aksi><Resource>Api` | `getAnnouncementsApi`, `createRollCallApi` |
| Tipe | `camelCase.types.ts` + barrel `types/index.ts` | `rollCall.types.ts` |
| Redux slice | `camelCaseSlice.ts` | `notificationSlice.ts` |
| Hook | `useXxx.ts` | `useKeyboardHeight.ts` |
| Util | `camelCase.ts` (per topik) | `format.ts`, `location.ts` |
| Test | `__tests__/<nama>.test.ts` di sebelah kodenya | `utils/__tests__/releaseNotes.test.ts` |

### Navigasi

- `navigation/paths.ts`: `ROUTES` jadi satu-satunya sumber nama route (stack **dan** tab).
  Jangan ada string route yang ditulis langsung di layar.
- `navigation/types.ts`: `RootStackParamList`, `MainTabParamList`, dan helper
  `RootStackScreenProps<'X'>`.
- Menambah layar selalu menyentuh 4 tempat: `ROUTES` → `RootStackParamList` →
  `RootNavigator` → folder `screens/<Nama>/`.

### Tipe

Import tipe dari barrel `@/types`, bukan dari file satuannya. Tipe hanya berisi field yang
**benar-benar ada** di response API, tanpa field spekulatif.

---

## 4. Build otomatis ke `documentation/`

Setiap kali `assembleDebug` / `assembleRelease` selesai, APK langsung disalin ke
`documentation/` dengan nama yang memuat versi. APK tersebut **tidak di-commit**.

### 4.1 `package.json` scripts

```json
"android-c": "cd android/ && ./gradlew clean && cd ../",
"android-d": "cd android/ && ./gradlew assembleDebug --warning-mode all && cd ../",
"android-r": "cd android/ && ./gradlew assembleRelease && cd ../",
"postinstall": "patch-package"
```

### 4.2 `android/app/build.gradle`

Di dalam blok `android { … }`, beri nama file APK yang jelas:

```groovy
android {
    defaultConfig {
        versionCode 1          // naik +1 tiap rilis
        versionName "0.1.0"    // semver
    }

    applicationVariants.all { variant ->
        variant.outputs.all { output ->
            outputFileName = "<AppName>-v${variant.versionName}(${variant.versionCode})-${variant.buildType.name}.apk"
        }
    }
}
```

Di luar blok `android { … }`, tambahkan task salin + hook `finalizedBy`:

```groovy
/**
 * Setiap kali assembleDebug/assembleRelease selesai, salin APK-nya ke documentation/
 * di root repo. File .apk di-gitignore; yang di-commit hanya CHANGELOG.md/.html.
 */
def changelogDir = new File(rootProject.projectDir.parentFile, "documentation")

["debug", "release"].each { variantName ->
    tasks.register("copy${variantName.capitalize()}ApkToChangelog", Copy) {
        from(layout.buildDirectory.dir("outputs/apk/${variantName}")) {
            include "*.apk"
        }
        into changelogDir
    }
}

tasks.configureEach { task ->
    if (task.name == "assembleDebug")   task.finalizedBy("copyDebugApkToChangelog")
    if (task.name == "assembleRelease") task.finalizedBy("copyReleaseApkToChangelog")
}
```

> `rootProject.projectDir` = folder `android/`, jadi `.parentFile` = root repo.

### 4.3 `.gitignore`

```gitignore
# APK yang otomatis disalin ke documentation/ oleh assembleDebug/Release
documentation/*.apk
documentation/output-metadata.json
```

---

## 5. CHANGELOG & alur rilis

### 5.1 Format `documentation/CHANGELOG.md`

```markdown
# Changelog — <AppName>

Semua perubahan penting dicatat di sini. Rilis terbaru di atas.

- **Baru**: fitur / layar / kemampuan yang sebelumnya tidak ada.
- **Ditingkatkan**: sesuatu yang sudah ada dibuat lebih baik (tampilan, performa, alur).
- **Perbaikan**: bug yang diperbaiki.

Kategori tanpa isi boleh dihilangkan.

---

## Belum dirilis

### Baru

- Layar X: bisa melakukan Y.

## v0.2.0 (versionCode 2)

_2026-09-23_

### Ditingkatkan

- Layar Home: ….

### Perbaikan

- Nama di header sempat tertulis "N/A" setelah ….
```

Aturan:

- Heading rilis ditulis **`## v<versionName> (versionCode N)`**, tanggal di baris berikutnya
  dalam format `_…_`, lalu `### Baru` / `### Ditingkatkan` / `### Perbaikan`.
- Bullet ditulis dari sudut pandang **pengguna** (apa yang berubah bagi mereka), bukan nama
  file. Nama layar boleh disebut di awal: "Peta Personel: …".
- Bullet yang panjang boleh dipecah ke beberapa baris dengan indentasi 2 spasi.
- **Batas panjang per rilis**: teks rilis versi polos (judul + nama kategori + bullet, markdown
  dibuang) harus **< 1500 karakter**, supaya muat saat ditempel ke catatan rilis Play Store,
  chat, dan sejenisnya. Lebih dari itu, ringkas bulletnya.

### 5.2 Setiap kali mendaratkan perubahan

Perubahan yang **terlihat oleh pengguna** langsung ditambahkan satu bullet di bawah
`## Belum dirilis` **di commit yang sama**. Refactor internal, perubahan dokumentasi, dan
tooling tidak perlu dicatat.

### 5.3 Saat rilis

1. Ubah `## Belum dirilis` menjadi `## v<next> (versionCode N)`, tambahkan tanggal `_YYYY-MM-DD_`,
   lalu buat `## Belum dirilis` baru yang kosong di atasnya.
2. Naikkan `versionName` + `versionCode` di `android/app/build.gradle`. Kenaikan ini **hanya di
   commit rilis**, jangan sebelumnya, karena build debug harus tetap melaporkan versi yang sedang
   beredar (penting kalau ada pengecekan force-update dari server).
3. Jalankan `python3 documentation/regen-html.py` untuk merender `changelog.html`.
4. Jalankan `npm run android-r`. APK `…-release.apk` otomatis masuk ke `documentation/`.
5. Commit dengan pesan `release: v<versi> (versionCode N)`, lalu **git tag `v<versi>`**.

Tag inilah batas resmi isi sebuah rilis. Untuk menyusun atau memeriksa catatan rilis berikutnya:

```bash
git log --first-parent --oneline v0.2.0..HEAD
```

### 5.4 Render HTML (opsional tapi disarankan)

`documentation/regen-html.py` mengubah `CHANGELOG.md` menjadi `changelog.html` yang
self-contained: markdown ikut di-inline, tiap rilis tampil sebagai kartu dengan tombol **Salin**,
dan ada bar "rilis terbaru" berisi nama APK. Kerangka minimalnya:

```python
#!/usr/bin/env python3
import pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
CHANGELOG = HERE / "CHANGELOG.md"
TEMPLATE = HERE / "_changelog.template.html"   # HTML + JS yang parse markdown di browser
OUT = HERE / "changelog.html"
GRADLE = ROOT / "android" / "app" / "build.gradle"
LIMIT = 1500

def apk_name():
    g = GRADLE.read_text(encoding="utf-8")
    vn = re.search(r'versionName\s+"([^"]+)"', g).group(1)
    vc = re.search(r"versionCode\s+(\d+)", g).group(1)
    return f"<AppName>-v{vn}({vc})-release.apk"

def guard_length(md):
    """Tolak build kalau teks polos satu rilis >= LIMIT karakter.
    Harus mereplikasi persis fungsi copy di template (judul + kategori + bullet)."""
    ...  # parse "## " rilis → "### " kategori → "- " bullet, hitung, raise SystemExit kalau lewat

md = CHANGELOG.read_text(encoding="utf-8")
guard_length(md)
OUT.write_text(
    TEMPLATE.read_text(encoding="utf-8")
        .replace("@@APK_NAME@@", apk_name())
        .replace("@@DOC@@", md),
    encoding="utf-8",
)
print(f"wrote {OUT.relative_to(ROOT)}")
```

Implementasi lengkapnya (termasuk template HTML + fungsi `copyTextFor()`) ada di folder `assets/` skill `/init-rn` (`~/.claude/skills/init-rn/assets/`), atau bisa disalin dari
project SmartBattalion: `documentation/regen-html.py` (bagian changelog saja) dan
`documentation/_changelog.template.html`.

---

## 6. Checklist project baru

- [ ] Buat struktur `src/` sesuai §1 dan pasang alias `@/` di `tsconfig.json` **dan** `babel.config.js`.
- [ ] Buat `theme/colors.ts` + `theme/shadows.ts` sebelum komponen pertama.
- [ ] Buat `navigation/paths.ts` (`ROUTES`) + `navigation/types.ts`.
- [ ] Buat `services/api/axiosInstance.ts` (baseURL dari `.env`, interceptor token).
- [ ] Buat `store/index.ts` (persist whitelist `auth`) + `store/hooks.ts`.
- [ ] Tambahkan `outputFileName` + task salin APK di `android/app/build.gradle` (§4.2).
- [ ] Tambahkan `documentation/*.apk` ke `.gitignore`.
- [ ] Buat `documentation/CHANGELOG.md` dengan `## Belum dirilis` kosong.
- [ ] (Opsional) Salin `regen-html.py` + `_changelog.template.html`.
- [ ] Tambahkan scripts `android-c` / `android-d` / `android-r` di `package.json`.
- [ ] Buat `CLAUDE.md` dan update setiap kali ada fitur, layar, atau konvensi baru.
