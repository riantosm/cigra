import Svg, { Path } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'profile'
  | 'logout'
  | 'history'
  | 'emergency'
  | 'handbook'
  | 'entry-exit'
  | 'weapon'
  | 'heartbeat'
  | 'eye'
  | 'eye-off';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

const pathByName: Record<IconName, string> = {
  home: 'M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  history: 'M12 8v4l3 2M20 12a8 8 0 1 1-3-6.2M20 4v4h-4',
  emergency: 'M12 3 4 7v5c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V7l-8-4ZM12 9v4M12 16.5v.01',
  handbook:
    'M6 4h11a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V4ZM6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2M9 8h6',
  'entry-exit': 'M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M14 8l4 4-4 4M18 12H9',
  weapon: 'M3 21 12 12M13 3l8 8-2.5 2.5L10 5l3-2ZM7 14l3 3-2 2-3-3 2-2Z',
  heartbeat: 'M3 12h4l2-6 4 12 2-6h6',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0Z',
  'eye-off':
    'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1 23 23',
};

export default function Icon(props: IconProps) {
  const { name, size = 22, color = '#000000' } = props;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={pathByName[name]}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
