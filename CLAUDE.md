# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Keep this file up to date.** Whenever a new feature, screen, domain slice, or convention is added to the
> codebase, update the relevant section below in the same change. This file is the primary onboarding doc for
> future Claude Code sessions working in this repo.

## Commands

```bash
# Install JS deps
npm install

# iOS native deps (run after any native dependency change)
bundle install               # first time only, installs CocoaPods itself via Ruby bundler
cd ios && bundle exec pod install && cd ..

# Start Metro bundler
npm start

# Run on simulator/emulator
npm run ios
npm run android

# Lint
npm run lint

# Type-check (no dedicated script — run directly)
npx tsc --noEmit

# Tests
npm test                     # jest, run all
npx jest path/to/file.test.tsx   # run a single test file
npx jest -t "test name"          # run tests matching a name

# Android native rebuild helpers
npm run android-c            # gradle clean
npm run android-d            # assemble debug APK
npm run android-r            # assemble release APK
#   ↳ both `assembleDebug` and `assembleRelease` are finalizedBy a copy task
#     (`copyDebugApkToChangelog` / `copyReleaseApkToChangelog`, android/app/build.gradle):
#     the built APK is auto-copied to `documentation/`. The .apk is gitignored
#     (`documentation/*.apk`) and vercelignored. For a release build, add a new entry to
#     `documentation/CHANGELOG.md` (sections: Baru / Ditingkatkan / Perbaikan, Claude-changelog
#     style) and run `python3 documentation/regen-html.py` to rebuild `changelog.html`.
```

Whenever a native dependency is added/removed/updated, you must run `pod install` for iOS (Android autolinks via
Gradle automatically, but check `android/app/build.gradle` / `MainApplication` if a library needs manual linking).

Native deps with no extra wiring (autolinked): `react-native-blob-util` (health-attachment downloads),
`@react-native-community/datetimepicker` (native date/time picker — `src/components/molecules/DateTimeField`,
used by `HealthRecordInput`) — both under "Health module" below — and `@react-native-documents/picker`
(pilih lampiran — `src/utils/filePicker.ts`, dipakai modul "Disposisi Surat"). Note: `bundle exec pod install` on this
machine needs `LANG=en_US.UTF-8` set, and
currently fails on a `FirebaseCoreInternal`/`GoogleUtilities` static-Swift-lib error — iOS Pods need that
resolved separately; Android (the primary test target) is unaffected and picks blob-util up on the next
`npm run android`.

Changing `.env` requires a full native rebuild (`npm run ios` / `npm run android`), not just a JS reload —
`react-native-config` bakes env values into the native build.

## Architecture

Bare React Native CLI app (not Expo) — TypeScript strict-ish (`noUnusedLocals`, `noUnusedParameters`,
`verbatimModuleSyntax` all on in `tsconfig.json`). Styling is plain RN `StyleSheet` (no Tailwind/NativeWind —
deliberately removed, see below), state is Redux Toolkit + redux-persist, navigation is React Navigation
(native-stack + bottom-tabs). The app is **light mode only** — there is no dark theme and no runtime toggle.

### Path alias

`@/*` → `./src/*`, declared in **both** `tsconfig.json` (`compilerOptions.paths`) and `babel.config.js`
(`babel-plugin-module-resolver`) — keep these two in sync. All internal imports use `@/...`, never deep
relative paths (`../../../`).

### Babel plugin order matters

`babel.config.js` plugins array: `module-resolver` must come before `react-native-reanimated/plugin`, and the
reanimated plugin **must stay last** in the array (Reanimated's own requirement). Reanimated v4 requires the
`react-native-worklets` peer package; `react-native-reanimated/plugin` just re-exports
`react-native-worklets/plugin`, so the babel config still references `react-native-reanimated/plugin`.

### Styling / theming (plain StyleSheet, light-only)

**`DESIGN_SYSTEM.md` (repo root) is the visual source of truth** — read it (plus `src/theme/colors.ts`)
before creating or changing any screen/component or making a `/design` canvas. It holds the colour/shadow/
radius/typography tokens, the component anatomy (header, cards, buttons, badges, list rows, tab bars, …),
the screen archetypes, and the "avoid AI-slop" rules. It also documents a softer "canvas theme" (gradient
backgrounds, blue-tinted shadows, pill controls, icon-chips) used in the design mockups — treat that as the
intended visual direction and, when implementing it in code, add the new values as tokens in
`src/theme/colors.ts` (never inline hex). Keep `DESIGN_SYSTEM.md` updated whenever a new token or component
pattern is introduced.

NativeWind v4 + Tailwind were tried first and removed: `vars()`'s CSS-variable trick combined with reanimated
v4/moti's `MotiView` intersected badly and produced a hard-to-diagnose silent blank screen (no redbox) once
`ThemeContext` wrapped the tree with `View style={themes[theme]}`. Rather than fight the interaction, the app
uses plain RN `StyleSheet.create()` everywhere and a single hardcoded light palette.

- `src/theme/colors.ts` — the single source of truth: `export const colors = { background, surface, border,
  text, textMuted, primary, primaryForeground, danger, dangerForeground }` as raw hex, light palette only
  (near-white `background` `#F5F6F8`, white `surface` cards, blue `primary`). Non-Auth screens sit on
  a near-white `pageGradient*` backdrop (`atoms/ScreenBackground`, no blobs); the Auth screens keep the
  lavender `authGradient*` + mountains — see DESIGN_SYSTEM.md §1b "revisi latar 2026-09-01".
- `src/contexts/ThemeContext.tsx` — trivial: provides `{ colors }` via context with no light/dark switching
  logic. Kept as a context (rather than a bare import) mainly so a future light-mode/theming pass has a single
  seam to extend, but nothing in the current app reads it dynamically — components import `colors` directly
  from `@/theme/colors` in practice.
- Every component/screen defines its own `const styles = StyleSheet.create({...})` at the bottom of the file,
  importing `colors` for any color value. Never hardcode a hex literal in a component — add a new token to
  `theme/colors.ts` instead.
- `src/theme/shadows.ts` — named blue-tinted shadow presets (`cardShadow`, `cardShadowRaised`,
  `ctaPrimaryShadow`, `ctaDangerShadow`, `smallButtonShadow`, `tabBarShadow`). Spread these into style
  objects instead of writing `shadow*`/`elevation` inline. Shadow colour is never pure black (except `overlay`).
- **"Canvas theme" (DESIGN_SYSTEM.md §1b)** is now live on the Auth screens **and the whole Komandan group**
  (CommanderHome, CatalogList, CatalogDetail, PersonnelTracking, PersonnelMap, SendAnnouncement, AlarmSatuan,
  EmergencyList) + all three role Homes + the bottom tab bar + the **"Semua Peran" group** (Emergency,
  Notifications, Profile, Settings, ComingSoon — all `MainLayout variant="canvas"` + `subtitle`). Shared pieces: `atoms/ScreenBackground` (gradient
  backdrop for non-Auth screens), `templates/MainLayout` `variant="canvas"` + `subtitle` (borderless big-title
  header on the gradient — default `variant` is still `'plain'`), `molecules/SearchFilterBar`,
  `atoms/GradientAvatar`. `molecules/Card` / `atoms/Badge` / `InfoRow` / `SectionCard` / `StatCard` /
  `QuickActionButton` were migrated in place (softer `borderSoft`, blue shadow) so they carry the look
  everywhere. `atoms/Badge` now has `warning` + `danger` variants.
- `metro.config.js` wires `react-native-svg-transformer` (SVGs are imported as components, not treated as
  static assets) and an `extraNodeModules` alias for `@` matching the babel/tsconfig alias. No CSS/Tailwind
  processing step exists in the Metro config.
### App branding (multi-brand)

Since 2026-09-22 this codebase ships **more than one branded app** from the same source — currently
`sakaraguna` (the original, orange-flame mark) and `cigra` (the military-eagle-crest mark for the Cigra
battalion client), with more expected later. A single `.env` var, **`BRAND`**, drives everything that
differs per brand — switching brand is meant to be "edit `.env`'s `BRAND` + full native rebuild", nothing
else, for a brand that has already been onboarded once. Defaults to `sakaraguna` wherever a fallback is
needed (missing `.env` value).

- **`applicationId`** (`android/app/build.gradle`) — `"com.${smartBattalionBrand}.smartbattalion"`, where
  `smartBattalionBrand = (project.env.BRAND ?: "sakaraguna")`. `project.env` is populated by
  `react-native-config`'s `dotenv.gradle` (applied a few lines above, so it runs before `defaultConfig` is
  evaluated) — this is the same mechanism that already turns every `.env` key into a Kotlin `BuildConfig`
  field + Android string resource (`@string/MAPS_API_KEY` etc.), just read directly here instead. **`namespace`
  stays hardcoded** (`com.cigrasmartbattalionapps`) — it's the Kotlin/Java package for the generated `R` class,
  a different concept from `applicationId` (the OS/Play-Store-facing identity), and keeping it fixed means the
  Kotlin sources under `android/app/src/main/java/com/cigrasmartbattalionapps/` never need to move when the
  brand changes. Because `applicationId` changes per brand, each brand installs as a **genuinely separate
  Android app** — different brands can be installed side by side on the same test device, but each also needs
  its own Play Console listing and (for a real release) its own signing keystore.
- **`google-services.json` (Firebase/FCM) per brand** — the real file is never committed (it holds
  credentials — see `.gitignore`). It's kept per-brand as `android/app/google-services-<brand>.json` (also
  gitignored), and the same `build.gradle` block copies whichever one matches `smartBattalionBrand` into
  `android/app/google-services.json` (the fixed name the `com.google.gms.google-services` plugin looks for)
  before the existing `if (file("google-services.json").exists()) { apply plugin: ... }` check runs. If the
  active brand has no matching file yet (a brand not yet registered in Firebase Console), the stale
  `google-services.json` is deleted and a Gradle warning is logged — the build stays green, just without
  push notifications for that brand, exactly like the pre-multi-brand "no Firebase configured yet" state.
  **Getting a real file for a brand is a manual step** (Firebase Console → add Android app with package name
  `com.<brand>.smartbattalion` → download `google-services.json` → save as `google-services-<brand>.json`) —
  nothing here can fabricate one. `android/app/google-services-legacy-com.cigrasmartbattalionapps.json` is a
  kept-for-reference copy of the file that existed before this system (registered under the old
  `com.cigrasmartbattalionapps` applicationId, which no longer matches either current brand's applicationId —
  **`sakaraguna` currently has no valid `google-services-sakaraguna.json`, so FCM is inactive on it until
  someone registers it in Firebase Console**).
- **Launcher icon + native splash icon per brand** — source of truth is `android/app/brand-icons/<brand>/`,
  which **mirrors the `src/main/res/` subtree** (small PNGs, unlike the Firebase file these ARE committed):
  `mipmap-*/ic_launcher*.png` (launcher icon, 5 density buckets, `ic_launcher.png` and `_round` identical)
  and `drawable-nodpi/splash_logo.png` (the native splash screen icon — see below). The same
  `build.gradle` block does a generic `copy { from(brandIconsDir); into("src/main/res") }` before the
  build, when that brand's folder exists — else `src/main/res/**` is left as whatever the last build (of
  any brand) put there. Because it's a plain recursive copy mirroring `res/`, **any other brand-specific
  native resource** (e.g. a future per-brand notification icon) just needs its file added under the same
  relative path in `brand-icons/<brand>/` — no Gradle changes required. No adaptive-icon XML
  (`mipmap-anydpi-v26`, foreground/background layers) exists in this project — just flat
  `ic_launcher.png`/`ic_launcher_round.png` per density bucket.
  - `brand-icons/sakaraguna/` — populated from what was already in `src/main/res/` (the flame mark) before
    multi-brand existed.
  - `brand-icons/cigra/` — generated 2026-09-22 from `LogoCigra.png` (`sips` for the 5 mipmap sizes; a
    Pillow script for `splash_logo.png`, center-cropped to its alpha bbox then padded to match
    sakaraguna's exact canvas/content-size ratio — 450×450 canvas, ~200×200 visible content, 125px margin
    each side — so the two brands' splash icons render at the same visual size).
  - **Native splash screen** (`android/app/src/main/res/values/styles.xml` `windowSplashScreenAnimatedIcon`
    for Android 12+, and `drawable/splash_screen.xml` as the `windowBackground` fallback for API<31) both
    point at the **single static** `@drawable/splash_logo` — this is what a cold app launch shows during
    Metro's "Bundling X%…" screen, *before* any JS (and thus before `Config.BRAND`) is reachable, so it
    can only be made brand-correct by baking a different file in at **build time** via the brand-icons
    copy above, never by JS-side logic. Forgetting to add `drawable-nodpi/splash_logo.png` to a new
    brand's `brand-icons/<brand>/` folder is the easy way to reintroduce "wrong logo during bundling" —
    check this specifically when onboarding a brand, since the mipmap launcher icon can silently be
    correct while the splash is still wrong (they're independent files, both need populating).
- **In-app logo (`src/assets/logo/`)** — `index.ts` exports `LogoIcon` via a lookup keyed by
  `Config.BRAND` (`react-native-config`): `{ sakaraguna: require('./LogoSakaraguna.png'), cigra:
  require('./LogoCigra.png') }`, falling back to `sakaraguna`. Adding a brand = adding one entry here; no
  caller (`HomeHeader`, `AcademyHeader`, `NavBar`, `Login`, `AppBootstrap`) needs touching. The chrome around
  the logo (plain enlarged `<Image>`, no card/shadow — see `DESIGN_SYSTEM.md` §5.2) is deliberately the same
  for every brand, not brand-switched.
- **App display name (`APP_NAME` in `.env`)** — the string shown under the launcher icon and in recents.
  `android/app/src/main/res/values/strings.xml` no longer defines `app_name` at all; `AndroidManifest.xml`'s
  two `android:label` attributes point at `@string/APP_NAME` instead, which — like every other `.env` key —
  is auto-generated as an Android string resource by `dotenv.gradle`'s `resValue` loop (the same mechanism
  `MAPS_API_KEY` already relied on). **Not derived from `BRAND`** — set it manually alongside `BRAND` when
  switching (`sakaraguna` → `"SAKARAGUNA SMART BATTALION"`, `cigra` → `"CIGRA SMART BATTALION"`).
- **Not yet brand-aware**: `API_BASE_URL`/`MAPS_API_KEY` (still whatever plain values are in `.env` — nothing
  stops these from *also* varying with `BRAND`, but nothing makes that automatic either, so double-check
  they're right for the active brand after switching), and iOS entirely (bundle identifier +
  `GoogleService-Info.plist` + app icon + display name are still hardcoded to
  `com.cigrasmartbattalionapps`/the single icon set in the Xcode project — lower priority since iOS isn't the
  active test target, see the `pod install` note above).

### Navigation

- `src/navigation/paths.ts` — `ROUTES` is the single source of truth for every route name (stack **and** tab).
- `src/navigation/types.ts` — `RootStackParamList` (stack: Login, ForgotPassword, ChangePassword, AppBootstrap, Main,
  CatalogList, CatalogDetail, Profile, EditProfile, Settings, ComingSoon, PersonnelMap, PersonnelTracking, Notifications,
  EmergencyList, EmergencyDetail, EmergencyContacts, Announcements, MyMovements, ActivityMovements, SendAnnouncement, AlarmSatuan, HealthDashboard, HealthPersonnelSearch,
  HealthPersonnelProfile, HealthRecordInput, HealthRecordDetail, HealthMyHistory, RollCallList, RollCallCreate,
  RollCallDetail, RollCallSearch, RollCallScan, RollCallEntry, Patrol, PatrolRouteDetail,
  PatrolActive, PatrolScan, PatrolPhoto, PatrolMonitoring, PatrolMonitoringDetail, BukuSakuDetail, AcademyRoot,
  AcademyProgramDetail, AcademyMaterial, AcademyAssessmentIntro, AcademyAttempt,
  AcademyAttemptResult, AcademyPracticalEntry, AcademyResults, AcademyResultDetail, AcademyCompetencies,
  AcademyCompetencyDetail, AcademyInsProgramDetail, AcademyInsVerificationDetail, AcademyCmdAttention,
  AcademyCmdProgramDetail, AcademyCmdCompetency) and
  `MainTabParamList` (tabs: Home, Riwayat, Emergency, BukuSaku, Academy),
  plus typed prop helpers (`RootStackScreenProps`, `MainTabScreenProps`).
- `src/navigation/RootNavigator.tsx` — top-level native-stack. `Login` and `ForgotPassword` are guest-only
  (wrapped in `RequireGuest`); `ChangePassword` and `Main` (renders `MainTabNavigator`) are auth-only
  (`RequireAuth` — see the forced-password-change note below for why `ChangePassword` passes
  `skipPasswordChangeGate`); `CatalogList`, `CatalogDetail`, `Profile`, `EditProfile`, `Settings`, `ComingSoon`, and
  `PersonnelMap`, `PersonnelTracking`, `Notifications`, `Announcements`, `MyMovements`, `ActivityMovements`, `EmergencyList`, `EmergencyDetail` are plain stack screens with no guard
  (reachable from within the tab navigator via a composite nav type — see the `Home`/`Profile` pattern below).
  `Settings` is a **root-stack** screen (not a tab),
  reached from the gear icon in `Profile`'s `MainLayout` header (`right` prop). The 5th tab is `Academy`
  (route `ROUTES.academy`, icon `'academy'` graduation-cap) — its `Tab.Screen` has a
  `listeners={{ tabPress: e => { e.preventDefault(); navigation.dispatch(CommonActions.navigate(
  ROUTES.academyRoot)); } }}` (canonical "tab opens another screen"). `src/screens/Academy/index.tsx` is
  an empty `<View/>` stub for the tab slot — never shown. See "Smart Academy" below.
- **Smart Academy** (`src/screens/Academy/*`) — modul belajar / ujian / monitoring, dari
  `smart-academy-mobile-brief-2.md` + endpoint `/api/academy/*` (canvas "Academy v2"). Light-mode &
  administratif per `DESIGN_SYSTEM.md` (bukan gaya dark-hero Academy lama — **modul Academy TKD/Psikologi/
  Jasmani/Riwayat + nested bottom-tab lama dihapus total 2026-09-09**). Pola RollCall/Patrol/Disposisi:
  **tanpa Redux slice**, state lokal per layar.
  - **Entry**: tab "Academy" bar utama → `academyRoot` (plain root-stack, no guard) yang me-render
    **`src/navigation/AcademyTabNavigator.tsx`** — `createBottomTabNavigator` yang **set tab-nya
    menyesuaikan peran** (`academyPovFor(user.roles)` di `src/screens/Academy/shared/roles.ts`):
    - Anggota → **Home · Program Saya · Hasil · Kemampuan**
    - Instruktur (`academy_instructor`) → **Home · Program Saya · Verifikasi**
    - Komandan (`komandan`) → **Overview · Program**
    (Tab "Penilaian" instruktur & "Anggota" komandan **dihapus 2026-09-10** — kontrak backend
    tidak punya endpoint daftar peserta per program; instruktur menilai lewat antrean Verifikasi.)
    Nama role instruktur = **`academy_instructor`** (`shared/roles.ts` `ACADEMY_INSTRUCTOR_ROLE` —
    dikonfirmasi ke tim backend, versi Inggris dari "instruktur_akademik"). Chrome tetap
    `src/screens/Academy/AcademyHeader` (logo + "Smart Academy" + subtitle peran + avatar → Profile,
    tanpa back). Bar bawah `src/navigation/AcademyTabBar.tsx` — style **identik `CustomTabBar`**
    (§5.10) tapi 2–4 item setara tanpa tombol Emergency. `AcademyTabParamList` di `navigation/types.ts`
    (`academyRoot` param = `NavigatorScreenParams<AcademyTabParamList>` untuk nested-navigate). Keluar
    Academy = back Android dari tab pertama (pop `academyRoot` → Main; bottom-tabs bawa balik ke tab
    pertama dulu dari tab lain).
  - **Tab "Program"** dipakai 3 POV (`my` / `instructor` / `commander`) lewat satu komponen
    `AcademyProgramsTab` `{pov}` — `GET /academy/programs?type=…`. Kartu membuka detail program per POV
    (read-only untuk instruktur & komandan). POV Anggota: kartu `ProgramCard` + filter status peserta
    di klien.
  - **Layar TAB** (`AcademyMemberHome` / `InstructorHome` / `CommanderOverview` / `AcademyProgramsTab` /
    `AcademyResults` / `AcademyCompetencies` / `AcademyInsVerifications`) pakai scaffold
    **`shared/AcademyTabScreen`** (TANPA header — chrome disediakan navigator; ScrollView + state
    loading/error/refresh, `paddingBottom` besar untuk tab bar). Navigasi via
    `useNavigation<AcademyTabNav>()` (`shared/types.ts` — composite tab + root-stack).
  - **Layar DETAIL / stack** (ProgramDetail, Material, Attempt, Result, PracticalEntry, Ins*, Cmd*,
    CompetencyDetail, ResultDetail — di-push di atas tab) pakai scaffold **`shared/AcademyScreen`**
    (`MainLayout variant="canvas"` + header `[← judul]` + footer pinned). `shared/ProgramCard` =
    kartu program POV Anggota.
  - **Tipe / service / helper**: `src/types/academy.types.ts` (barrel — **hanya field yang benar-benar
    ada di response**, tak ada field spekulatif), `src/services/api/academy.service.ts` (satu fungsi per
    endpoint kontrak; `normalizeMeta` gaya disposition), `src/utils/academy.ts` (`programStatusBadge` /
    `resultStatusBadge` / `verificationStatusBadge` / `competencyStatusBadge` / `componentStatusBadge` /
    `attemptRemainingSeconds` (basis `server_time`, bukan jam device) / `formatCountdown` / `formatScore` /
    `formatPercent` / `daysUntilLabel`).
  - **Endpoint = persis kontrak backend (dikonfirmasi 2026-09-09), diselaraskan ke kode 2026-09-10.**
    Daftar lengkap di header `academy.service.ts`. **Tidak ada** endpoint daftar peserta per program
    atau drilldown personel komandan → layar/tab terkait dihapus. `POST /academy/instructor/practical-results`
    ada di kontrak & di service (`submitAcademyInstructorScoreApi`) tapi **belum dipakai layar** (tak ada
    pencarian personel di modul academy).
  - **Layar Anggota**: AcademyMemberHome (`/academy/me/summary` `member`) · AcademyProgramsTab `{pov:'my'}` ·
    AcademyProgramDetail (kurikulum timeline; centang & progress dari `components[].is_completed`, badge
    kaya dari `components[].status`; **tak ada lock/prasyarat**; komponen → Materi/Assessment/Praktik) ·
    AcademyMaterial (`GET /academy/materials/{id}`; `content` HTML via `RichTextContent` + kartu tautan
    **menampilkan URL** bila ada `file_url` / `external_url`; "Tandai Sudah Dipelajari" →
    `POST /academy/materials/{id}/complete`) · AcademyAssessmentIntro (`GET /academy/assessments/{id}` —
    menit + passing + kuota attempt; tombol "Mulai Assessment") → AcademyAttempt (**full-screen**;
    `POST /academy/assessments/{id}/attempts` → `{attempt_id}`, lalu `GET /academy/attempts/{id}`;
    timer basis `server_time` + auto-submit; `PUT .../responses/{q}` autosave; `POST .../submit`
    → replace Result) · AcademyAttemptResult (`GET .../result` → `passing_status` LULUS/TIDAK LULUS +
    nilai + benar/salah; **satu layout untuk semua tipe assessment** — kontrak tak membedakan) ·
    AcademyPracticalEntry (`GET /academy/practical-assessments/{id}` → `metrics[]` dinamis; anggota
    selalu bisa input mandiri selama belum kirim / ditolak — backend yang memutuskan final;
    `POST .../results` `{metric_values, notes}`) · AcademyResults
    (`GET /academy/me/results`) · AcademyResultDetail (`GET /academy/programs/{id}` `participant`) ·
    AcademyCompetencies / AcademyCompetencyDetail (`GET /academy/me/competencies` — tanpa riwayat skor).
  - **Layar Instruktur**: AcademyInstructorHome (`instructor_pending_verifications` + `GET /academy/programs
    ?type=instructor`; hanya "N program ditangani" + "N menunggu verifikasi" + 3 program terbaru) ·
    AcademyInsProgramDetail (`GET /academy/programs/{id}` — info program + kurikulum read-only + tombol ke
    antrean Verifikasi) · AcademyInsVerifications (`GET /academy/instructor/pending-verifications`) ·
    AcademyInsVerificationDetail (bawa item lewat params; [Verifikasi]/[Tolak] via `BottomSheet` →
    `POST /academy/instructor/verify-result/{id}` `{action:'verify'|'reject', score?, rejection_reason?,
    notes?}` — koreksi = verify dengan score disesuaikan; instruktur menetapkan nilai resmi di sini).
  - **Layar Komandan**: AcademyCommanderOverview (`GET /academy/commander/overview` — KPI agregasi +
    `top_competencies`; angka "Perlu Perhatian" dari `me/summary` `commander_overview`
    `not_completed + failed + pending_verifications`) · AcademyCmdAttention (3 baris dari
    `me/summary.commander_overview`) · AcademyCmdProgramDetail (`GET /academy/programs/{id}` — info program +
    kurikulum read-only; **tak ada rekap peserta** karena tak ada endpointnya) · AcademyCmdCompetency
    (dari `commander/overview.top_competencies` — **tak ada** endpoint `commander/competencies` terpisah).
  - Angka contoh di artboard **tidak** di-hardcode; layar menampilkan data API apa adanya + empty state.
  - Tidak ada dependency native baru → perubahan JS-only. Token `academy*` lama di `colors.ts` +
    `GradientButton` tone `'akademik'` + `StatusModal` icon `'clock'` **dibiarkan** (tidak dipakai layar baru
    tapi tak merusak; `academyWarnSurface`/`academyAkademik*` masih dipakai `DispositionDetail`/`GradientButton`).
- A tab screen that needs to push a root-stack screen (e.g. `Profile` → `Settings`, `Home` → `CatalogList`)
  types its `useNavigation()` call as
  `CompositeNavigationProp<MainTabScreenProps<'X'>['navigation'], NativeStackNavigationProp<RootStackParamList>>`
  — a plain `MainTabScreenProps` nav prop only knows about `MainTabParamList` routes.
- `src/navigation/RequireAuth.tsx` / `RequireGuest.tsx` — guard components, not route wrappers in the web sense.
  They read `state.auth.isLogin` from Redux and call `navigation.replace(...)` inside a `useEffect` (RN has no
  declarative redirect like `<Navigate>`). `RootNavigator` renders screens via the `<Stack.Screen>` render-prop
  form specifically so these guards can access `navigation` from `screenProps`.
- `src/navigation/MainTabNavigator.tsx` — bottom-tab navigator. The tab bar itself is **fully custom**
  (`tabBar={props => <CustomTabBar …/>}`, not the library's default) — `react-navigation`'s own tab bar +
  `tabBarButton` couldn't render the artboard's pill exactly (flat colour only, odd proportions). The built-in
  tab bar / `tabBarButton` / `screenOptions.tabBar*` styling and the old `TabPillButton.tsx` are gone.
- `src/navigation/CustomTabBar.tsx` — the hand-rolled bar (DESIGN_SYSTEM §5.10): absolute-positioned, `24`
  top-radius, `surface` + `tabBarShadow`, safe-area aware. Each non-Emergency item is a `PressableScale`; the
  **active** one gets a gradient-primary pill (SVG `LinearGradient` `Rect rx=26` over an opaque `gradientPrimaryEnd`
  bg so iOS casts the blue glow) with `minWidth: 78` so a short label ("Home") still reads oval like a long one
  ("Buku Saku"); icon `22`/label `10/700` white when active, icon `24`/label `10/600` `placeholder` when not.
  Tab press/long-press go through `navigation.emit('tabPress'/'tabLongPress')` + `navigation.navigate`. Tab icons
  are hand-drawn `react-native-svg` paths in `src/components/atoms/Icon`. The middle `Emergency` slot renders
  `src/components/organisms/EmergencyTabButton` — a raised (`top: -20`) `56` circle, gradient-danger (same SVG-fill
  trick) with a red glow, floating above the bar. `EmergencyTabButtonProps` is just `{ onToastChange }` now (no
  longer extends `BottomTabBarButtonProps`); it still uses `useNavigation()` internally. There are
  two independent ways to send a panic signal, by design: this tab button, and the button on
  `src/screens/Emergency/index.tsx` (see below). The tab button's first tap of a fresh sequence always
  navigates to the Emergency screen (normal tab navigation, so the screen stays reachable); that same tap
  also feeds a tap-timestamp ref, and if two more follow within a 1200ms rolling window (`TAPS_REQUIRED` /
  `TAP_WINDOW_MS`) it sends the signal directly instead — a quick-submit shortcut that doesn't wait for the
  screen's own button. Each tap short of that target shows a "Ketuk N kali lagi..." toast — the same nudge
  as `useDoubleBackToExit`'s "tekan sekali lagi untuk keluar", but driven from state (a `MotiView` + `Text`,
  not `ToastAndroid`): Android's native Toast queues successive `show()` calls instead of replacing the
  visible one, so a fast second tap would still show the stale "N+1" message for its full duration —
  re-rendering from state lets each tap overwrite it instantly. `EmergencyTabButton` only computes the
  message and reports it upward via an `onToastChange` prop; `MainTabNavigator` owns the `toastMessage`
  state and renders the pill itself, absolutely positioned as a sibling of `<Tab.Navigator>` (full screen
  width), not nested inside the button's own tree. Two things were tried and rejected there: rendering the
  pill inline inside the button clips/wraps its text on Android, because an absolutely positioned view
  with no explicit width, nested inside the tab bar's `flex: 1` item (~1/5 screen wide), gets its width
  clamped to that narrow slot instead of sizing to its own text; and rendering it in its own `Modal`
  (`StatusModal`'s pattern) avoided that but introduced a worse bug — Android Dialogs intercept touches for
  the whole screen while visible, so the 2nd/3rd tap landed on the invisible modal instead of the button
  underneath and the tap count got stuck. A plain absolutely positioned, `pointerEvents="none"` sibling of
  the full-width navigator has neither problem. Both this button and the screen's own trigger call
  `triggerHapticFeedback()` (`src/utils/haptics.ts`, a thin `Vibration.vibrate(60)` wrapper — no haptics
  library is installed) on press. Needs `android.permission.VIBRATE` in `AndroidManifest.xml` (added) — without
  it `Vibration.vibrate()` fails silently on Android (no error, just no buzz) with no matching requirement
  on iOS. Being a native manifest change, it only takes effect after a full rebuild (`npm run android`), not
  a JS reload.
  The actual panic-sending logic (get coordinates, `POST /panic-buttons`, local alert, success/error
  `StatusModal`) lives in `src/hooks/usePanicButton.ts` so it isn't tied to a single screen or button —
  both `EmergencyTabButton` and `EmergencyScreen` call it independently and each renders its own
  `StatusModal`, so feedback shows correctly regardless of which one triggered the send.
- `src/screens/Emergency/index.tsx` — the screen `EmergencyTabButton` navigates to. Deliberately has no
  header (unlike other tab screens) so it reads as one focused action: a radar-style animation (three
  `MotiView` rings reusing `radarRingTransition` from `utils/motion.ts`, staggered via `RING_DELAYS` so a
  new ring starts its outward ping while the previous one is still fading) around a center `send`-icon
  button. That button submits on a single tap — unlike the tab button, no tap-counting gate here, since
  navigating to this screen plus an explicit press is already a deliberate two-step action.
- `src/screens/Riwayat/index.tsx` — the `Riwayat` bottom-tab screen. For a **member/prajurit** (has
  `user.personnel`, role not `petugas_kesehatan`) it's a **menu hub**: a grid of `MenuCard` molecules,
  one per riwayat category. Currently just **Kesehatan** → `ROUTES.healthMyHistory`; more categories
  (Keluar Masuk, Peminjaman Senjata, …) get added to the `menuItems` array as their endpoints land.
  Any other role falls back to a centered `molecules/EmptyState`. Canvas look
  (`atoms/ScreenBackground` + `HomeHeader`, gradient bg). The health-history list itself lives in
  `src/screens/HealthMyHistory/index.tsx` (root-stack screen, `MainLayout variant="canvas"` + back) — `GET /health/my`
  (`getMyHealthHistoryApi`, response `data.personnel` + `data.records[]`, paginated via `meta`), member
  identity header + `HealthRecordCard` list + client-side "muat lebih banyak" + pull-to-refresh, each
  row → `healthRecordDetail`. See the "Health module" section below.
- **Buku Saku (E-Book)** — real backend `/handbook/*` (see `documentation/API_CONTRACT.md`). Service
  `src/services/api/handbook.service.ts` (`getHandbookChaptersApi` → `GET /handbook/chapters`,
  `getHandbookArticleApi(id)` → `GET /handbook/articles/{id}`). Types `src/types/bukuSaku.types.ts`
  (barrelled): `HandbookChapter` (`{ id, title, icon, sort_order, articles_count, articles[] }`),
  `HandbookArticleRef` (`{ id, title, page_number, type, record_type }`), `HandbookArticleDetail`
  (adds `chapter_id` / `chapter_title` / `content`). `type` is `'article'` (Rich Text HTML in
  `content`) or `'record_display'` (a marker for a prajurit record view — `record_type` names it;
  no data view in-app yet). No Redux slice — each screen holds local state. The old dummy
  (`data/bukuSakuGuides.ts`, `screens/BukuSaku/categoryMeta.ts`, `BukuSakuGuide`/`BukuSakuAttachment`
  types) is gone.
- `src/screens/BukuSaku/index.tsx` — the `BukuSaku` bottom-tab screen. `HomeHeader` + big title +
  `molecules/SearchFilterBar` (client-side filter over chapter title **and** its article titles) +
  "DAFTAR BAB" list. `GET /handbook/chapters` on mount + pull-to-refresh, sorted by `sort_order`.
  Each row = icon-chip (`screens/BukuSaku/chapterIcon.ts` `handbookIcon(icon)` maps the backend's
  free-string `icon` → an `IconName`, fallback `handbook`) + chapter title + "`N` halaman" + chevron
  → `navigation.navigate(bukuSakuDetail, { chapter })`.
- `src/screens/BukuSakuDetail/index.tsx` — root-stack screen (`ROUTES.bukuSakuDetail`, no guard,
  reached from the tab via a composite nav type). Route params `{ chapter: HandbookChapter;
  initialArticleId?: number }` — the whole chapter is passed so next/back works with no extra chapters
  call. Reads one **page/materi per screen** (E-Book style): `chapter.articles` sorted by
  `page_number`, local `index` state, `GET /handbook/articles/{id}` for the current page (re-fetch +
  scroll-to-top on nav). `MainLayout variant="canvas"` (title = chapter title, subtitle =
  "Halaman `X` dari `N`") + back. Body: page kicker + article title + divider, then: `type
  === 'article'` → `molecules/RichTextContent` renders `content`; `type === 'record_display'` → a
  marker card ("Rekam nilai prajurit" + `record_type` + "belum tersedia" note). Pinned footer =
  "Sebelumnya" (ghost) / "Selanjutnya" (primary) pills, disabled at the ends. No attachments, no
  author footer.
- `src/components/molecules/RichTextContent/index.tsx` — minimal dependency-free HTML → RN renderer
  for the WYSIWYG `content` (p, h1–h6, ul/ol/li, blockquote, pre, strong/b, em/i, u/s, a, br, hr,
  img, span/div; unknown tags unwrapped, entities decoded). Own tiny tokenizer → node tree; inline
  runs render as nested `<Text>`, block/`img` nodes split out into their own elements. `<img>` →
  `ArticleImage` (measures container width via `onLayout`, tracks natural aspect ratio from
  `SecureImage`'s `onLoad`, so numeric width/height — FastImage's `ImageStyle` rejects `aspectRatio`
  / `%` / arrays). Image `src` under `/api/secure-files/...` is re-homed to the configured API base
  (backend example URLs are `http://localhost:8000`) and rendered via `atoms/SecureImage` (auth
  header). No `react-native-render-html` / `react-native-webview` — nothing to rebuild.
- `src/hooks/usePanicButton.ts` — posts to `POST /panic-buttons` via `sendPanicButtonApi`
  (`src/services/api/panicButton.service.ts`) with the device's current latitude/longitude from
  `src/utils/location.ts` (`@react-native-community/geolocation` + `PermissionsAndroid` on Android; iOS
  permission is driven by the `NSLocationWhenInUseUsageDescription` string in `Info.plist`).
  `getCurrentCoordinates()` throws a typed `LocationUnavailableError` with a `reason` of `'permission-denied'`
  or `'gps-disabled'` so callers can route to the right remedy (`openAppSettings()` vs
  `openLocationSettings()`, also in `utils/location.ts`). Result/error feedback uses `StatusModal`
  (`src/components/organisms/StatusModal`), not `Alert.alert`. See the `EmergencyTabButton` note above for
  where this hook is consumed.
- **Auth screens visual kit** — Login / ForgotPassword / ChangePassword all implement the "canvas theme"
  (DESIGN_SYSTEM.md §1b) via shared pieces: `templates/AuthLayout` (full-bleed gradient backdrop through
  `atoms/AuthBackground` — page gradient + corner blobs + Login-only mountain silhouette; `centered` prop
  for ChangePassword, `showMountains` for Login, `footer` for the pinned version string),
  `atoms/GradientButton` (pill CTA with SVG gradient fill + glow — canvas primary button; the plain
  `atoms/Button` stays for not-yet-migrated screens), `molecules/AuthField` (label + white field + chip
  icon + password eye; `editable={false}` → muted read-only), `molecules/AuthToggle` (generic segmented
  pill, gradient-filled active segment — the Password/Kode OTP switch). New `Icon` name: `lock`.
- `src/screens/Login/index.tsx` — a Password/Kode OTP segmented toggle (`AuthToggle`) switches the form
  between the password flow (`login` thunk) and a two-step OTP flow: `POST /auth/otp/request` (screen-local
  loading/error state, not Redux — it doesn't touch auth state) then `POST /auth/otp/verify` via the
  `loginWithOtp` thunk. "Lupa password?" navigates to `ForgotPassword`.
- `src/screens/ForgotPassword/index.tsx` — guest-only screen, two-step form: `POST /auth/forgot-password`
  (request OTP) then `POST /auth/reset-password` (otp + new password + confirmation, with client-side
  min-8-char/match checks) ending in a `StatusModal` success that routes back to `Login`. Fully screen-local
  state — resetting a password doesn't log the user in, so nothing here touches `authSlice`.
- `authSlice.ts`'s `login` and `loginWithOtp` thunks share one `isLoading`/`error`/`isLogin`/`user`/`token`
  reducer via `isAnyOf` `addMatcher`s (not duplicated `addCase`s per thunk) — add any future login-variant
  thunk (e.g. biometric) to those same matchers rather than writing new cases.
- **Forced first-login password change** (`requires_password_change` from `/auth/login` and `/auth/otp/verify`,
  `must_change_password` from `/auth/me`): `AuthState.requiresPasswordChange` is the single canonical flag —
  set from the login/OTP response on `login.fulfilled`/`loginWithOtp.fulfilled`, and re-synced from
  `must_change_password` on every `refreshUser.fulfilled` (so an admin-forced reset mid-session is caught too,
  not just right after login). `AuthState.resetToken` holds the one-time-use token from that same login
  response. `RequireGuest` (wraps `Login`/`ForgotPassword`) and `RequireAuth` (wraps `Main`) both redirect to
  `ChangePassword` whenever `requiresPasswordChange` is true instead of `Main` — `RequireAuth` takes a
  `skipPasswordChangeGate` prop so the `ChangePassword` screen itself (also wrapped in `RequireAuth`, since it
  still requires `isLogin`) doesn't redirect-loop to itself.
- **Post-login bootstrap gate** (`AuthState.appChecked`): the `login`/`loginWithOtp` thunks now do the bare
  minimum before `fulfilled` — `loginApi` + `setAuthToken` only — so the Login screen's button spinner covers
  the `/auth/login` request and nothing else (previously it also `await`ed a full `/auth/me` call **and** the
  Android background-location permission chain, a multi-second stall between "API success" and reaching Home).
  `login.fulfilled`/`loginWithOtp.fulfilled` set `appChecked: false`; `RequireGuest` and `RequireAuth` both
  redirect to `ROUTES.appBootstrap` (instead of `Main`) whenever `isLogin && !requiresPasswordChange &&
  !appChecked`. `RequireAuth` takes a `skipAppCheckGate` prop (mirrors `skipPasswordChangeGate`) so the
  `AppBootstrap` screen itself doesn't redirect-loop; its `blockedByAppCheck` uses the **raw**
  `requiresPasswordChange` (not the gated one) so the `ChangePassword` screen isn't pulled to `AppBootstrap`
  before the password is set (password change always goes first; bootstrap runs after `passwordChanged()` +
  `replace(Main)`). `appChecked` is persisted (in the whitelisted `auth` slice) so a **warm start** (session
  restored from redux-persist, `appChecked` already true) skips the bootstrap screen entirely — that path is
  still handled by `RootNavigator`'s startup effect, which is now gated `if (isLogin && appChecked)` so a
  fresh login's permission requests don't race the `AppBootstrap` screen's. Reset to false on
  `logout`/`logoutLocal`.
- `src/screens/AppBootstrap/index.tsx` — the interstitial between login success and `Main` (root-stack,
  `RequireAuth skipAppCheckGate`, `options={{ gestureEnabled: false }}`, reached via `navigation.replace`, so
  not back-navigable; `useDoubleBackToExit` for the Android hardware back). Auth-kit look (`AuthBackground` +
  logo badge). On mount runs `runChecks()`: `dispatch(refreshUser()).unwrap()` (best-effort — fills role etc.
  for the role-based Home, esp. after OTP login where the thunk only stored a minimal user) then
  `startBackgroundLocationTracking()`. Only a thrown `LocationUnavailableError` (FINE_LOCATION denied) blocks —
  it flips to a `'blocked'` phase with the error message, a **"Coba Lagi"** `GradientButton` (re-runs
  `runChecks`), a "Buka Pengaturan" link (`openAppSettings`), and a "Logout" escape hatch. On success:
  `dispatch(appCheckCompleted())` → `navigation.replace(ROUTES.main)`. Notification / background-location
  permission denial stays best-effort (doesn't block). Home's own forced location gate (`StatusModal` on
  mount) is unchanged and still catches a permission revoked later.
- `src/screens/ChangePassword/index.tsx` — `POST /auth/change-password`. If `resetToken` is present it's used
  (no current-password field shown); otherwise the form asks for `current_password` instead (per the API's
  "verify with current_password OR reset_token" contract — covers a session restored from redux-persist where
  the one-time reset token from the original login is no longer valid/available). On success, dispatches
  `passwordChanged()` (clears the flag + token, flips `user.must_change_password` locally) and
  `navigation.replace(ROUTES.main)`. Has a plain "Logout" escape hatch (same `logoutLocal()` + background
  `logout()` pattern as `Settings`) for a user who is stuck with neither a valid reset token nor a known
  current password. Uses `useDoubleBackToExit` since, like `Home`, it's effectively a stack-root screen after
  `navigation.replace()`.
- **Edit Profil** (`src/screens/EditProfile/index.tsx`, `ROUTES.editProfile`) — root-stack screen, no guard,
  reached from a pencil icon in `Profile`'s header (next to the existing gear → `Settings`, both now wrapped
  in a `headerActions` row). Single `POST /profile` endpoint (`src/services/api/profile.service.ts`
  `updateProfileApi(payload, photo?)` — plain JSON, or multipart when a `photo` file is passed; every field is
  optional and empty/undefined fields are stripped before sending so one form's submit never blanks another
  form's field) backs **three independent forms on one screen**, each with its own local state, loading flag,
  and submit call (per the user's ask to not bundle everything into one form): "Foto Profil" (picks via
  `pickProfilePhoto()` in `utils/filePicker.ts` — `@react-native-documents/picker` restricted to images, ≤2MB
  — and uploads immediately on pick, no separate save step), "Data Pribadi" (nama lengkap, email, no. telepon,
  alamat, tempat/tanggal lahir via `DateTimeField`, golongan darah + jenis kelamin via `SegmentedControl`; only
  rendered when `user.personnel` exists, matching `Profile`'s own "Data Personel" gate), and "Ganti Password"
  (current/new/confirm, client-validated min-8-chars + match, same rules as `ChangePassword` but this is the
  voluntary self-service path — unrelated to the forced first-login `ChangePassword` flow/`resetToken`). Each
  successful submit dispatches `authSlice`'s `profileUpdated(result)` reducer with the endpoint's own response
  `data` (which already contains the fresh account + personnel fields) — merged directly into
  `state.auth.user`/`user.personnel` rather than triggering a second `/auth/me` round-trip via `refreshUser`.
- `src/screens/Settings/index.tsx` — a root-stack screen (not a tab), wrapped in `MainLayout` with a back
  button, reached from the gear icon in `Profile`'s header. Shows live status rows for location permission,
  device GPS/location-services toggle,
  and notification permission (`isLocationPermissionGranted`/`isGpsEnabled` in `utils/location.ts`,
  `isNotificationPermissionGranted` in `utils/pushNotifications.ts` — all non-invasive checks, i.e. they never
  trigger an OS permission prompt themselves), each with a "Buka Pengaturan" button when off. Re-checks on
  pull-to-refresh and whenever `AppState` returns to `'active'` (e.g. after the user comes back from the OS
  Settings app). Also owns the Logout button + confirmation `StatusModal` (moved here from `Profile`).
  `isGpsEnabled()` calls a native method (`LocationTrackingModule.isLocationServicesEnabled`, Android only —
  checks `LocationManager.isProviderEnabled`) since there's no JS-only way to read the device location-services
  toggle without either a permissions library or an actual location fetch.
- `src/hooks/useDoubleBackToExit.ts` — Android-only hardware-back-button guard for stack-root screens (`Login`,
  `Home`, `AppBootstrap`, `ChangePassword`) that would otherwise exit the app on a single back press with no
  confirmation: first press shows a `ToastAndroid` message, a second press within 2s actually exits. Optional
  2nd arg `onConfirm` — when given, the 2nd press calls it instead of `BackHandler.exitApp()` (Academy's
  Beranda passes `() => navigation.goBack()` so "keluar" pops back to the main app, not closes the app; message
  "Tekan sekali lagi untuk keluar dari Academy"). Uses `useFocusEffect` so it only intercepts back presses
  while that specific screen is focused. No-op on iOS (no hardware back button there).
- `src/screens/Home/index.tsx` — besides the welcome copy, this screen owns a **forced** location gate: on
  mount (and again whenever `AppState` returns to `'active'`, e.g. after the user backgrounds the app to
  toggle a setting) it calls `getCurrentCoordinates()` and shows a non-dismissable `StatusModal` (no cancel
  action, `onRequestClose` is a no-op) until it resolves. This both pre-warms the permission/GPS fix before
  the user ever reaches Emergency, and blocks usage until location is actually available — bottom-tab
  screens stay mounted across tab switches, so the modal keeps blocking even if the user switches tabs
  without granting.
  `refreshSession` (passed down to `CommanderHome`/`MemberHome` as `onRefresh`) deliberately does **not**
  await the location/GPS check — that check alone can take up to ~35s (`utils/location.ts`'s timeout +
  low-accuracy-fallback timeout combined), far longer than the actual session API. It's fired without
  awaiting (still updates `locationIssue` → the modal above, whenever it resolves) so pull-to-refresh only
  blocks on `dispatch(refreshUser())`. `CommanderHome`/`MemberHome` each own their **own** local `isRefreshing`
  state (not a prop from this screen) so their `RefreshControl` only stops once `onRefresh()` **and** that
  screen's own extra fetch (`loadPersonnelLocations`/`loadMyLocation`) have both resolved — before this, the
  parent-owned boolean flipped false as soon as its own promise settled, independent of the child's slower
  fetch, causing the spinner to stop too early relative to that fetch (or, when the GPS check was still in
  the mix, too late relative to the session API).

### State management

- `src/store/index.ts` — `configureStore` + `redux-persist` (storage engine: AsyncStorage, **whitelist: only
  `auth`**). `announcements` and `notifications` are real API-backed slices, never persisted — always
  re-fetched. `persistor` is consumed by `PersistGate` in `App.tsx`.
- `src/store/slices/announcementSlice.ts` — real `GET /announcements` + `POST /announcements`
  (`announcement.service.ts`). State `{ items, meta, status, error, sending, sendError }`. Thunks
  `fetchAnnouncements({page,per_page,type,since})` (page ≤ 1 replaces, else appends deduped) +
  `createAnnouncement(payload)` (unshifts). Consumed by `SendAnnouncement` (create + "Riwayat Terkirim")
  and the **"Pengumuman Terbaru"** section on both `CommanderHome` (`AnnouncementRow`) and `MemberHome`
  (`NoticeRow`). Loaded once in `Home/index.tsx` (`per_page=5`, mount + `AppState` active + pull-to-refresh).
- `src/store/slices/notificationSlice.ts` — real `GET /notifications` + `POST /notifications/{id}/read` +
  `/read-all` (`notification.service.ts`). State `{ items, meta, unreadTotal, status, error }`. Thunks
  `fetchNotifications({page,only_unread,type})`, `markNotificationRead(id)`, `markAllNotificationsRead()` —
  the read thunks use `data.unread_total` from the response to update the badge without re-fetching.
  `HomeHeader`'s bell badge = `state.notifications.unreadTotal` (no more `BASE_UNREAD_NOTIFICATIONS`
  constant). **Works for all roles** — loaded in `Home/index.tsx` alongside announcements.
- `src/store/hooks.ts` — always use `useAppDispatch` / `useAppSelector`, never the untyped `react-redux` hooks.
- `src/store/slices/<domain>Slice.ts` — one slice per domain. `authSlice` calls the real backend
  (`loginApi`/`verifyLoginOtpApi`/`logoutApi`/`getMeApi` from `src/services/api/auth.service.ts`).
  `state.auth.isLogin` is the persisted flag guards check. `logoutLocal` (a plain synchronous reducer, not a
  thunk) clears `isLogin`/`user`/`token` immediately so the UI navigates to `Login` without waiting on the
  network — `Settings`'s logout handler dispatches `logoutLocal()` first, then dispatches the `logout()` thunk
  (API call + token/tracking/push cleanup) unawaited so it keeps running in the background.
- `src/store/middleware/apiSyncMiddleware.ts` — bridges the axios 401 interceptor to a `logout()` dispatch
  without `services/api` importing the store directly (would create a circular import); wiring happens via
  `setUnauthorizedHandler()` registered when the middleware is created.

### Service layer

- `src/services/api/axiosInstance.ts` — single axios instance, `baseURL` from `Config.API_BASE_URL`
  (`react-native-config`, reads `.env`, already includes the `/api` suffix — route paths in code omit it,
  e.g. `/auth/login`, `/locations`). Request interceptor injects `Authorization: Bearer <token>` from
  AsyncStorage (`getAuthToken`, async — unlike web's synchronous `localStorage`).
  `src/services/<domain>.service.ts` — one file per domain, thin wrappers around `axiosInstance` calls.
- Error messages from API failures are extracted with `axios.isAxiosError(error) && error.response?.data?.message`.
  Shared helper `extractErrorMessage(error, fallback)` lives in `src/utils/format.ts` (used by the
  announcement/notification/dashboard slices + `EmergencyList`/`EmergencyDetail`/`PersonnelTracking`);
  `authSlice.ts` and `hooks/usePanicButton.ts` still keep their own local copies.
- `src/services/api/dashboard.service.ts` (`GET /dashboard/situation`), `activity.service.ts`
  (`GET /activities/movements`), `announcement.service.ts` (`GET`/`POST /announcements`),
  `notification.service.ts` (`GET /notifications` + read/read-all), and the extended `panicButton.service.ts`
  (`GET /panic-buttons`, `/{id}`, `PATCH /{id}`) — all wired, see API_CONTRACT.md §2–§4.

#### Refresh-token flow (`POST /auth/refresh`)

Backend uses a JWT-refresh scheme, not a separate long-lived `refresh_token`: the request is
`Authorization: Bearer <access_token_lama>` with **no body**, and the old token is invalidated the moment
refresh succeeds (rotating token). Success response:
`{ success: true, message, data: { access_token, token_type, expires_in } }`; anything else (non-2xx, network
error, or `success: false` in a 200) is treated as an unrecoverable failure → logout.

- `axiosInstance.ts`'s response interceptor is the single point of truth for this, so it automatically covers
  **every** JS API call (`auth`, `location`, `panicButton` services) — no per-service changes needed. On a
  `401` (except `/auth/login`, `/auth/logout`, `/auth/refresh` itself — see the `isAuthLifecycleRequest` guard)
  it calls `refreshAccessToken()`, a **single-flight** `performRefresh()` wrapped in a module-level
  `refreshPromise` so concurrent 401s from multiple in-flight requests await the *same* refresh instead of
  racing (racing would matter here specifically because the old token is invalidated on refresh — a second,
  independent refresh call using that same now-dead old token would fail). Each request config gets a
  `_retry` flag so a request that still 401s *after* being retried with a fresh token is treated as a hard
  failure (logout), not an infinite loop.
- `LocationForegroundService.kt` (native Android foreground service, keeps running after JS/app is killed —
  see Navigation section below) has its **own independent** refresh implementation
  (`performUpload`/`refreshToken` helpers), using the same request contract via raw `HttpURLConnection`,
  because it can't reach the JS axios instance while running headless in the background. On refresh failure it
  clears its own token copy (`TrackingPrefs`) and stops itself — it can't dispatch a Redux `logout()` from
  native, so the app only formally logs out once JS notices (next cold start's refresh attempt fails the same
  way).
- Because native can rotate the token independently of JS, `RootNavigator.tsx`'s `isLogin` effect **reads
  native's token back** (`locationTracking.getStoredAuthToken()`) and adopts it over the JS/AsyncStorage copy
  whenever they differ, instead of unconditionally pushing JS's (possibly stale/dead) token down to native like
  it used to. Skipping this reconciliation would make a successful background refresh actively cause a
  spurious logout the next time the app is opened.
- "Check session on open" is implemented by dispatching the existing `refreshUser()` thunk (`authSlice.ts`,
  calls `getMeApi()`) at `RootNavigator`'s startup effect and in `Home`'s mount/`AppState`-active effects
  (Home is otherwise the only screen that never calls an API). `Profile` already calls an API on mount so it's
  covered for free. No other screen needs special-casing — any screen calling `axiosInstance` gets refresh-and-
  retry automatically; add a `refreshUser()`-style dispatch only if a new screen otherwise never hits the API.
- Deliberately no proactive/timer-based refresh using `expires_in` — only reactive-on-401 plus the mount-time
  checks above.

### App version / force-update check (`GET /app-version` — real API)

Backend endpoint is **live** and matches `documentation/API_CONTRACT.md` §1 (envelope `{ success, data }`,
`data.android` + `data.ios` blocks, fields `latest_version` / `latest_build` / `min_supported_version` /
`download_url` / `store_url` / `release_notes` / `released_at`). Public — no `Authorization` required.

- `src/services/api/appVersion.service.ts` — `getAppVersionApi()` → `GET /app-version` (no query).
- `src/utils/version.ts` — `appVersion` + `appBuildNumber` now come from **`react-native-device-info`**
  (`getVersion()` / `getBuildNumber()`, both sync) — the real native `versionName`/`versionCode`
  (Android) / `CFBundleShortVersionString`/`CFBundleVersion` (iOS), not `package.json`. `react-native-device-info`
  is a **new native dep** — autolinks on Android (no wiring); iOS needs `pod install` (already broken
  independently, see Commands). Jest needs its mock (`jest.setup.js`) — but note `__tests__/App.test.tsx` was
  already failing pre-existing on a `@react-navigation` ESM-transform issue.
- `src/utils/appVersion.ts` — `compareVersions()` (semantic-version compare, `0.2 < 0.3 < 0.10`, **not**
  string compare) + `evaluateUpdateStatus(installedVersion, installedBuild, platformBlock)` →
  `'none' | 'suggested' | 'required'`, checked **in this order**:
  - installed `build` < `latest_build` (a newer APK exists) → **required** — checked **first**, before the
    version string, so a build bump forces the update even when `version` is unchanged/unparseable.
    `latest_build` is coerced (`toBuildNumber`) so a stringy `"2"` from the backend still counts;
    `2 < 2` is false so equal builds don't trigger.
  - installed `version` < `min_supported_version` → **required**
  - `min_supported_version` ≤ installed `version` < `latest_version` → **suggested**
  - else / (unparseable installed version **and** build not behind) → **none**
  - `skipVersion()` / `isVersionSkipped()` persist the "Nanti"-skipped version in AsyncStorage
    (`skipped_app_version`) so a suggested update stops nagging until a newer release.
- `src/hooks/useAppVersionGate.ts` — fetches on mount + every `AppState` `active`; silently ignores
  request failure (never block the user because the check failed).
- `src/components/organisms/AppVersionGate/index.tsx` — mounted once in `RootNavigator` (sibling of
  `Stack.Navigator`, so it also shows pre-login). Renders a `StatusModal` with `variant="success"` +
  `icon="download"` (primary/blue badge + download glyph) for **both** states: **required** →
  non-dismissable, single "Update" button opens `download_url ?? store_url` via `Linking.openURL` (re-checks
  the endpoint when both URLs are null); in `__DEV__` it adds a "Lewati (dev)" secondary so a debug build
  stays usable. **suggested** → dismissable, "Update" + "Nanti" (persists the skip).
  `release_notes` is passed to `StatusModal`'s `details` prop (NOT concatenated into `message`) — see below.
- `StatusModal` gained an optional `icon?: 'success' | 'error' | 'download' | 'clock'` prop (defaults to
  `variant`) — lets the version gate stay primary-themed while showing a download glyph instead of the
  success checkmark. It also has an optional `details?: string` prop: long text (e.g. `release_notes`)
  rendered **left-aligned in a scrollable box** (`maxHeight: 200`) below the centred `message`, so the
  action buttons stay visible however long it is. `details` is run through
  `src/utils/releaseNotes.ts` `parseReleaseNotes()` → `ReleaseNoteBlock[]` (`heading` | `bullet` | `text`):
  it normalises `\r\n`, treats the app's own changelog format (section words "Baru"/"Ditingkatkan"/
  "Perbaikan"… + `- ` bullets — `documentation/CHANGELOG.md`) as headings + bullets, everything else as
  plain text. New `colors` token: `textBody` (slate-700, for bullet body text). Tested in
  `src/utils/__tests__/releaseNotes.test.ts`.
- **Backend data gap (not a contract mismatch):** both `download_url` and `store_url` are currently `null`
  for both platforms, and `latest_build` (1) isn't on the same scale as the shipped `versionCode` (2) —
  backend must populate a real APK URL and a `latest_build` that tracks the release `versionCode` before the
  update flow is actionable.

### Maps (`react-native-maps`)

- Provider is Google Maps on both platforms (never Apple Maps) — every `MapView` is created with
  `provider={PROVIDER_GOOGLE}`.
- API key: `MAPS_API_KEY` in `.env` (see `.env.example`) — currently one unrestricted key shared by both
  platforms; split into two properly-restricted keys before release (Android: package name + SHA-1; iOS:
  bundle identifier — a single Google Cloud key can only be restricted to one platform type at a time).
  - **Android**: consumed automatically via react-native-config's `resValue` codegen — any `.env` var becomes
    an Android string resource, so `MAPS_API_KEY` is referenced directly as `@string/MAPS_API_KEY` in the
    `com.google.android.geo.API_KEY` `<meta-data>` entry in `AndroidManifest.xml`. No extra native wiring.
  - **iOS**: `ios/Podfile` declares `pod 'react-native-maps', :subspecs => ['Google'], ...` **before**
    `use_native_modules!` so autolinking respects this instead of falling back to the pod's default `Maps`
    subspec (Apple Maps only). `AppDelegate.swift` calls `GMSServices.provideAPIKey(...)`, reading the key via
    `RNCConfig.envFor("MAPS_API_KEY")` — Swift only sees that Objective-C class through a bridging header
    (`ios/CigraSmartbattalionApps/CigraSmartbattalionApps-Bridging-Header.h`, wired via the
    `SWIFT_OBJC_BRIDGING_HEADER` build setting), since react-native-config doesn't otherwise expose a
    Swift-importable module for native (non-JS) code. The Podfile also sets `$RNFirebaseDisableSPM = true`:
    GoogleMaps' static XCFramework conflicts with react-native-firebase's default SPM-based Firebase
    resolution (duplicate Firebase symbols at link time) — disabling SPM falls back to Firebase's plain
    CocoaPods pods, which coexist fine.
- `src/components/organisms/PersonnelMap` — reusable `MapView` + markers for an array of
  `PersonnelLocationOverviewItem` (`src/types/location.types.ts`). `interactive={false}` disables all map
  gestures (used by the small preview card in `CommanderHome`, which sits inside a vertical `ScrollView` and
  would otherwise fight it for touch); `interactive={true}` (the fullscreen `PersonnelMap` screen) enables
  normal pan/zoom/rotate and shows an empty-state overlay when no personnel currently have a location. The
  initial region is the bounding box of every located personnel (falls back to a wide Indonesia-centered
  region when none do). Tapping a marker's callout invokes `onSelectPersonnel(item)`. `lite` prop → Android
  `liteMode` (static map bitmap instead of a live GL surface); set it for any non-interactive preview that
  lives inside a `ScrollView` (CommanderHome's card passes it) so scrolling the page stays smooth — a live
  `MapView` composited every frame is a known Android scroll-jank source. Ignored on iOS.
- `src/screens/Home/CommanderHome/index.tsx`'s "Peta Personel Real-time" section fetches
  `getLocationsOverviewApi()` (`src/services/api/location.service.ts`, `GET /locations/overview`) on mount and
  on pull-to-refresh, feeding a non-interactive `PersonnelMap` preview card. "Lihat Peta Lengkap" navigates to
  `ROUTES.personnelMap` (`src/screens/PersonnelMap/index.tsx`), a fullscreen interactive map hitting the same
  endpoint; tapping a marker's callout there navigates to `ROUTES.catalogDetail` with `resource: 'personnel'`
  and `id: item.service_number` — the `{personnel}` path param on catalog endpoints is the NRP/service number,
  not the numeric `id` (see the existing note on `getPersonnelDetailApi` in `catalog.service.ts`).

### Catalog (list + detail)

- `src/utils/catalogResources.tsx` — `catalogResourceConfigs` is the registry for the 5 catalog resources
  (`personnel`, `persit`, `vehicles`, `weapon-categories`, `weapon-assignments`). Each entry drives both
  `CatalogList` and `CatalogDetail` generically: `fetchList`/`fetchDetail`, `toListItem`, `detailHeader`, and
  `renderDetail(detail, header?, onRefresh?)`. `tabbedDetail: true` opts a resource into the collapsing-header
  tab layout (see below) — set for `personnel` and `persit`.
- `src/components/organisms/CollapsingTabsDetail` — shared scaffold for a collapsing-header + sticky tab bar
  detail screen (`react-native-collapsible-tab-view`). Owns the header-height self-measurement dance, the
  `MaterialTabBar` styling, and the animated icon/label (`TabBarLabel`). Every prop it hands to
  `Tabs.Container` is memoised so re-renders from async data loads don't make the library re-measure / reset
  scroll on tab switch. `PersonnelTabs` and `PersitTabs` are both built on it — use this for any future tabbed
  detail rather than re-wiring the library. Runs with `lazy` + `cancelLazyFadeIn`: each tab body mounts only
  on first visit (not all upfront) — this is what keeps the Google `MapView` in the "Lokasi" tab from
  compositing a GL surface every frame while you scroll the other tabs (the "detail personel drop fps"
  report). Callers should still `useMemo` the `tabs` array they pass and keep tab-body components cheap /
  `React.memo`'d, since a `render()` closure that rebuilds every parent render defeats the memoisation here.
- `src/components/molecules/HistoryList` — shared scaffold for the dark-pill-titled card list used by the
  "Riwayat visitor" / "Peminjaman Senjata" tabs: default export `HistoryList<T>` (`title` + `entries` +
  `emptyLabel` + `renderCard`), named exports `HistoryCard` (status badge + icon/label/value rows) and
  `historyStatusVariant`. `src/components/molecules/VisitorLogHistory` (`{ entries:
  PersonnelVisitorLogEntry[] }`) and `src/components/molecules/WeaponLoanHistory` (`{ entries:
  PersonnelWeaponLoanEntry[] }`) are the concrete tab bodies built on it — reuse these rather than
  re-inlining the layout. `src/components/molecules/VehicleVisitorLogHistory` (`{ entries:
  VehicleVisitorLogEntry[] }`) is the same scaffold for the "Log Pos Kendaraan" section in the
  (non-tabbed) vehicle detail, fed from `VehicleDetail.visitor_log_history` (real field on
  `GET /catalog/vehicles/{id}`, `API_CONTRACT.md` §5.1) — its rows show the driver/passenger
  (`driver_passenger_name` / `driver_passenger_phone`) instead of vehicle info.
- `src/components/organisms/WeaponCategoryWeaponsPanel` — the "Daftar Senjata" body inside the (non-tabbed)
  weapon-category detail. `GET /catalog/weapon-categories/{id}` now **paginates** its `weapons` array (50/page,
  meta in the root `meta` — `getWeaponCategoryDetailApi` in `catalog.service.ts` attaches it as
  `WeaponCategoryDetail.weapons_meta`) and accepts `?search=` (matches weapon number **or** serial). The panel
  seeds from the first page already in the detail response (`initialWeapons`/`initialMeta` props, no extra
  request on mount), then owns its own debounced search TextField (re-fetches page 1) + "Muat lebih banyak"
  button (appends `page+1`). Each weapon row shows condition/inventory badges and the richer `holder_info`:
  `holder_type: 'personnel'` → rank + name + NRP/unit + "sejak <relative>"; `holder_type: 'other'` → unit/gudang
  `name`; `null` → "Belum ada pemegang". The old flat `CatalogListSection` "Daftar Senjata" (no search/paging)
  is gone; `detailHeader`'s unit count now reads `weapons_meta.total` (falls back to the legacy root
  `total_weapons`).
- `src/screens/CatalogDetail/PersonnelTabs` — tabs Informasi / Riwayat visitor / Peminjaman Senjata /
  Lokasi. "Riwayat visitor" (`visitor` tab, was `movement`/"Riwayat Keluar Masuk", `<VisitorLogHistory>`)
  and "Peminjaman Senjata" (`weapon-loan` tab, `<WeaponLoanHistory>`) are both filled directly from the
  personnel-detail response (`visitor_log_history` / `weapon_loan_history`, see `API_CONTRACT.md` §5) — no
  separate endpoint. The header meta rows also show `last_status_location` ("inside" → "Di dalam markas",
  "outside" → "Di luar markas") via `locationStatusLabel` in `utils/catalogResources.tsx`.
  `toPersonnelTabName` still maps the old `movement` deep-link name to `visitor`. On the Informasi tab, each
  **Anggota Keluarga** row is tappable — `navigation.push(CatalogDetail, { resource: 'persit', id:
  String(family_member.id) })` (assumes `PersonnelDetail.family_members[].id` is the numeric Persit record id
  that `GET /catalog/persit/{id}` expects). `src/screens/CatalogDetail/PersitTabs` — tabs Informasi /
  Riwayat visitor (`visitor` tab, same `<VisitorLogHistory>` fed by `PersitDetail.visitor_log_history`; the
  Persit header likewise shows `last_status_location`) / Lokasi; the Lokasi tab shows the
  **spouse (prajurit)'s** position (`detail.spouse.service_number`), since location tracking is keyed to a
  personnel NRP, not a family member — falls back to an "unavailable" state when there's no linked spouse.
- `src/components/organisms/LocationPanel` — the shared Lokasi-tab body (status badge, `PersonnelMap`,
  "Buka di Google Maps", 50-entry movement history with client-side "muat lebih banyak"). Fed by
  `src/hooks/usePersonnelLocation.ts` (`GET /locations/{NRP}` once, then silent 60s polling **only while
  `options.pollingEnabled` is true**; no-ops on a null NRP). `PersonnelTabs`/`PersitTabs` pass
  `pollingEnabled: activeTabName === 'location'` so the poll doesn't re-render the whole tab tree (→ frame
  drops on scroll) while the user is on another tab — the initial fetch still runs so the floating
  "Buka di Google Maps" button works before Lokasi is opened.
  `src/components/molecules/OpenMapsButton` renders the "Buka di Google Maps" CTA — `floating` prop makes it an
  absolutely-positioned bottom button (shown on non-Lokasi tabs when a position exists); opens
  `openCoordinatesInMaps()` from `utils/location.ts`.
- **Patch:** `patches/react-native-collapsible-tab-view+8.0.1.patch` (applied via the `postinstall` →
  `patch-package` hook) — `Container.tsx`/`.js` tunes the library's post-tab-change scroll re-sync window
  from the upstream **1500ms** down to **1000ms**. For that window the library force-scrolls the newly
  focused tab to the shared (possibly collapsed) header offset every frame, so a **lazily-mounted** tab that
  isn't scrollable yet still gets caught once it mounts — without a long enough window, switching to a
  not-yet-mounted tab while the header is collapsed (e.g. after scrolling Informasi to the bottom) leaves
  that tab pinned at offset 0 with the header translated up: a blank gap between the sticky tab bar and the
  content. 1000ms is the floor that still reliably catches a slow lazy mount on a mid-range device;
  shorter values (200ms was tried) reintroduce the gap. The tradeoff is that a fast scroll gesture in the
  first ~1s after a tab switch can be interrupted by the sync — acceptable since a deliberate tab tap is
  usually followed by reading, not an immediate flick.

### CommanderHome quick actions

`src/screens/Home/CommanderHome/index.tsx` — the "Quick Action" grid is the entry point to the 5 catalog
directories **and** other shortcuts. `quickActions` order: Distribusi Personel, Keluarga (Persit),
Kirim Pengumuman → `ROUTES.sendAnnouncement`, **Kekuatan Apel → `ROUTES.rollCallList`** (inserted at
index 3 **only when `user.roles` includes `instruktur_apel`** — see "Kekuatan Apel" below),
**Monitoring Patroli → `ROUTES.patrolMonitoring`** (always shown for `komandan` — see "Patroli" below;
komandan only monitors, never patrols), Peta
Personel → `ROUTES.personnelTracking`, Kendaraan, Kategori Senjata, Distribusi Senjata, Alarm Satuan →
`ROUTES.alarmSatuan`, Buku Saku → `ROUTES.bukuSaku`. (The "Laporan Cepat" `ComingSoon` stub was removed.)
Grid shows the first `VISIBLE_QUICK_ACTION_COUNT` (7) + a "Lainnya" card that opens `QuickActionSheet`
(a `BottomSheet` listing the full set); the Kekuatan Apel + Patroli cards push the tail cards (Distribusi
Senjata, …) into the sheet. `quickActionRows` chunks the visible set into rows of 4 (last row padded with empty spacer
`View`s so a short row's cards don't stretch). There is no separate "Direktori Katalog" card section and no "Distribusi Status Personel" strip —
both were folded away / removed.

**Redesign 2026-09-22 ("Aksen Gradient", see DESIGN_SYSTEM.md §5.13b for the full pattern):**
`quickActions` items now also carry a `gradientColors: [start,end]` pair (existing gradient tokens
only) — `QuickActionButton` renders an `atoms/GradientIconChip` (white icon on a 2-tone gradient
chip) instead of the old flat `${color}1F` tint whenever it's passed; `QuickActionSheet` ("Lainnya"
bottom sheet) forwards the same `gradientColors` so it matches the grid. The old "Ringkasan Situasi"
2×2 `StatCard` grid + separate red alert banner are **gone** — replaced by one
`screens/Home/SituationHeroCard`: gradient-primary header (`situationStats[0]` as the big total),
a strip that reads "N Sinyal Darurat Aktif — perhatian diperlukan" (danger-tinted, `active_alerts >
0`) or "Tidak ada sinyal darurat aktif" (calm success tint, `active_alerts === 0`) — either state is
a `PressableScale` to `ROUTES.emergencyList` — then a mini-stat row (`situationStats.slice(1)`,
divider lines instead of separate boxed cards). `ActivityRow`/`AnnouncementRow` also take an optional
`gradientColors` prop now (direction/type → gradient pair, see `DIRECTION_GRADIENT`/
`ANNOUNCEMENT_META.*.gradient` in this file); the "Peta Personel Real-time" preview card gained a
thin gradient border ring + a floating "`N`/`total` dipantau" chip + a floating "Peta Lengkap" pill
(same `PersonnelMap`, same single `PressableScale`, purely decorative additions). None of this needed
a new native dependency (`react-native-svg` was already in use).

**Data (real API):** "Ringkasan Situasi" = `GET /dashboard/situation` (`toSituationStats` maps
`total_personnel` + `summary[]` → up to 4 stats, icon/colour per `key` in `SITUATION_META`, fed into
`SituationHeroCard`); "Aktivitas Terbaru" = `GET /activities/movements?per_page=3` → `recentActivity`
(`movements.slice(0,3)`), `ActivityRow` wrapped in `PressableScale` → personnel `CatalogDetail`,
"Lihat Semua" → `ROUTES.activityMovements` (`src/screens/ActivityMovements/index.tsx` — full
`GET /activities/movements` list, `per_page=20`, pull-to-refresh + "muat lebih banyak", rows →
personnel detail; its `listCard`'s `paddingBottom` is `28`, not a tiny value — that's the screen's
only safe-area clearance since a bare `FlatList` `contentContainerStyle` is both its "card" look and
its scroll padding here); "Pengumuman Terbaru" = `announcementSlice` items (`recentAnnouncements`,
first 3), each row `PressableScale` → `MessageDetailSheet`, "Lihat Semua" → `ROUTES.announcements`.
All refetched on pull-to-refresh; announcements + notifications loaded by `Home/index.tsx`, dashboard
+ movements by `CommanderHome`'s own `loadDashboard`. `ANNOUNCEMENT_META` (icon/colour/surface/**gradient**)
matches `screens/Announcements` and `SendAnnouncement` (`SendAnnouncement`/`typeMeta` there still
flat-only — not yet migrated to gradient chips, out of scope of the 2026-09-22 pass).

### Kekuatan Apel (roll call — komandan)

Real backend (`/roll-calls/*` — see `API_CONTRACT.md` §"Kekuatan Apel"). Entry point: the "Kekuatan Apel"
quick action on `CommanderHome` — **only rendered when `user.roles` includes `instruktur_apel`**
(`canManageRollCall`; backend also 403s). Types `src/types/rollCall.types.ts` (barrelled), service
`src/services/api/rollCall.service.ts`, formatting helpers `src/utils/rollCall.ts`. No Redux slice —
every screen holds its own local state + calls the service (same pattern as `EmergencyList`/`EmergencyDetail`).

- **`src/services/api/rollCall.service.ts`** — `getRollCallsApi({page,per_page})` (`GET /roll-calls`, the
  response is a **Laravel paginator** nested under `data` — `data.data` is the array, pagination fields are
  on `data` itself; the service normalises it to `{items, meta: PaginationMeta}`, computing `last_page` when
  absent), `createRollCallApi({date:'YYYY-MM-DD', time:'HH:MM', name?})` (`POST /roll-calls`),
  `getRollCallDetailApi(id)` (`GET /roll-calls/{s}` → `{session, recap, breakdown[], present[], absent[],
  unmarked[]}`), `submitRollCallEntryApi(id, {personnel_id, status:'present'|'absent', absence_reason_id?,
  note?})` (`POST /roll-calls/{s}/entries`), `closeRollCallApi(id)` (`POST /roll-calls/{s}/close`),
  `getAbsenceReasonsApi()` (`GET /roll-calls/absence-reasons`), `searchRollCallPersonnelApi(q)`
  (`GET /roll-calls/personnel/search?q=`). `{session}` path param = the numeric session `id`.
- Screens (all plain root-stack, no guard, `MainLayout variant="canvas"` except Scan; routes
  `rollCallList` / `rollCallCreate` / `rollCallDetail` / `rollCallSearch` / `rollCallScan` / `rollCallEntry`
  in `ROUTES` + `RootStackParamList` + `RootNavigator`):
  - `RollCallList` — `GET /roll-calls` paginated list + pull-to-refresh + "muat lebih banyak", `useFocusEffect`
    refetch (so a just-created/closed session updates on return). **Pinned bottom footer** `GradientButton`
    "Buat Sesi Apel" (`floatingSurface` + `tabBarShadow`) → `rollCallCreate`. List header = a "N sesi apel
    sedang berlangsung" strip (green dot when `openCount > 0`). Each card: name + status badge, date + time,
    divider, then a recap row **"N hadir · N tidak hadir · N belum"** from `item.recap` (per-item `recap`
    added by backend 2026-09-02, `RollCallSession.recap?`; falls back to a "Lihat detail & rekap" link when
    absent). Row → `rollCallDetail` `{ id }`.
  - `RollCallCreate` — name `TextField` + preset chips (Apel Pagi/Siang/Sore/Malam Satuan), `DateTimeField`
    date + time (merged into one `Date`, serialized `YYYY-MM-DD` / `HH:MM`), pinned footer `GradientButton`,
    `StatusModal` success → `goBack()`.
  - `RollCallDetail` — status card + recap card (big % via `attendanceColor`, progress bar, 3 stat tiles,
    `breakdown[]` chips). When `session.status === 'open'`: **Input Absen** button opens a single `BottomSheet`
    (Hadir / Tidak Hadir) that navigates **straight to `rollCallSearch`** with `{ sessionId, status }` (no
    method-picker step — Scan QR is reached from a QR icon in that screen's header). **Tutup Sesi** button →
    `StatusModal` confirm (variant error, 2 buttons) → `closeRollCallApi` → reload + result `StatusModal`.
    "Daftar Keterangan Absen" = the shared **`molecules/SegmentedControl`** (icons + pill, same as
    SendAnnouncement) over Hadir · N / Absen · N / Belum · N, listing `present[]` / `absent[]` / `unmarked[]`
    — absent rows show `absence_reason.name` (falls back to `note`) as a warning `Badge`, no catatan/note body
    line. **Every row is tappable** → a `BottomSheet` (`selectedPerson`) showing name/NRP/status + reason +
    catatan, all from the already-loaded list data (no fetch) (per user 2026-09-02).
  - `RollCallSearch` — builds the **full roster from `GET /roll-calls/{s}`** (`present + absent + unmarked`),
    no search endpoint / no min-length: shows everyone immediately, **client-side** filter on name/NRP,
    sorted unmarked → absent → present. Each row shows a status `Badge` (Hadir/Tidak Hadir/Belum). For
    `status === 'present'` tapping an unmarked/absent row **submits `present` inline** (optimistic local
    status update) so you can mark many fast; for `status === 'absent'` it navigates to `rollCallEntry`.
    Keyboard: container `paddingBottom: useKeyboardHeight()` + `FlatList keyboardDismissMode="on-drag"` so
    no row hides behind the keyboard. `MainLayout` `right` = a **QR icon** (`Icon` `qr-code`, added to the
    set) → `rollCallScan` with the same `{ sessionId, status }`.
  - `RollCallScan` — reached from the QR icon in `RollCallSearch`'s header. **`react-native-vision-camera`**
    QR scanner (`useCodeScanner({codeTypes:['qr']})`).
    Permission via `src/utils/cameraPermission.ts` (`requestCameraPermission()` → `'granted'|'denied'|
    'blocked'` — `blocked` = OS won't prompt again): on mount it prompts; `denied`/`blocked` → a `StatusModal`
    ("Buka Pengaturan" via `openCameraSettings()` = `openAppSettings()` for `blocked`, "Coba Lagi" for
    `denied`); re-checks on `AppState` `active` (return from Settings). `nrpFromQr` accepts a bare NRP or a
    JSON payload with `service_number`/`nrp`; resolves to `personnel_id` via the search endpoint (exact
    `service_number` match, else first hit). `present` → submit inline + on-camera toast + counter, stays to
    scan more; `absent` → navigate to `rollCallEntry`. `busyRef` + 1.6s cooldown debounces repeated scans of
    one code. Camera `isActive` gated on `useIsFocused()`.
  - `RollCallEntry` — the keterangan form. Status `present`/`absent` segment (default from route param).
    For `absent`: reason chips from `GET /roll-calls/absence-reasons`; a reason whose name matches `/lain/i`
    ("Lainnya") **reveals a required free-text `note` field** (there is no always-visible catatan field).
    Below the chips: the selected reason's `description` (from `absence-reasons`, `AbsenceReason.description`,
    only when non-null) + a static faint hint that picking "Lainnya" opens the free-text field.
    Submits `submitRollCallEntryApi` → `StatusModal` → `goBack()`.
- **Native deps this added** (need `pod install` for iOS — already broken independently — + a full rebuild;
  Android autolinks): `react-native-vision-camera` v4. `minSdkVersion` bumped `24 → 26` in
  `android/build.gradle` (VisionCamera requirement); `VisionCamera_enableCodeScanner=true` in
  `android/gradle.properties` (bundles the MLKit barcode model so scanning works offline); `CAMERA`
  permission + `<uses-feature camera.any required=false>` added to `AndroidManifest.xml`.

### Patroli (patrol routes + checkpoints)

**Two POVs:** the **anggota** flow (do a patrol — route list → route detail → scan QR + selfie check-in →
complete) reached from the **`MemberHome` "Akses Cepat"** "Patroli" shortcut; and the **komandan**
flow (monitor only, never patrols) reached from the **`CommanderHome` "Monitoring Patroli"** quick
action. Design source = the "Patroli" page in the Claude Design canvas (see the
`reference_design_canvas` memory). Types `src/types/patrol.types.ts` (barrelled), service
`src/services/api/patrol.service.ts`, helpers `src/utils/patrol.ts`. No Redux slice — every screen holds
local state (same pattern as RollCall*).

- **API — `/patrols/*` (endpoints confirmed live 2026-09-07; response bodies from the user).** Envelope
  is `{success, data}` (`ApiResponse<T>`). Backend has the routes wired but **no patrol data seeded yet**
  (`/patrols/routes` → `data:[]`, `/patrols/sessions/active` → `data:null`) — screens show empty states
  until data exists. `patrol.service.ts` is the single place paths live.
  - `getPatrolRoutesApi()` → `GET /patrols/routes` → `PatrolRoute[]` (`{id,name,code,description,
    checkpoints[], checkpoints_count?, status_summary?}`; checkpoint = `{id,name,sequence_order,qr_code,
    latitude,longitude,radius_meters,notes?}`). `status_summary` = `{is_selectable, has_ongoing_session,
    ongoing_session_id, ongoing_officer:{id,full_name,service_number,rank?}|null, completed_today_count}`
    — `is_selectable:false` + a foreign `ongoing_session_id` means the route is being patrolled by
    someone else (`utils/patrol.ts` `isPatrolRouteLocked` / `patrolRouteBusyLabel`).
  - `getActivePatrolSessionApi()` → `GET /patrols/sessions/active` → `PatrolSession | null` (catches 404 /
    `data:null` → null). `PatrolSession` = `{id,status,started_at,completed_at?,total_checkpoints,
    completed_checkpoints,route?:{id,name,code},logs?[]}`. `logs[]` shape unconfirmed — treated best-effort.
  - `startPatrolApi({patrol_route_id, notes?})` → `POST /patrols/sessions/start` (422 `{message,errors}`
    on validation failure — `extractErrorMessage` reads `.message`).
  - `completePatrolApi(id)` → `POST /patrols/sessions/{id}/complete` → `{id,status:'completed',completed_at}`.
  - `checkinPatrolCheckpointApi(id, {qr_code,latitude,longitude,notes?}, photo)` →
    `POST /patrols/sessions/{id}/checkin` — **multipart** (`photo` = `{uri,name,type}` from
    `Camera.takePhoto()`). Returns `{message, is_valid_location, distance_meters,
    radius_tolerance_meters, progress}`. Out-of-radius still `200 success:true` (message names the
    distance). Fills `session.logs[]` (shape = `data.log`: `{id, patrol_checkpoint_id, scanned_at,
    scanned_latitude/longitude, distance_meters, is_valid_location, notes, photo_path, checkpoint:{…}}`).
    Selfie is served at `<API_BASE>/secure-files/<photo_path>` (auth header) — render via `SecureImage`;
    `photo_url` is still `null` from the backend.
  - `getPatrolSessionApi(id)` → `GET /patrols/sessions/{id}` → `PatrolSession` with `route.checkpoints[]`
    + rich `logs[]` (`photo_path` + relative `photo_url`). Komandan can read any session. Used by
    `PatrolMonitoringDetail` to get the full checkpoint list the monitoring payload omits.
  - `getPatrolHistoryApi({page?,per_page?})` → `GET /patrols/sessions/history` → `PatrolSession[]` (real
    response is `{data:[…], meta:{current_page,last_page,per_page,total}}` — the helper unwraps a plain
    array or a `.data` array; `meta` is dropped). **Exported, not yet wired to a screen.**
  - **`getPatrolMonitoringApi({page?, per_page?, status?})`** → `GET /patrols/monitoring` (**komandan
    POV**). Response is **not** `ApiResponse<T>` — it's `{success, message, summary, data:[…], meta}`
    with `summary` (`{total_sessions, in_progress_count, completed_count}`) and `meta` at root. The
    helper returns `{summary, sessions, meta}`. `status` (`in_progress`|`completed`) filters the list
    **and** `summary`. `PatrolMonitoringSession` carries `duration_minutes`, `progress_percentage`,
    `has_location_anomaly`, `officer:{…}`, and `logs[]` with `photo_url` (a ready URL, not a path).
- **Home entry (anggota):** the `MemberHome` "Akses Cepat" "Patroli" shortcut (`icon: 'route'`) opens
  `Patrol`. Whenever `getActivePatrolSessionApi()` returns a session, **`MemberHome`** shows a
  **floating "Patroli berjalan" chip** above the tab bar (`useFocusEffect` refetch; scroll
  `paddingBottom` bumped +76 so bottom content clears it) → tap → `patrolActive`. (`CommanderHome` has
  no chip / no active-session fetch — komandan never patrols.)
- **Home entry (komandan):** the `CommanderHome` "Monitoring Patroli" quick action (`icon: 'route'`,
  after the role-gated "Kekuatan Apel" slot) opens `PatrolMonitoring` — a read-only KPI + session-list
  screen (`getPatrolMonitoringApi`): 3 KPI cards (Total / Berjalan / Selesai — held to the unfiltered
  `summary` so they stay stable across filter changes), a `SegmentedControl` (Semua / Berjalan /
  Selesai → server `status` param), a `FlatList` of session cards (officer + NRP, route + `CodeChip`,
  progress bar, duration, start time, `has_location_anomaly` warning banner) with pull-to-refresh +
  `onEndReached` paging via `meta`. Tap a card → `PatrolMonitoringDetail` (`{ session }` in params) —
  header/progress from the passed `session`; on mount it **also fetches `getPatrolSessionApi(session.id)`**
  (komandan can read it) to get `route.checkpoints[]`, so the **"DAFTAR CHECKPOINT"** timeline shows
  **every** checkpoint (done rows merged from `logs[]` by `checkpoint.id`; pending rows greyed with a
  "BELUM" badge, not tappable). Falls back to just the logged checkpoints if that fetch fails. A done
  row → `BottomSheet` with the selfie (`SecureImage(log.photo_url ?? log.photo_path)`) + full check-in
  detail. **No action buttons** — monitoring only.
- **Ongoing notification (Android):** `src/utils/patrolNotification.ts` `syncPatrolOngoingNotification(session)`
  is called wherever the anggota's active session is (re)loaded (`MemberHome` `loadActivePatrol`,
  `PatrolActive` `load`) and posts/updates/cancels a single `ongoing` notifee notification
  (channel `smart_battalion_patrol_v1`, `AndroidImportance.LOW`, a checkpoint `progress` bar,
  `pressAction` id `patrol-open-active`). Tapping it deep-links to `patrolActive` via
  `src/navigation/navigationRef.ts` (`navigationRef` + `runWhenNavigationReady`/`flushPendingNavigation`
  wired on `<NavigationContainer>` in `App.tsx`): foreground taps go through
  `registerPatrolNotificationForegroundHandler` (in `App.tsx`), background/quit through
  `notifee.onBackgroundEvent` (`index.js` → `handlePatrolNotificationBackgroundEvent`), cold-start
  through `consumePatrolInitialNotification` (`App.tsx` mount). Cleared on `completePatrolApi` success
  and in `teardownPushNotifications` (logout). **Limitation:** without a foreground service an Android
  14+ user can still swipe it away while the app is backgrounded, and a force-stop clears it — it
  re-appears on the next Home focus. notifee is already a native dep → **JS-only**.
- Screens (all plain root-stack, no guard; routes `patrol` / `patrolRouteDetail` / `patrolActive` /
  `patrolScan` / `patrolPhoto` / `patrolMonitoring` / `patrolMonitoringDetail` in `ROUTES` +
  `RootStackParamList` + `RootNavigator`). **There is no
  separate "pick a route" screen** — the route detail starts the session directly.
  - `Patrol` — `MainLayout variant="canvas"`. Loads active session + routes via `Promise.allSettled`,
    `useFocusEffect` refetch. Optional active-session card (progres bar, "Lihat sesi berjalan") →
    `patrolActive`; route cards → `patrolRouteDetail` (`{ route, activePatrolSessionId }` in params) —
    **except** the user's own ongoing route (`patrolRouteOngoingIsMine`), which navigates straight to
    `patrolActive`. A route locked by another officer (`isPatrolRouteLocked`) is dimmed, shows a lock
    icon + an amber `patrolRouteBusyLabel` banner, and is **not pressable**. **No footer button.**
  - `PatrolRouteDetail` — params `{ route: PatrolRoute; activePatrolSessionId? }`. Summary card
    (+ amber `patrolRouteBusyLabel` banner when busy) + numbered checkpoint timeline (`CodeChip`
    qr_code, radius, coords) + a **"Catatan Awal"** (optional multiline `TextField`) card.
    Footer "Mulai Patroli Rute Ini" is **`disabled` when the route is busy** (hint text above it);
    otherwise → **`startPatrolApi({ patrol_route_id, notes })` directly** →
    success `StatusModal` → `navigation.replace(patrolActive)`. Backend `422 { success:false, message,
    data:<sesi in_progress> }` when the officer already has a running session →
    `patrolAlreadyRunningSession(error)` (in the service) detects it → `StatusModal` **"Lihat Patroli
    Berjalan"** → `navigation.replace(patrolActive)`.
  - `PatrolActive` — the `in_progress` session. Loads active session (payload embeds
    `route.checkpoints[]` + `logs[]`; falls back to `getPatrolRoutesApi` only if checkpoints missing).
    Done/next checkpoint computed from `logs[].patrol_checkpoint_id` (a `Set`), **not** an ordinal
    assumption — the check-in validates by QR, so scans can be out of order. Status card (+ **DESKRIPSI
    RUTE** = `route.description` + **CATATAN AWAL** = `session.notes`) + progres card + checkpoint log
    timeline: each row shows the checkpoint coords + radius + `checkpoint.notes`, done rows also the
    scan time + distance; "Berikutnya" gets a "Scan QR Checkpoint" button. A **done row is tappable →
    `BottomSheet`** showing the full check-in detail (time, officer coords, distance, checkpoint
    coords/radius/notes, `is_valid_location` badge, check-in notes, and the **selfie** via
    `SecureImage(log.photo_path)`). Footer
    `GradientButton tone="success"` "Selesaikan Patroli" is **`disabled` until all checkpoints are
    checked in** (hint text above it) — backend also rejects an early complete; on all done → confirm
    `StatusModal` → `completePatrolApi` → result `StatusModal` → `goBack()`.
  - `PatrolScan` — params `{ sessionId, routeName?, totalCheckpoints, nextCheckpoint:{name,qrCode,
    sequenceOrder} }`. `react-native-vision-camera` QR scanner in a **1:1 square** frame (dark screen,
    viewfinder brackets inset in the square) + `cameraPermission.ts` → `StatusModal`. Matches the scanned
    code against `nextCheckpoint.qrCode`; on match → `navigation.replace(patrolPhoto, …)`. A `__DEV__`-only
    yellow **"[DEV] Anggap QR benar"** button simulates a correct scan.
  - `PatrolPhoto` — params `{ sessionId, checkpointName, checkpointCode, sequenceOrder, totalCheckpoints }`.
    One screen, two states: **capture** (front `useCameraDevice('front')` + `camera.takePhoto()` in a
    **1:1 square**, dashed oval face guide, shutter) → **review** (`MainLayout variant="canvas"`, **1:1**
    `<Image>` preview with time+GPS chips + info card + "Ulangi" / **"Kirim Bukti"** =
    `GradientButton tone="success"`). GPS via `getCurrentCoordinates()` (fetched right after capture;
    re-fetched on submit if missing) → `checkinPatrolCheckpointApi` multipart. Success `StatusModal`
    (shows backend `message` incl. distance) → `goBack()` → `PatrolActive` refetches.
    `LocationUnavailableError` → "Lokasi GPS Diperlukan" modal (open Location settings / app permission).
- **Shared pieces added:** `atoms/CodeChip` (monospace technical-code pill, reused across the Patroli
  screens + the check-in log sheet); `atoms/GradientButton` gained a `'success'` tone (green gradient);
  `Icon` gained `'camera'` + `'route'`. No new native deps — `react-native-vision-camera` (QR +
  `takePhoto`) and `@react-native-community/geolocation` (via `utils/location.ts`) are already wired, so
  this is a
  **JS-only** change (Metro reload, no rebuild). The whole flow (start → scan → selfie check-in → complete)
  was verified end-to-end against the live backend on device 2026-09-07.

### Disposisi Surat (letter disposition)

Real backend (`/incoming-letters/*`, `/dispositions/*`, `/personnel/search`). Dua sisi:
**pimpinan/operator** (role `komandan`) menerbitkan disposisi, **penerima/bawahan** (semua anggota)
menerima & menindaklanjuti. Didukung Push Notification FCM. Types
`src/types/disposition.types.ts` (barrelled), service `src/services/api/disposition.service.ts`,
helpers `src/utils/disposition.ts`. **Tidak ada Redux slice** — state lokal per layar (pola sama
RollCall/Patrol).

- **`src/services/api/disposition.service.ts`** — `getIncomingLettersApi({search,security_level,per_page,page})`
  (`GET /incoming-letters`, respons `{data,meta}` → `{items,meta:PaginationMeta}` via `normalizeMeta`),
  `createIncomingLetterApi(payload, file?)` (`POST` — multipart hanya kalau ada `file`, else JSON),
  `getIncomingLetterApi(id)`, `getDispositionSummaryApi()` (`GET /dispositions/summary` — maps
  `{unread,pending,in_progress,completed}` → `{unread_count,total_assigned,completed_count}`),
  `getDispositionsApi({status?, search?, page?})` (`GET /dispositions?type=my` — **`type=my` di-hardcode
  di service**: backend HANYA punya kotak masuk penerima, tidak ada daftar "disposisi terkirim"; sisi
  komandan melacak lewat `incoming_letter.dispositions[]`),
  `getDispositionApi(id)` (buka = `read_at` otomatis di backend, tak ada API mark-as-read terpisah;
  berfungsi juga untuk komandan pembuat),
  `createDispositionApi` / `updateDispositionApi(id)` (`POST` / `PUT` — `action_type:'send'|'draft'`),
  `deleteDispositionApi(id)` (dipakai untuk hapus draf), `addDispositionFollowUpApi(id,{notes,attachment?})`
  (**multipart, field `content` + `attachment`** — bukan `notes`/`file`),
  `completeDispositionApi(id, notes?)`, `searchDispositionPersonnelApi(q)` (`GET /personnel/search` —
  verified live; item `{id, full_name, service_number}`; `q` kosong = semua anggota aktif).
  Normalizer: backend memakai bentuk **nested** (`raw.letter`/`raw.disposition`/`raw.my_status`,
  `raw.incoming_letter`, follow-up `raw.content`/`raw.author.name`, recipient `raw.name`, status penerima
  `pending`→`unread` via `mapRecipientStatus`) → tipe datar internal. `createIncomingLetterApi` multipart
  field = **`file`** (verified). `resolveSecureFileUrl` + `dispositionAuthHeader` untuk unduh berkas.
- **`src/utils/filePicker.ts`** — `pickAttachment({allowDoc?})` via **`@react-native-documents/picker`**
  (native dep BARU — autolink Android, `pod install` iOS yang memang bermasalah terpisah; **wajib
  `npm run android` rebuild**, bukan reload JS). Validasi tipe (pdf/doc/docx/png/jpg) + ukuran ≤ 10MB,
  lempar `Error` berpesan ID; `null` kalau dibatalkan. `formatFileSize` helper.
- **`src/utils/secureFileDownload.ts`** — `downloadSecureFile(url, baseName)` generalisasi
  `utils/healthAttachment.ts` (Android DownloadManager, iOS `previewDocument`, header auth) untuk
  "Lihat Berkas Surat" & lampiran tindak lanjut.
- **Layar** (semua root-stack, `MainLayout variant="canvas"`, tanpa guard; routes di `ROUTES` +
  `RootStackParamList` + `RootNavigator`):
  - `DispositionList` (`dispositionList`, **no params**) — **kotak masuk saja** (`type=my`), sama untuk
    semua peran. Ringkasan (`summary`, 3 tile) + filter status (`FilterSheet`) + list berpaginasi +
    pull-to-refresh + `useFocusEffect` re-fetch. Kartu unread → wash biru (`notifUnreadSurface`), badge
    prioritas + status + status-penerima. Row → `dispositionDetail {id}`. **Tidak ada tab Terkirim / tombol
    buat** — backend tak punya daftar disposisi terkirim.
  - `DispositionDetail` (`dispositionDetail` `{id}`) — dipakai penerima **dan** komandan pembuat. Kartu
    instruksi (code + chip prioritas + status + catatan pengirim + tenggat), pengirim, `SectionCard` surat
    masuk + "Lihat Berkas Surat (PDF)", penerima (`recipients[]` + status), riwayat tindak lanjut (timeline
    + chip lampiran). `useFocusEffect` re-fetch (mis. sesudah tambah tindak lanjut). Footer 2 tombol sesuai
    `permissions.can_follow_up` / `can_complete` — **disembunyikan seluruhnya** kalau disposisi/penerima
    sudah `completed`/`archived` (`isDone`).
  - `DispositionFollowUp` (`dispositionFollowUp` `{id, dispositionNumber?, subject?}`) — form catatan
    (wajib, → field `content`) + lampiran (`pickAttachment` → field `attachment`), footer di-pin
    `useKeyboardHeight`. Sukses → `goBack()` (detail re-fetch via focus).
  - `IncomingLetterList` (`incomingLetterList` `{pickerMode?}`) — `SearchFilterBar` (debounce) + chip filter
    `security_level` + list. `MainLayout` `right` = ikon `mail` → `dispositionList` (kotak masuk komandan;
    hidden in `pickerMode`). `pickerMode` (dibuka dari Compose) → row mengirim `incomingLetter` balik ke
    Compose via `CommonActions.setParams({..., source: prevRoute.key})` + `goBack()`; footer "Catat Surat
    Masuk Baru" & judul disesuaikan. **Entry komandan ke fitur ini.**
  - `IncomingLetterCreate` (`incomingLetterCreate`) — form (nomor, asal, `DateTimeField` tgl surat +
    diterima `maximumDate`=hari ini, perihal, `SegmentedControl` keamanan, agenda/ringkasan opsional,
    lampiran). Sukses → `navigation.replace(dispositionCompose, {incomingLetter})`.
  - `IncomingLetterDetail` (`incomingLetterDetail` `{id, pickerMode?}`) — info + "Lihat Berkas Surat" +
    `SectionCard` "Riwayat Disposisi" (**ini "kotak keluar" komandan**). Tiap row tappable: `status==='draft'`
    → `dispositionCompose {dispositionId}` + tombol "Hapus" (`StatusModal` → `deleteDispositionApi`), selain
    itu → `dispositionDetail {id}`. `useFocusEffect` re-fetch. Footer "Buat Disposisi dari Surat Ini".
  - `DispositionRecipientSearch` (`dispositionRecipientSearch` `{selectedIds}`) — `searchDispositionPersonnelApi`
    (debounce, **tanpa min huruf**, q kosong = semua) + list checkbox, chip "Dipilih (N)". Loader/list
    dibungkus `View` `flex: 1` (`resultArea`) supaya footer "Tambahkan (N)" tetap di bawah saat memuat.
    Footer → kirim `recipients` balik ke Compose via `CommonActions.setParams` + `source` + `goBack()`.
    Re-seed `selected` dari `route.params.selectedIds` tiap dibuka.
  - `DispositionCompose` (`dispositionCompose` `{incomingLetter?, dispositionId?, recipients?}`) —
    `letter` & `recipients` **diturunkan dari `route.params` (satu sumber kebenaran)**, bukan `useState`,
    supaya tak hilang saat navigasi ke/dari layar pilih-surat / cari-penerima. `dispositionId` → prefill
    via `getDispositionApi` lalu `navigation.setParams` (mode edit draf → `PUT`). Draf backend biasanya
    sudah menyertakan `personnel_id` di `recipients[]`; kalau tidak → `needsRepick`. Form: kartu surat
    (+ "Ganti" → `incomingLetterList {pickerMode:true}`) + chip penerima + "Cari & Pilih" +
    `SegmentedControl` prioritas (`dotColor`) + instruksi (wajib) + `Switch` tenggat + catatan. Footer
    "Simpan Draf" / "Kirim Disposisi" → sukses `StatusModal` → **`CommonActions.reset`** menyusun ulang
    stack jadi `[…s/d incomingLetterList, incomingLetterDetail{id}]` (buang layar Compose & langkah antara
    spt IncomingLetterCreate) — jadi back dari detail kembali ke daftar Surat Masuk, bukan ke form.
- **Entry point:** Quick Action "Disposisi Surat" (`icon:'mail'`) di `CommanderHome` → **`incomingLetterList`**
  (alur komandan berbasis surat; CommanderHome sudah di-gate role `komandan`). Shortcut "Disposisi" di baris
  "Akses Cepat" `MemberHome` → `dispositionList` (kotak masuk). Notifikasi FCM: `action.type` `disposition`
  → `dispositionDetail`, `disposition_list` → `dispositionList` (di `screens/Notifications` `actionFor`).
- `Icon` dapat nama baru `edit` (pensil). `notification.types.ts` `AppNotificationType` +`'disposition'`.

### Role-based Home routing

`src/screens/Home/index.tsx` picks the Home body by role: `komandan` → `CommanderHome`, `petugas_kesehatan`
→ `HealthOfficerHome` (see "Health module" below), everyone else → `MemberHome`. The forced location gate
(`StatusModal` on mount / `AppState` active) and `refreshUser()`/`refreshSession` wiring are owned by
`Home/index.tsx` and apply to all three. Role → FCM topic sync (`initializePushNotifications`) already
handles any role string, so `petugas_kesehatan` gets its own topic automatically — no change needed there.

### MemberHome (Home anggota)

`src/screens/Home/MemberHome/index.tsx` — the default Home (picked in `Home/index.tsx` when the user's
roles don't include `komandan` or `petugas_kesehatan`). Sections top-to-bottom: a tappable "Sistem terhubung / Terakhir sinkron"
strip (taps trigger the same `handleRefresh` as pull-to-refresh — session + own-location refetch — and update
the "Terakhir sinkron" timestamp on completion; it no longer navigates to `Settings`), the **Kartu Anggota** (`src/components/organisms/MemberIdCard`), "Status Saya"
(horizontal-scroll `StatusTile` row, "Lihat Detail" → `ROUTES.profile`), "Aset Saya" (two `AssetCard`s,
"Lihat Semua" → `ComingSoon`), **"Keluarga (Persit)"** (only when `user.family` is non-empty), "Aktivitas
Terbaru" (`TimelineRow` list), "Pengumuman Terbaru" (`NoticeRow`
list, "Lihat Semua" → `ROUTES.announcements`), and "Akses Cepat" (`ShortcutButton` row: Buku Saku,
Pengumuman → `ROUTES.announcements`, Kontak Darurat). "Aktivitas Terbaru → Lihat Semua" → `ROUTES.myMovements`
(`src/screens/MyMovements/index.tsx` — `GET /me/movements` paginated list, `TimelineRow` rows, pull-to-refresh
+ "muat lebih banyak"; `meta` may be absent → fall back to "last page returned a full 20"). The "Kontak
Darurat" shortcut opens `ROUTES.emergencyContacts` (see below).

- **`src/services/api/me.service.ts`** — the "milik saya" endpoints for this screen, all scoped to the
  logged-in user (no NRP path param): `getMyIdCardApi` (`GET /me/id-card`), `getMyStatusApi`
  (`GET /me/status`), `getMyAssetsApi` (`GET /me/assets`), `getMyMovementsApi` (`GET /me/movements`,
  `{page,per_page}` → `{items, meta}`; `meta` may be absent), `getEmergencyContactsApi`
  (`GET /emergency-contacts`). Types in `src/types/me.types.ts` (barrelled). Contract:
  `documentation/API_CONTRACT_ANGGOTA.md`.
- MemberHome loads these via a `loadMe` callback using **`Promise.allSettled`** (one failing surface must
  not drop the others) on mount + pull-to-refresh, alongside the existing `getMyLocationApi`.
  - **Kartu Anggota** — `verified` + QR now come from `GET /me/id-card`: `verification_status === 'verified'`
    drives the badge, `qr_payload` (falls back to NRP) is the QR value (new optional `qrPayload` prop on
    `MemberIdCard`, also passed to `QrIdentityModal`).
  - **Status Saya** — first three tiles from `GET /me/status` (`presence.label` + `since`, `duty.label` +
    `period_label`, `location.label` + `accuracy_label`); "Update Terakhir" from `location.captured_at`
    (falls back to `GET /locations/me`). Tiles show "Belum Ada Data" when `/me/status` fails.
  - **Aset Saya** — `GET /me/assets`: `toWeaponCard`/`toVehicleCard` map the first weapon/vehicle into
    `AssetCard` props (badge variant via `conditionVariant`/`stnkVariant`); empty arrays → "Belum ada …"
    placeholder card. **Backend bug:** `GET /me/assets` currently returns `500 "Server Error"` — the
    `allSettled` guard keeps the rest of the screen working; cards stay on the placeholder until backend
    fixes it.
  - **Keluarga (Persit)** — `user.family` (`MeFamilyMember[]`) comes straight from `GET /auth/me`
    (`authSlice`, not `loadMe`). `src/components/molecules/FamilyMemberRow` (shared with `Profile`) —
    `PersonAvatar` (`photo` is a placeholder SVG data URI → always initials) + name +
    `joinFields(family_relation?, membership_number, occupation≠"-")`; the caller draws the divider via the
    `style` prop. Tap → `ROUTES.meFamilyDetail` `{ id, name }` (`id` = `MeFamilyMember.id` = the Persit
    record id). **Not** `CatalogDetail` — `GET /catalog/persit/{id}` is Komandan-scoped and 403s a prajurit;
    the member-scoped `/me/family/*` endpoints are used instead (see `MeFamilyDetail` below).
  - **Aktivitas Terbaru** — `GET /me/movements?per_page=3`: `direction` in/out, `note` as title,
    `location_label`/`purpose` as detail, `occurred_at` relative. Empty → inline "Belum ada aktivitas".
  - **Pengumuman Terbaru** — real `GET /announcements` via `announcementSlice` (loaded by `Home/index.tsx`,
    not `loadMe`). **Top 3** `items` → `NoticeRow` (`toNoticeType` maps the raw `type` to `alert`/`announcement`/
    `info`, `body` as detail, `created_by.name` as sender, relative `published_at`), each wrapped in a
    `PressableScale` → `MessageDetailSheet` (read-full, `NOTICE_META` gives icon/colour, action button →
    `ROUTES.announcements`). No per-item unread dot (read state is `/notifications`, not here).
- `src/screens/MeFamilyDetail/index.tsx` — root-stack screen (`ROUTES.meFamilyDetail` `{ id: number;
  name?: string }`, no guard), opened from a `FamilyMemberRow` on **MemberHome and Profile**. Member-scoped
  (no Komandan catalog access needed): `getMyFamilyMemberApi` (`GET /me/family/{id}` → `MeFamilyMemberDetail`
  — persit fields + `husband`/`wife` linked prajurit + `last_location`) and `getMyFamilyMemberLocationApi`
  (`GET /me/family/{id}/location` → `MeFamilyMemberLocation` — `current_location` + `location_history[]`),
  loaded together via `Promise.allSettled`. `MainLayout variant="canvas"`. Identity `Card` + "Data Keluarga"
  `SectionCard` (`InfoRow`s) + "Prajurit Terkait" `SectionCard` + "Lokasi" (`organisms/PersonnelMap` fed a
  synthesised one-item `PersonnelLocationOverviewItem` + `OpenMapsButton` when coords exist, else "Belum ada
  data lokasi"). Location point type (`MeFamilyLocationPoint`) is loose — payload is still `null` in test
  data, field names assume the API's usual `latitude`/`longitude`/`accuracy`/`captured_at`.
- `src/components/molecules/FamilyMemberRow` — shared tappable "anggota keluarga (Persit)" row
  (`PersonAvatar` + name + subtitle + chevron). Draws no divider itself; the caller passes `style` for the
  bottom border (MemberHome: non-last rows; `Profile` inside a `SectionCard`: every row, `SectionCard`
  strips the last one's border).
- `src/screens/Profile/index.tsx` also renders a **"Keluarga (Persit)"** `SectionCard` (same
  `FamilyMemberRow` + `meFamilyDetail` nav) between "Penugasan Saat Ini" and "Peran & Akses", shown only
  when `user.family` is non-empty.
- `src/screens/EmergencyContacts/index.tsx` — plain root-stack screen (`ROUTES.emergencyContacts`, no
  guard, reached from the MemberHome "Kontak Darurat" shortcut). `MainLayout variant="canvas"` + back,
  `GET /emergency-contacts` grouped by `category` (command/medical/security/general, unknown → "Lainnya"),
  each row a `PressableScale` opening `tel:` (`Linking.openURL`, phone digit-sanitised). Pull-to-refresh,
  `EmptyState` when the list is empty.
- `src/components/molecules/QrCode` — renders the Kartu Anggota QR as a remote **`<Image>`** from the
  generator service (`src/utils/qr.ts` `buildIdentityQrUrl(nrp)` → `https://qr.sakaraguna.com/generate?text=<NRP>&image_url=<logo>`),
  so a satuan logo can be embedded in the code centre. `text` = the member's NRP (`service_number`).
  Placeholder box (not a crash) when `value` is empty or the image fails. `props`: `value` / `size` /
  `style` (the old `color`/`backgroundColor` are gone; `react-native-qrcode-svg` is no longer used — dep
  can be dropped). **`QR_EMBED_IMAGE_URL` in `utils/qr.ts` is a placeholder ngrok dev URL — swap for a
  permanent production logo URL before release.**

The old `MemberHome` was a plain `MenuCard` catalog grid; that layout is gone.

### Health module (`petugas_kesehatan` role + member self-history)

Real backend (`/health/*` — see `API_CONTRACT.md` §9). Service layer: `src/services/api/health.service.ts`
(`ApiResponse`-style envelopes; list endpoints return `{ data, meta }`). Types: `src/types/health.types.ts`.
Endpoints need permission `health-officer.access` / role `petugas_kesehatan`|`tenant_admin`|`superadmin`
(backend 403); `GET /health/my` is member-only. `{personnel}` path param = **NRP**.

- `src/screens/Home/HealthOfficerHome/index.tsx` — role-based Home for `petugas_kesehatan`. Sync strip +
  greeting + 3 quick actions (Input Pemeriksaan → `healthPersonnelSearch` `{mode:'input'}`, Cari Anggota →
  `healthPersonnelSearch`, Lihat Dashboard → `healthDashboard`) + a compact `today_checked`/`month_total`
  `StatCard` pair + "Aktivitas Terbaru" (`GET /health/dashboard` `recent[]`). Re-fetches on tab focus
  (`useFocusEffect`) so a just-recorded exam shows up.
  All four screens below use the **canvas look** (`MainLayout variant="canvas"` + `subtitle`,
  `borderSoft`/`cardShadow` cards, `GradientButton` CTAs) — see DESIGN_SYSTEM.md §1b. `PersonAvatar`'s
  initials fallback is now a blue `GradientAvatar`; `DateTimeField` is canvas-styled.
- `src/screens/HealthDashboard/index.tsx` — full dashboard screen (same `/health/dashboard` data, pull-to-refresh).
- `src/screens/HealthPersonnelSearch/index.tsx` — debounced (`500ms`, min 2 chars) `GET /health/personnel/search`.
  Search row is `molecules/SearchFilterBar` (no filter button, `autoFocus`).
  `route.params.mode === 'input'` → result row goes straight to `healthRecordInput`; otherwise to
  `healthPersonnelProfile`.
- `src/screens/HealthPersonnelProfile/index.tsx` — `GET /health/personnel/{nrp}` (identity + `health_summary`)
  + `GET /health/personnel/{nrp}/records` (paginated, "muat lebih banyak"). "Catat Pemeriksaan" →
  `healthRecordInput`. Re-fetches on focus.
- `src/screens/HealthRecordInput/index.tsx` — create **and** edit (`route.params.recordId` set → PUT, else
  POST). The submit button is a **pinned footer** outside the ScrollView; the wrapper `View` gets
  `paddingBottom: useKeyboardHeight()` (`src/hooks/useKeyboardHeight.ts`) so both the footer and the
  scroll area lift above the keyboard — `KeyboardAvoidingView` is unreliable here (RN 0.87 + `edgeToEdgeEnabled=true`
  makes the manifest's `adjustResize` a no-op and `behavior="padding"/"height"` doesn't lift the content).
  ScrollView is `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode="interactive"`. Jenis
  pemeriksaan picked via a `BottomSheet` list
  (`GET /health/check-types`). `examined_at` is a single `Date` state driven by two `DateTimeField` molecules
  (native `@react-native-community/datetimepicker` — one `mode="date"`, one `mode="time"`, merged via
  `mergeDate` so each picker keeps the other half), serialized to ISO-8601 with the device tz offset by
  `toIsoWithOffset`; "set ke waktu sekarang" resets to now, future dates rejected client-side. In edit mode
  the check-type string from the detail is matched back to an `id` via check-types. Success/error via
  `StatusModal`; success pops back. **Attachment upload is not wired** (`createHealthRecordApi` accepts it,
  but no doc/image picker lib is installed) — see API_CONTRACT §9.
  <br>**Known backend bug:** `POST .../records` (create) rejects every valid `health_check_type_id` with
  `422 "Jenis pemeriksaan tidak valid."` while `PUT` (edit) accepts the identical value — FE sends plain
  JSON `{ health_check_type_id, examined_at, result, notes? }` and is correct; "catat baru" is blocked
  until backend fixes its `store` action. Edit works end-to-end (verified on device). See API_CONTRACT.md §9.
- `src/screens/HealthRecordDetail/index.tsx` — `GET /health/records/{id}` **for a health officer**. For a
  **member** viewing their own record, that endpoint 403s ("Hanya petugas kesehatan yang berwenang"), so
  `HealthMyHistory` passes the full record it already has from `/health/my` as `route.params.record` +
  `readOnly: true`; the screen then renders from the param and skips the fetch, pull-to-refresh, and the
  edit button. Canvas look (`MainLayout variant="canvas"` + `subtitle`). Detail rows + attachment card
  + "Ubah Pemeriksaan" `atoms/GradientButton` (officer only, and only when backend `can_edit` is true —
  FE never computes the 24h window itself).
  Attachment "Unduh" → `downloadHealthAttachment` (`src/utils/healthAttachment.ts`), which uses
  **`react-native-blob-util`** (added dependency — needs `pod install` + a native rebuild): Android →
  system DownloadManager into the public Downloads folder with a notification; iOS → file-cache +
  `ios.previewDocument` share sheet. Auth header from `healthAuthHeader()` (live token). Reachable by both a
  health officer and the member who owns the record (backend enforces).
- Shared molecules: `HealthRecordCard` (one exam summary row → `healthRecordDetail`, `hideExaminer` prop for
  the member's own list); `PersonAvatar` (real `SecureImage` photo, else a blue `atoms/GradientAvatar`
  initials fallback — DESIGN_SYSTEM §5.8; `size` is a small union `40|44|48|64` because FastImage's
  `ImageStyle` type only accepts static numeric `StyleSheet` styles here — dynamic width/height/flex
  fail tsc); `DateTimeField` (native date/time picker field, canvas-styled, generic — reuse for any
  future date input).
- Routes added to `ROUTES` / `RootStackParamList` / `RootNavigator`: `healthDashboard`,
  `healthPersonnelSearch`, `healthPersonnelProfile`, `healthRecordInput`, `healthRecordDetail`,
  `healthMyHistory` (all plain stack screens, no guard — reached from within the tab navigator like the
  catalog screens).

### Personnel/persit/vehicle photos — `SecureImage`

`src/components/atoms/SecureImage` is the one component for rendering a `photo` field from the API. It takes
the **raw** `path` (not a pre-resolved URL) and:
- resolves it via `resolveSecureFileUrl` (`src/utils/avatar.ts`) — absolute URLs pass through; anything else
  is normalised to `<Config.API_BASE_URL>/secure-files/<tail>` (handles `/admin/secure-files/x`,
  `secure-files/x`, bare `x`).
- attaches `Authorization: Bearer <token>` **only** for URLs under our own API host (`isProtectedApiUrl`) —
  never to third-party hosts. Token comes from `getAuthToken()` (live AsyncStorage value), not
  `state.auth.token` (which goes stale after a background refresh-token rotation); the redux value seeds the
  first render. RN's `<Image>` supports `source.headers` on both platforms, so **no native image lib / rebuild**.
- Callers gate rendering with `isDisplayablePhoto(path)` before mounting `SecureImage`, falling back to their
  own initials avatar otherwise.

`isDisplayablePhoto` returns **false for backend avatar placeholders**: for personnel with no real
upload the backend fills `photo` with a placeholder — historically a `https://ui-avatars.com/api/?name=...`
URL, now an inline `data:image/svg+xml;base64,...` (a 1-letter initial on a coloured square). Both are
**SVG**, which RN's Fresco decoder rejects ("unknown image format"), so `isDisplayablePhoto` rejects
`ui-avatars.com` **and** `data:image/svg+xml` URIs — those fall back to the component's own initials /
`GradientAvatar`. Real photos (`/api/secure-files/...` paths, raster URLs) load normally.
`GET /catalog/personnel` **does** return `photo` now (mapped into `CatalogListItem.photo` in
`catalogResources.tsx`); `CatalogList`'s `ListAvatar` and the catalog `detailHeader.photo` use the same gate.

Consumers: `MemberIdCard`, `HomeHeader`, `Profile`, `CatalogDetail` header. `resolveMediaUrl` was removed.

### FilterSheet, tracking, notifications, emergency

- `src/components/organisms/FilterSheet` — generic chip-group bottom sheet (`FilterField[]` = `{ key, label,
  options[] }`), used by `CatalogList` and `PersonnelTracking`. `catalogResources.tsx` aliases
  `CatalogFilterField = FilterField`. (Was `src/screens/CatalogList/FilterSheet` — promoted.)
- `src/screens/PersonnelTracking/index.tsx` — mobile list version of the "tracking semua anggota" table. Real
  data: `GET /locations/overview` (`fetchAllOverview` loops every page since search is client-side over the
  whole unit). Server-side `status` filter via `FilterSheet`; client-side search over name/NRP/rank/unit. Row
  → `catalogDetail` personnel. Reached from the "Peta Personel" quick action; the fullscreen map
  (`ROUTES.personnelMap`) is still reachable from the dashboard's "Lihat Peta Lengkap".
- `src/screens/Notifications/index.tsx` — bell icon in `HomeHeader` opens this (badge =
  `state.notifications.unreadTotal`). **Real `GET /notifications`** via `notificationSlice` — list, pull-to-
  refresh, `onEndReached` "muat lebih banyak" (via `meta`), header "Tandai semua" → `markAllNotificationsRead`.
  Tap row → `markNotificationRead` + **`organisms/MessageDetailSheet`** (read-full bottom sheet — rows are
  clamped to 1–2 lines; no detail endpoint, all text is from the list payload). If the item has an `action`,
  the sheet shows a button (`emergency` → `emergencyDetail`, `emergency_list` → `emergencyList`). Used by
  **both komandan and anggota**. Contract `API_CONTRACT.md` §3. Row icon chip: `emergency`/
  `announcement`/`info` render `atoms/GradientIconChip` (DESIGN_SYSTEM.md §5.13b); any type whose
  string **contains** `"disposition"` (backend sends several inconsistent ones — `disposition_completed`,
  `disposition_recipient_completed`, `disposition_follow_up`, `letter_disposition`, none of them
  documented in `API_CONTRACT.md` — checked via substring, not an exact list, so a future variant is
  covered automatically) also gets a gradient chip (`mail` icon, personnel gradient); `system` stays
  the old flat tint chip on purpose (no strong colour identity).
- `src/screens/Announcements/index.tsx` — `ROUTES.announcements`, opened from "Lihat Semua" under
  "Pengumuman Terbaru" on **both** Homes + the MemberHome "Pengumuman" shortcut (no longer points at
  Notifications). Full `GET /announcements` list via `announcementSlice` — pull-to-refresh, "muat lebih
  banyak", each row clamped + tap → `MessageDetailSheet` (title + full body + sender/time/`scope_label`).
  Row icon = `atoms/GradientIconChip` (`typeMeta.*.gradient`, DESIGN_SYSTEM.md §5.13b) — no flat
  fallback here (unlike `Notifications`), since every `AnnouncementType` has a defined gradient pair.
- `src/components/organisms/MessageDetailSheet` — shared read-full `BottomSheet` for clamped notification /
  announcement rows: icon chip (`GradientIconChip` when the caller passes `gradientColors`, else the
  old flat tint) + title + meta lines + scrollable body (`maxHeight` 320) + optional `GradientButton`
  action. No API — fed entirely from the list item.
- `src/screens/SendAnnouncement/index.tsx` — "Kirim Pengumuman" quick action. Form (Judul, Isi + char
  counter, Tipe/Kirim-ke via `SegmentedControl`) → `createAnnouncement` thunk → `POST /announcements`
  (`target.scope` from the "Kirim ke" toggle, but **`unit_ids: []` / `role: null` always** — no unit/role
  picker yet, see `API_CONTRACT.md` §2.4). Success `StatusModal` → "Lihat Pengumuman" opens `ROUTES.announcements`
  (not Notifications). "Riwayat Terkirim" shows the top 3 of `announcementSlice.items` (`GET /announcements`,
  not `/mine`); the "Lihat semua ›" link navigates to `ROUTES.announcements` (was an expand/collapse toggle) —
  no per-item delete. `typeMeta` colours/icons match `screens/Announcements`.
- `src/screens/AlarmSatuan/index.tsx` — "Alarm Satuan" quick action. **Real API** (`stellingAlarm.service.ts`):
  `GET /stelling-alarms/current` + `/stelling-alarms` + `/stelling-alarms/history`. Current activation card
  tinted by the code's `color`, activation history w/ `broadcast_status` pill. Each **"Kode Alarm Stelling"**
  row is a `PressableScale` (disabled when `!code.is_active`) → confirm `StatusModal` (`variant="error"`) →
  `activateStellingAlarmApi(code.id)` (`POST /stelling-alarms/{alarm}/activate`, no body — komandan only,
  backend enforces) → result `StatusModal` + `load('refresh')`. No in-app audio playback of `audio_url` —
  needs a native audio lib (see `API_CONTRACT.md` §2.5).
- `src/screens/EmergencyList/index.tsx` — **real `GET /panic-buttons`** (`getPanicButtonsApi`). Pull-to-
  refresh + `onEndReached` "muat lebih banyak" (`per_page=20`, via `meta`), `FilterSheet` status filter
  (`active`/`acknowledged`/`resolved` → query `status`). Row → `ROUTES.emergencyDetail` `{ id }`.
- `src/screens/EmergencyDetail/index.tsx` — **new** (`ROUTES.emergencyDetail`, param `{ id }`). `GET
  /panic-buttons/{id}` (identity + status badge, time/location/accuracy/description/`handled_by`,
  `OpenMapsButton`, "Kronologi" from `timeline[]`). Status update (`PATCH /panic-buttons/{id}`) —
  **`komandan` role only**: "Tandai Ditangani" (→ `acknowledged`) / "Tandai Selesai" (→ `resolved` + optional
  note `TextField`), success/error `StatusModal`. `handled_by` accepts `{id,name}` or a bare string.
  `emergencyStatusLabel`/`emergencyStatusBadgeVariant` maps are duplicated in both EmergencyList/Detail
  (small, deliberately not shared).
- `src/utils/format.ts` `formatRelativeTime()` — Indonesian relative time, floored, second → minute → hour →
  day → week → month → year ("5 detik lalu", "2 minggu lalu", …).
- `src/components/molecules/LocationStatusBadge` + exported `locationStatusMeta` — **the single source of
  truth** for location-status label + color everywhere (`LocationPanel`, `PersonnelTracking`, `Profile`'s
  "Posisi Saya"): `fresh` → green "Fresh (Nx lalu)", `stale` → amber "Stale (Nx lalu)", `offline` → grey
  "Belum Ada Data". The "(Nx lalu)" ticks every second via `src/hooks/useSecondsTick.ts` (one shared 1s
  interval fanned out to all subscribers; interval only runs while ≥1 badge is mounted). `useSecondsTick`
  takes an `enabled` arg — the badge passes `status !== 'offline' && !!timestamp`, so an `offline` badge (no
  relative time shown) fully unsubscribes instead of re-rendering every second; matters in a long
  `PersonnelTracking` list where dozens of offline badges would otherwise all re-render each tick. Don't
  hand-roll status label/colour maps — import `locationStatusMeta`.
- **`documentation/`** — the full API reference (every endpoint the app calls, working or dummy)
  **plus the app changelog**. Markdown sources: `API_CONTRACT.md`, `STYLE_GUIDE.md` (author-only), and
  `CHANGELOG.md`. `regen-html.py` renders **two** deployable pages — `index.html` (from
  `_viewer.template.html` + `API_CONTRACT.md`) and `changelog.html` (from `_changelog.template.html` +
  `CHANGELOG.md`) — both self-contained (markdown + logo inlined) and sharing one topbar with an
  **API Contract / Changelog** nav (`.navlinks`, same markup in both templates). Run
  `python3 documentation/regen-html.py` after editing either `.md`, the `CHECKED` date, or a template.
  `CHANGELOG.md` follows the Claude-changelog format — `## <version> (versionCode N)` per release
  (newest first), an optional `_date_` line, then `### Baru` / `### Ditingkatkan` / `### Perbaikan`
  bullet lists; `## Belum dirilis` accumulates unreleased notes.
  **Per-release length cap:** the text the changelog's **Salin** button copies for each release
  must be **< 1500 chars** (newlines + full stops included). `regen-html.py`'s
  `guard_changelog_copy_length()` replicates the template's `copyTextFor()` (release title + category
  names + bullets, markdown stripped, wrapped continuation lines joined with one space, empty
  categories skipped) and **aborts the build** if any release exceeds it — condense the bullets.
  It prints each release's count on every run.

  **Release flow / how "what's in this release" is derived:**
  - Each release commit is git-tagged `v<versionName>` (e.g. `v0.4.0` → commit `9b79902`). The tag is
    the authoritative boundary — `git log --first-parent v<prev>..HEAD` + `git diff --stat` is how a
    later "summarise the new release" request is answered accurately. `versionName`/`versionCode` in
    `android/app/build.gradle` are bumped **in that same tagged commit**, not earlier (debug builds
    must keep reporting the shipped version, and the `/app-version` gate compares against it).
  - When landing a **user-facing** change, add a one-line bullet to `## Belum dirilis` (Baru /
    Ditingkatkan / Perbaikan) **in the same change** — the curated companion to the git log. This is
    a per-change edit, not an autonomous doc sweep. (As of 2026-09-03 `## Belum dirilis` is
    deliberately empty — the user chose not to backfill the Buku Saku + release-notes-popup work;
    those still surface via `git log v0.4.0..HEAD`.)
  - At release: rename `## Belum dirilis` → `## v<next> (versionCode N)` + `_date_`, add a fresh empty
    `## Belum dirilis`, bump `build.gradle`, `python3 documentation/regen-html.py`, build, tag.

  `changelog.html` renders each release
  as a card with a **Salin** button (copies that release's notes as plain text) + a "rilis terbaru" bar
  showing the APK filename (`regen-html.py` reads `versionName`/`versionCode` from
  `android/app/build.gradle`). Release APKs auto-copied into `documentation/` by `assembleRelease` are
  `*.apk`-gitignored + vercelignored. `_changelog.template.html` / `_viewer.template.html` /
  `regen-html.py` / `STYLE_GUIDE.md` / `*.apk` are all in `.vercelignore`.
  `API_CONTRACT.md` is the single source of truth — split into four
  `#`-delimited **role sections** `# Umum` / `# Komandan` / `# Anggota` / `# Petugas Kesehatan`,
  each `#` becoming a TOC accordion group; `##` ("poin") + `###` ("sub-poin")
  numbering is written **local** per section (`## 4.`, `### 4.3`) and the viewer prepends the section
  ordinal for display — `## 4.` in section 2 shows as `2.4`, `### 4.3` as `2.4.3`, sections as `1.`/`2.`…)
  and `STYLE_GUIDE.md` (author-only format spec — the poin/sub-poin vocabulary, where the status
  badge goes, the fixed per-endpoint field order: callout → endpoint chip → **Query param table** +
  **Payload param table** (separate `| Parameter | Tipe | Wajib | Keterangan |` tables, or
  `**Tanpa parameter.**`) → **`**Response `<code>`:**` + a ` ```json ` block** (mandatory — never prose)
  → notes, plus a copy-paste skeleton). Read `STYLE_GUIDE.md` before adding or restructuring a
  section, and put a new endpoint in the right role section. Keep `API_CONTRACT.md` updated when a
  surface gets wired / a status changes. (`API_CONTRACT_ANGGOTA.md` was merged in and the file was
  re-split by role 2026-09-02.)
  Each endpoint carries a status callout — a blockquote starting with `[!DONE]` / `[!PARTIAL]` /
  `[!BUG]` / `[!TODO]` (rendered in the viewer as a coloured badge + a matching text label —
  Selesai/Catatan/Error/Belum — on its TOC entry, and each section body wrapped in a white "kartu" card).
  Put the callout on the **deepest** heading: if a `##` poin has `###` sub-poin, the callout goes on
  each `###`, **not** the parent — and the parent `##` gets **no status badge at all** (its TOC row stays
  blank; status is read from the sub-poin — no aggregate/count badge on poin). A `##` with no `###`
  carries its own callout directly. The **section** (`#`) TOC group header shows one pill per
  non-`done` status with its count (`2 Error`, `1 Belum`; order `bug` > `todo` > `partial`), or a
  single `Selesai` pill when every sub-poin is done (groups are accordions, collapsed by default). Update the callout when integration status changes. `STYLE_GUIDE.md` is author-only — it is
  in `.vercelignore` and not inlined into `index.html`. The "Pengecekan terakhir" date shown top-right in
  the viewer header is the `CHECKED` constant in `regen-html.py` — bump it whenever you do a status sweep
  (keep the `**Pengecekan terakhir: …**` line in `API_CONTRACT.md` in sync). `_viewer.template.html` +
  `regen-html.py` inline `API_CONTRACT.md` **and** `documentation/LogoIcon.png` (base64, used as favicon +
  header/intro logo — all three build inputs are in `.vercelignore`) into a single self-contained
  `index.html` reviewer (run `python3 documentation/regen-html.py` after editing the `.md`, the date, or
  the logo — `index.html` is the committed output). The viewer TOC has a free-text search (matches
  title + number + the endpoint paths under each sub-poin) and status-filter chips
  (Selesai/Catatan/Error/Belum). The template + `index.html` are a full HTML doc (`<!doctype>` → `<head>` → `<body>`)
  so VS Code Live Server can inject its reload script.
  `index.html` + `vercel.json` + `.vercelignore` make the folder deployable as a standalone Vercel static
  site (set the Vercel project's **Root Directory** to `documentation`, framework preset "Other", no build
  step); `X-Robots-Tag`/`<meta robots>` keep it out of search indexes.

### Component conventions (atomic design under `src/components/`)

Every component is a **folder** with a single `index.tsx` (never a flat `Name.tsx`). Layers:
`atoms/` → `molecules/` → `organisms/` → `templates/`, all generic/reusable and free of business logic or data
fetching. `src/screens/<ScreenName>/index.tsx` is the RN equivalent of a web "page" — one per route. A
`screens/<ScreenName>/<SubSection>/index.tsx` sub-folder is only for markup that's *not* reusable outside that
one screen.

Required patterns (see `src/components/atoms/Button` and `TextField` as the canonical examples):

1. Props as an exported named interface (`export interface XxxProps { ... }`), extending the relevant React
   Native props type (`PressableProps`, `TextInputProps`, ...), never `HTMLAttributes`.
2. Visual variants use a union type + a `Record<Variant, ViewStyle | string>` style/color map — never
   `if`/`switch` branching on variant.
3. Default export: `export default function Xxx(props: XxxProps) { ... }`.
4. Styles are combined via the RN array form: `style={[styles.base, variantStyle, isX && styles.x, style]}`
   (falsy entries are ignored by RN — no need for a `.filter(Boolean).join()` step like the old className
   approach). When the root element is a `Pressable` wrapping an animated `MotiView` (as in `Button`), the
   caller's incoming `style` prop must be applied to the outer `Pressable`, not the inner `MotiView` — a
   layout style like `flex: 1` or `width: '100%'` on the inner view has no effect if the outer `Pressable`
   (the actual flex item in the parent layout) has no size of its own to stretch from.
5. Components that forward a ref to a native element type it as
   `forwardRef<ComponentRef<typeof Pressable /* or TextInput */>, Props>(...)` — plain `View`/`TextInput` type
   imports don't line up with RN 0.87's host-component ref types, `ComponentRef<typeof X>` does.
6. Color-bearing styling goes through `theme/colors.ts`'s `colors` constant inside each component's
   `StyleSheet.create({...})` — never an inline hardcoded hex, with the same exception RN itself requires for
   props that take a color *value* rather than a style (`ActivityIndicator` color prop, `TextInput`
   `placeholderTextColor`, `react-native-svg` stroke/fill, the custom tab bar's `tabBarStyle`).
7. Interactive elements are built on `Pressable`, not `TouchableOpacity` — and specifically on
   `src/components/atoms/PressableScale` (a `Pressable` + `MotiView` wrapper that scales its content down
   on press using `pressTransition`), not a bare `Pressable`. This applies to **everything** tappable:
   buttons, cards, icon-only buttons, list rows, and clickable text/links alike — not just things that look
   like "buttons". `Button`, `MenuCard`, and `EmergencyTabButton` are built on top of `PressableScale`
   internally; use it directly for anything else (nav-bar back arrows, text links like "Lupa password?",
   accordion headers, list rows). Pass `style` for the outer `Pressable`'s layout (matches point 4 above)
   and `contentStyle` for the inner animated view's visual styling; `scaleTo` defaults to `0.96` (smaller,
   e.g. `0.94`, for bigger/heavier elements like the floating Emergency tab button). Do not hand-roll the
   `useState` + `onPressIn`/`onPressOut` + `MotiView` press-scale boilerplate at a call site — that's exactly
   what this primitive exists to centralize.
8. Entrance/transition animation uses `moti`'s `<MotiView from={...} animate={...} transition={...}>`. Shared
   transition presets live in `src/utils/motion.ts` — **use those, don't inline `{ type: 'timing', duration }`
   objects.** Moti 0.30's `MotiTransitionProp` type intersects awkwardly with reanimated v4's `WithSpringConfig`
   union and produces false-positive type errors when a transition literal is passed inline; the presets in
   `motion.ts` are pre-cast to `MotiTransitionProp<any>` to work around this once, centrally.
9. `MainLayout` re-triggers its entrance animation on tab focus via `useIsFocused()` + a `key` remount trick —
   follow this pattern for any other screen that should replay its animation each time it regains focus.
10. Result/error feedback to the user (success/failure of an action, a blocking permission prompt) uses
    `src/components/organisms/StatusModal` — instead of `Alert.alert`, so feedback is styled consistently.
    It follows the canvas look (DESIGN_SYSTEM.md §5.15): radius-24 card, a 64px SVG-gradient icon badge on a
    `haloPrimary`/`haloDanger` ring (stroke `check` / `alert-triangle` glyph), `atoms/GradientButton` primary
    action (`height` prop, 52 here) + inline white pill secondary. Same `{ visible, variant, title, message,
    primaryAction, secondaryAction }` API, plus optional `icon` and `details` (scrollable left-aligned long
    text — see the App-version section). Artboards: "Emergency Popup" (success, 1 button) / "Settings Popup"
    (error, 2 buttons) / "Update Wajib (popup)" (success + `details`).

### Types

`src/types/<domain>.types.ts` per domain, barrelled through `src/types/index.ts`
(`export * from "./x.types"`) — import from `@/types`, not the individual file, from outside `src/types/`.

### Display formatting — `src/utils/format.ts`

All user-facing text derived from API fields goes through the helpers in `src/utils/format.ts`.
Never hand-format nullable values inline.

- **`cleanValue(v)`** is the base normaliser: `null` / `''` / whitespace / a lone `-` / `–` / `—`
  → `null`. The backend sends `"-"` (and sometimes en/em-dash) as an "empty field" placeholder and
  JS `??` / `||` do **not** catch a non-empty `"-"` string — so a raw `value ?? 'fallback'` on such
  a field leaks `"-"` into the UI. `orDash`, `joinFields`, `formatBirth` are all built on it.
- **`orDash(v)`** → the cleaned value or `'-'`. Use for a standalone field (`InfoRow` value, etc.).
- **`joinFields(...values)`** → cleans every value, drops the empties, joins survivors with `" · "`.
  This is the **only** correct way to render `${a} · ${b}`. **Never** write
  `{a ?? '-'} · {b ?? '-'}` (or a template-literal `·` / `,` / `( )` join) in a component — if `a`
  is missing you get a dangling `- · b` / `, b` / `(-)`. Add `|| '-'` (or `|| requiredFallback`)
  after `joinFields(...)` when the whole line must never be blank.
- For a `??` fallback on a field that could be `"-"` (e.g. `movement.note ?? 'Masuk Markas'`), write
  `cleanValue(movement.note) ?? 'Masuk Markas'`. For name joins,
  `[cleanValue(rank), cleanValue(name)].filter(Boolean).join(' ')`.
- `formatDateTime` / `formatRelativeTime` return `null` (not `'-'`) when empty, so they compose with
  `joinFields`. A "date (relative)" style line: guard it (`const abs = formatDateTime(x); if (!abs)
  return '-'; const rel = formatRelativeTime(x); return rel ? \`${abs} (${rel})\` : abs;`) — see
  `formatWaktu` in `EmergencyDetail`.

### Env vars

`.env` (gitignored) read via `react-native-config`'s `Config` import; `.env.example` documents the shape.
Android needs `apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"` in
`android/app/build.gradle` (already added) — iOS wiring is handled by the pod's own build-phase script, no
manual Xcode project edits needed.
