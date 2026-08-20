// lib/date.ts

const TZ = 'Asia/Jakarta';

export function formatDate(date: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ,
    ...options,
  }).format(d);
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return 'Belum pernah login';

  return formatDate(date, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(date: string | Date | null): string {
  if (!date) return '-';

  return formatDate(date, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTimeOnly(date: string | Date | null): string {
  if (!date) return '-';

  return formatDate(date, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// lib/date.ts (tambahan)

export function getJakartaNow(): Date {
  const jakartaString = new Date().toLocaleString('en-US', { timeZone: TZ });
  return new Date(jakartaString);
}

export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;

  const dateStr = formatDate(d, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const todayStr = formatDate(new Date(), { day: '2-digit', month: '2-digit', year: 'numeric' });

  return dateStr === todayStr;
}