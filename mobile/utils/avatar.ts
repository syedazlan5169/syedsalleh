import { Palette } from '@/constants/theme';

const isMale = (gender?: string | null) => {
  if (!gender) return false;
  const normalized = gender.trim().toLowerCase();
  return normalized === 'male' || normalized === 'm';
};

const isFemale = (gender?: string | null) => {
  if (!gender) return false;
  const normalized = gender.trim().toLowerCase();
  return normalized === 'female' || normalized === 'f';
};

export const getAvatarColors = (
  gender: string | null | undefined,
  palette: Palette,
): { background: string; text: string } => {
  if (isMale(gender)) {
    return { background: palette.maleAvatar, text: '#0b2233' };
  }

  if (isFemale(gender)) {
    return { background: palette.femaleAvatar, text: '#31121f' };
  }

  return { background: palette.neutralAvatar, text: '#3a2f0f' };
};

