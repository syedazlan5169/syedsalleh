import { useThemePreference } from '@/context/ThemePreferenceContext';

export function useColorScheme() {
  const { colorScheme } = useThemePreference();
  return colorScheme;
}
