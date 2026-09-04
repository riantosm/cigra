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
  | 'chevron-up'
  | 'arrow-left'
  | 'car'
  | 'users'
  | 'settings'
  | 'bell'
  | 'crosshair'
  | 'chevron-right'
  | 'megaphone'
  | 'clipboard-check'
  | 'send'
  | 'sun'
  | 'alert-triangle'
  | 'info'
  | 'refresh'
  | 'clock'
  | 'bar-chart'
  | 'grid'
  | 'academy'
  | 'brain'
  | 'bulb'
  | 'heart'
  | 'heart-pulse'
  | 'play'
  | 'bank'
  | 'medal'
  | 'sliders'
  | 'waves'
  | 'ruler'
  | 'target'
  | 'run'
  | 'trending-up'
  | 'arrow-right'
  | 'arrow-up'
  | 'search'
  | 'close'
  | 'filter'
  | 'broadcast'
  | 'trash'
  | 'flag'
  | 'layers'
  | 'globe'
  | 'lock'
  | 'qr-code'
  | 'paperclip'
  | 'file'
  | 'download'
  | 'check';

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
  emergency:
    'M12 3 4 7v5c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V7l-8-4ZM12 9v4M12 16.5v.01',
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
  'shield-check':
    'M12 3l8 3v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3ZM9 12l2 2 4-4',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3.5 6.5 12 13l8.5-6.5',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M6 15l6-6 6 6',
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  car: 'M3 17v-5l2-5h10l3 5h1a1 1 0 0 1 1 1v4H3ZM5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM21 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  users:
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 20a6.5 6.5 0 0 1 13 0M17 11a3 3 0 1 0 0-6M21.5 20a6.5 6.5 0 0 0-5.5-6.4',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z M13.73 21a2 2 0 0 1-3.46 0',
  crosshair:
    'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z M22 12h-4M6 12H2M12 6V2M12 22v-4',
  'chevron-right': 'M9 6l6 6-6 6',
  megaphone:
    'M3 11v2a1 1 0 0 0 1 1h2l4 3V7L6 10H4a1 1 0 0 0-1 1Z M14 8a4 4 0 0 1 0 8M17 5a8 8 0 0 1 0 14',
  'clipboard-check':
    'M9 4a1 1 0 0 0-1 1v1H7a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1V5a1 1 0 0 0-1-1Z M8.5 13l2 2 4-4',
  send: 'M22 2 11 13M22 2 15 22 11 13 2 9 22 2Z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  'alert-triangle':
    'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z M12 9v4M12 17h.01',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 16v-4M12 8h.01',
  refresh: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 6v6l4 2',
  'bar-chart': 'M4 20V10M12 20V4M20 20v-7',
  grid: 'M4 4h7v7H4Z M13 4h7v7h-7Z M4 13h7v7H4Z M13 13h7v7h-7Z',
  academy: 'M2 9l10-4 10 4-10 4L2 9ZM6 11v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5M22 9v5',
  brain:
    'M12 5.5a3 3 0 0 0-5.9-.7A2.6 2.6 0 0 0 3.6 8 2.6 2.6 0 0 0 4 13a2.6 2.6 0 0 0 2.5 4 2.7 2.7 0 0 0 5.5-.6V5.5ZM12 5.5a3 3 0 0 1 5.9-.7A2.6 2.6 0 0 1 20.4 8 2.6 2.6 0 0 1 20 13a2.6 2.6 0 0 1-2.5 4 2.7 2.7 0 0 1-5.5-.6',
  play: 'M7 4l13 8-13 8V4Z',
  bulb: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z',
  heart: 'M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 3c0 4.5-9.5 12-9.5 12Z',
  'heart-pulse':
    'M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 3M4 12h3l2-3 2 5 2-3h6',
  bank: 'M3 10 12 4l9 6M4 10v10M20 10v10M8 13v5M12 13v5M16 13v5M3 20h18',
  medal: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM8.5 13.5 7 22l5-3 5 3-1.5-8.5',
  sliders: 'M4 9v6M8 7v10M16 7v10M20 9v6M8 12h8',
  waves:
    'M2 7c1.6 0 1.6 1.6 3.2 1.6S6.8 7 8.4 7 10 8.6 11.6 8.6 13.2 7 14.8 7s1.6 1.6 3.2 1.6S19.6 7 21.2 7M2 13c1.6 0 1.6 1.6 3.2 1.6S6.8 13 8.4 13 10 14.6 11.6 14.6 13.2 13 14.8 13s1.6 1.6 3.2 1.6S19.6 13 21.2 13M2 19c1.6 0 1.6 1.6 3.2 1.6S6.8 19 8.4 19 10 20.6 11.6 20.6 13.2 19 14.8 19s1.6 1.6 3.2 1.6S19.6 19 21.2 19',
  ruler: 'M4 8 8 4l12 12-4 4L4 8ZM8 8l1.5 1.5M11 11l1.5 1.5M14 14l1.5 1.5',
  target:
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  run: 'M14 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4M6 21l3-6 4 1 1-4M13 12l4 2 3-3M8 10l-3 1',
  'trending-up': 'M3 17l6-6 4 4 8-8M15 7h6v6',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-up': 'M12 20V6M6 12l6-6 6 6',
  search: 'M3 11a8 8 0 1 0 16 0 8 8 0 1 0 -16 0 M21 21l-4.35-4.35',
  close: 'M18 6 6 18 M6 6l12 12',
  filter: 'M4 5h16M7 12h10M10 19h4',
  broadcast:
    'M12 12v.01M9 9.5a3.5 3.5 0 0 0 0 5M15 9.5a3.5 3.5 0 0 1 0 5M6.5 7a7 7 0 0 0 0 10M17.5 7a7 7 0 0 1 0 10',
  trash:
    'M4 7h16M10 11v6M14 11v6M6 7l1 12.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1L18 7M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3',
  flag: 'M5 21V4M5 4c3-2 6 2 9 0s5-1 5-1v10s-2 1-5 1-6-2-9 0',
  layers: 'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5',
  globe:
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z',
  'qr-code':
    'M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4ZM14 14h2.5v2.5H14ZM17.5 17.5H20V20h-2.5ZM14 17.5V20M20 14v2.5',
  paperclip:
    'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  file: 'M14 3v5h5M8 3h7l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  check: 'M5 13l4 4L19 7',
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
