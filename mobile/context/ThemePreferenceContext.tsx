import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

import { Colors, Palette } from '@/constants/theme';

export type ThemePreference = 'auto' | 'light' | 'dark';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  colorScheme: 'light' | 'dark';
  palette: Palette;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | undefined>(undefined);

export const ThemePreferenceProvider = ({ children }: PropsWithChildren) => {
  const [preference, setPreference] = useState<ThemePreference>('auto');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const colorScheme: 'light' | 'dark' =
    preference === 'auto' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      colorScheme,
      palette: Colors[colorScheme],
    }),
    [preference, colorScheme],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
};

export const useThemePreference = () => {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return context;
};

export const useThemePalette = () => {
  const { palette } = useThemePreference();
  return palette;
};

