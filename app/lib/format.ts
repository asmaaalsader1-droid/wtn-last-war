export function formatPower(power: number): string {
  if (power >= 1_000_000) return `${(power / 1_000_000).toFixed(power % 1_000_000 === 0 ? 0 : 1)}M`;
  if (power >= 1_000) return `${(power / 1_000).toFixed(power % 1_000 === 0 ? 0 : 1)}K`;
  return power.toLocaleString('en-US');
}

export function formatDate(value?: string): string {
  if (!value) return 'غير محفوظة بعد';
  return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}
