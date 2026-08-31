import { useState } from 'react';
import { StyleSheet } from 'react-native';

import GradientAvatar from '@/components/atoms/GradientAvatar';
import SecureImage from '@/components/atoms/SecureImage';
import { colors } from '@/theme/colors';
import { isDisplayablePhoto } from '@/utils/avatar';

export type PersonAvatarSize = 40 | 44 | 48 | 64;

export interface PersonAvatarProps {
  photo: string | null | undefined;
  name: string;
  size?: PersonAvatarSize;
}

// Avatar bundar dengan fallback inisial gradient (DESIGN_SYSTEM §5.8) — dipakai di semua layar
// modul kesehatan. Ukuran dibatasi ke beberapa nilai tetap (StyleSheet numerik) supaya tipe
// style FastImage/SecureImage tetap valid.
export default function PersonAvatar(props: PersonAvatarProps) {
  const { photo, name, size = 48 } = props;
  const [failed, setFailed] = useState(false);

  if (!isDisplayablePhoto(photo) || failed) {
    return (
      <GradientAvatar
        label={name.trim().charAt(0).toUpperCase() || '?'}
        gradientStart={colors.gradientPrimaryStart}
        gradientEnd={colors.gradientPrimaryEnd}
        size={size}
      />
    );
  }

  return <SecureImage path={photo} style={sizeStyles[size]} onLoadError={() => setFailed(true)} />;
}

const sizeStyles = StyleSheet.create({
  40: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySurface },
  44: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySurface },
  48: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySurface },
  64: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySurface },
});
