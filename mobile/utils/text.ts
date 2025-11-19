export function formatPersonName(value?: string | null): string {
  if (value === undefined || value === null) {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getNameInitial(value?: string | null): string {
  const formatted = formatPersonName(value);
  if (formatted) {
    return formatted.charAt(0);
  }

  const trimmed = value?.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.charAt(0).toUpperCase();
}


