import Config from 'react-native-config';

// `LogoIcon` mengikuti `BRAND` di `.env` secara otomatis — lihat CLAUDE.md "App branding
// (multi-brand)". Tambah brand baru = tambah satu entri di sini, tidak ada pemanggil lain
// (`HomeHeader`, `AcademyHeader`, `NavBar`, `Login`, `AppBootstrap`) yang perlu diubah.
const LOGOS = {
  sakaraguna: require('./LogoSakaraguna.png'),
  cigra: require('./LogoCigra.png'),
} as const;

export const LogoIcon = LOGOS[Config.BRAND as keyof typeof LOGOS] ?? LOGOS.sakaraguna;
