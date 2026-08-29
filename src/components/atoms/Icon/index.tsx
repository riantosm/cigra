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
  | 'eye-off'
  | 'id-card'
  | 'rank'
  | 'cake'
  | 'blood-drop'
  | 'map-pin'
  | 'phone'
  | 'briefcase'
  | 'building'
  | 'calendar'
  | 'shield-check'
  | 'mail'
  | 'chevron-down'
  | 'arrow-left'
  | 'car'
  | 'users';

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
  'id-card':
    'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM7.5 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM4.5 17c.4-2 1.7-3 3-3s2.6 1 3 3M14 9h6M14 13h4',
  rank: 'M4 15.5 12 9l8 6.5M4 19.5 12 13l8 6.5',
  cake: 'M5 20h14M6 20v-6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6M9 12V7M9 7c-.9-.8-.9-2 0-3M15 12v-2',
  'blood-drop': 'M12 3s7 7.6 7 12a7 7 0 1 1-14 0c0-4.4 7-12 7-12Z',
  'map-pin':
    'M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12ZM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  phone:
    'M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 4c0-.6.4-1 1-1h3.2c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8Z',
  briefcase:
    'M3 8h18a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1ZM8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20',
  building:
    'M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 21v-9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v9M4 21h16M7 7h2M7 11h2M7 15h2M11 7h2M11 11h2M11 15h2',
  calendar:
    'M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z',
  'shield-check': 'M12 3l8 3v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3ZM9 12l2 2 4-4',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3.5 6.5 12 13l8.5-6.5',
  'chevron-down': 'M6 9l6 6 6-6',
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  car: 'M3 17v-5l2-5h10l3 5h1a1 1 0 0 1 1 1v4H3ZM5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM21 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  users:
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 20a6.5 6.5 0 0 1 13 0M17 11a3 3 0 1 0 0-6M21.5 20a6.5 6.5 0 0 0-5.5-6.4',
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
