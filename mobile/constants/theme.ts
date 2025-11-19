/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export type Palette = {
  text: string;
  textMuted: string;
  background: string;
  surface: string;
  elevated: string;
  border: string;
  tint: string;
  accent: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  danger: string;
  success: string;
  warning: string;
  highlight: string;
  shadow: string;
  gradientStart: string;
  gradientEnd: string;
  maleAvatar: string;
  femaleAvatar: string;
  neutralAvatar: string;
};

export const Colors: Record<'light' | 'dark', Palette> = {
  light: {
    text: '#1f2933',
    textMuted: '#6c7a89',
    background: '#fdf6f0',
    surface: '#ffffff',
    elevated: '#fff8f2',
    border: '#f3e3d8',
    tint: '#f38ba0',
    accent: '#8ecae6',
    icon: '#6c7a89',
    tabIconDefault: '#c0cad6',
    tabIconSelected: '#f38ba0',
    danger: '#f4978e',
    success: '#7bc8a4',
    warning: '#f5d28c',
    highlight: '#fef3f8',
    shadow: 'rgba(255, 184, 209, 0.4)',
    gradientStart: '#f38ba0',
    gradientEnd: '#8ecae6',
    maleAvatar: '#8ecae6',
    femaleAvatar: '#f38ba0',
    neutralAvatar: '#f5d28c',
  },
  dark: {
    text: '#f7f2f5',
    textMuted: '#cbbfd0',
    background: '#1f1b24',
    surface: '#272030',
    elevated: '#31283c',
    border: '#3a3047',
    tint: '#f5b4c4',
    accent: '#a4d8ef',
    icon: '#cbbfd0',
    tabIconDefault: '#6d6477',
    tabIconSelected: '#f5b4c4',
    danger: '#f7a8a1',
    success: '#9adbc0',
    warning: '#f5dd9d',
    highlight: '#2d2235',
    shadow: 'rgba(10, 6, 15, 0.6)',
    gradientStart: '#31283c',
    gradientEnd: '#f38ba0',
    maleAvatar: '#6fb0c6',
    femaleAvatar: '#f5b4c4',
    neutralAvatar: '#c3b28f',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
