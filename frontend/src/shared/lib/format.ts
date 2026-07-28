export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  return value.replace('T', ' ').slice(0, 19);
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString('zh-CN') : String(value);
}

export function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}
