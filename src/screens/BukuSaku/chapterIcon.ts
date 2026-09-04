import type { IconName } from '@/components/atoms/Icon';

// Backend mengirim `chapter.icon` sebagai string bebas (mis. "shield", "book", "heart").
// Petakan ke `IconName` yang tersedia di `atoms/Icon`; apa pun yang tak dikenal jatuh ke "handbook".
const ICON_ALIASES: Record<string, IconName> = {
  shield: 'shield-check',
  'shield-check': 'shield-check',
  book: 'handbook',
  handbook: 'handbook',
  bookmark: 'handbook',
  file: 'file',
  'file-text': 'file',
  document: 'file',
  flag: 'flag',
  star: 'rank',
  award: 'rank',
  medal: 'rank',
  heart: 'heartbeat',
  heartbeat: 'heartbeat',
  health: 'heartbeat',
  users: 'users',
  people: 'users',
  team: 'users',
  briefcase: 'briefcase',
  clipboard: 'clipboard-check',
  'clipboard-check': 'clipboard-check',
  info: 'info',
  map: 'map-pin',
  'map-pin': 'map-pin',
  radio: 'broadcast',
  broadcast: 'broadcast',
  megaphone: 'megaphone',
  settings: 'settings',
  gear: 'settings',
  calendar: 'calendar',
  building: 'building',
  weapon: 'weapon',
  car: 'car',
  globe: 'globe',
  layers: 'layers',
  lock: 'lock',
};

export function handbookIcon(icon: string | null | undefined): IconName {
  if (!icon) return 'handbook';
  return ICON_ALIASES[icon.trim().toLowerCase()] ?? 'handbook';
}
