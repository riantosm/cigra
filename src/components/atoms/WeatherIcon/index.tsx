import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';

import Icon from '@/components/atoms/Icon';
import { colors } from '@/theme/colors';

export interface WeatherIconProps {
  // `icon_url` dari BMKG (SVG). Null/gagal → jatuh ke glyph matahari lokal.
  url: string | null | undefined;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

// Ikon cuaca resmi BMKG dirender langsung dari URL SVG-nya (atribusi sumber tetap di layar).
// react-native-svg sudah terpasang → tidak perlu rebuild native.
export default function WeatherIcon(props: WeatherIconProps) {
  const { url, size = 48, style } = props;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const showFallback = !url || failed;

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      {showFallback ? (
        <Icon name="sun" size={size * 0.8} color={colors.warning} />
      ) : (
        <SvgUri
          uri={url ?? null}
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
