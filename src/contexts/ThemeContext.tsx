import { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

import { colors } from '@/theme/colors';

export interface ThemeContextValue {
  colors: typeof colors;
}

const ThemeContext = createContext<ThemeContextValue>({ colors });

export function ThemeProvider(props: PropsWithChildren) {
  return <ThemeContext.Provider value={{ colors }}>{props.children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
