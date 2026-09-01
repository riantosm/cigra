import { useState } from 'react';
import { Linking } from 'react-native';

import StatusModal from '@/components/organisms/StatusModal';
import { useAppVersionGate } from '@/hooks/useAppVersionGate';

// Modal cek versi aplikasi (documentation/API_CONTRACT.md §1.3), dipasang global di RootNavigator
// supaya juga muncul sebelum login. Tidak me-render apa pun kalau versi terpasang masih didukung.
//
// - Update WAJIB   → modal non-dismissable, bertema primary/biru + ikon "download", satu tombol
//   "Update" yang membuka download/store URL (kalau belum ada URL, cek ulang endpoint).
// - Update DISARANKAN → modal biasa, "Update" + "Nanti" (skip versi itu, disimpan di AsyncStorage).
// - Di build debug (`__DEV__`) modal wajib tetap tampil untuk verifikasi tapi diberi aksi
//   sekunder "Lewati (dev)" supaya app tetap bisa dipakai saat pengembangan.
export default function AppVersionGate() {
  const { status, info, dismissSuggested, recheck } = useAppVersionGate();
  const [devSkipped, setDevSkipped] = useState(false);

  if (!info || status === 'none' || (status === 'required' && devSkipped)) return null;

  const updateUrl = info.download_url ?? info.store_url;
  const openUpdate = () => {
    if (updateUrl) Linking.openURL(updateUrl).catch(() => {});
    // Belum ada URL rilis dari backend — cek ulang; AppState `active` juga otomatis cek ulang.
    else recheck();
  };

  const releaseNotes = info.release_notes?.trim();
  const isRequired = status === 'required';

  const versionLabel = `versi ${info.latest_version}${
    typeof info.latest_build === 'number' ? ` (build ${info.latest_build})` : ''
  }`;
  const message = [
    isRequired
      ? `Aplikasi yang terpasang sudah usang. Perbarui ke ${versionLabel} untuk melanjutkan.`
      : `Pembaruan ${versionLabel} sudah tersedia.`,
    releaseNotes,
  ]
    .filter(Boolean)
    .join('\n\n');

  return (
    <StatusModal
      visible
      variant="success"
      icon="download"
      title={isRequired ? 'Update Wajib' : 'Update Tersedia'}
      message={message}
      onRequestClose={isRequired ? () => {} : dismissSuggested}
      primaryAction={{ label: 'Update', onPress: openUpdate }}
      secondaryAction={
        isRequired
          ? __DEV__
            ? { label: 'Lewati (dev)', onPress: () => setDevSkipped(true) }
            : undefined
          : { label: 'Nanti', onPress: dismissSuggested }
      }
    />
  );
}
