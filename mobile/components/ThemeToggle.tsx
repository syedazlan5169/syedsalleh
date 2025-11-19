import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { useThemePreference } from '@/context/ThemePreferenceContext';

type Props = {
  style?: ViewStyle;
};

const OPTIONS = [
  { label: 'Auto', value: 'auto' as const },
  { label: 'Light', value: 'light' as const },
  { label: 'Dark', value: 'dark' as const },
];

export function ThemeToggle({ style }: Props) {
  const { preference, setPreference, palette } = useThemePreference();

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[palette.gradientStart, palette.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { shadowColor: palette.shadow }]}
      />
      <View style={[styles.track, { borderColor: palette.border }]}>
        {OPTIONS.map((option) => {
          const active = preference === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.button,
                active && { backgroundColor: palette.surface, shadowColor: palette.shadow },
              ]}
              onPress={() => setPreference(option.value)}
              activeOpacity={0.9}
            >
              <Text style={[styles.label, { color: active ? palette.text : palette.textMuted }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 220,
    height: 42,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    opacity: 0.35,
  },
  track: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  button: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

