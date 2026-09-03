/**
 * Centralized Datetime Formatting Utility for AWMS
 * Standard: DD/MM/YYYY HH:mm [WITA/WIB]
 */

export type TimezoneCode = 'WITA' | 'WIB' | 'UTC';

/**
 * Resolves appropriate timezone from city code, warehouse name, or direct timezone string
 */
export function resolveTimezone(hint?: string | null): { iana: string; label: string; offsetHours: number } {
  if (!hint) {
    return { iana: 'Asia/Makassar', label: 'WITA', offsetHours: 8 };
  }

  const upper = hint.toUpperCase().trim();
  if (upper.includes('BPN') || upper.includes('BALIKPAPAN') || upper.includes('WITA') || upper.includes('MAKASSAR')) {
    return { iana: 'Asia/Makassar', label: 'WITA', offsetHours: 8 };
  }
  if (upper.includes('JKT') || upper.includes('JAKARTA') || upper.includes('WIB')) {
    return { iana: 'Asia/Jakarta', label: 'WIB', offsetHours: 7 };
  }

  return { iana: 'Asia/Makassar', label: 'WITA', offsetHours: 8 };
}

/**
 * Formats a date + time into human readable format: DD/MM/YYYY HH:mm [TZ]
 * Example: 04/09/2026 09:35 WITA
 */
export function formatDateTime(
  dateInput?: string | Date | null,
  timezoneHint?: string | null,
  includeTimezone = true
): string {
  if (!dateInput) return '—';

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const tz = resolveTimezone(timezoneHint);

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz.iana,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const day = parts.find((p) => p.type === 'day')?.value || '00';
    const month = parts.find((p) => p.type === 'month')?.value || '00';
    const year = parts.find((p) => p.type === 'year')?.value || '0000';
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';

    const formatted = `${day}/${month}/${year} ${hour}:${minute}`;
    return includeTimezone ? `${formatted} ${tz.label}` : formatted;
  } catch {
    // Fallback
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const formatted = `${day}/${month}/${year} ${hour}:${minute}`;
    return includeTimezone ? `${formatted} ${tz.label}` : formatted;
  }
}

/**
 * Formats date only: DD/MM/YYYY
 */
export function formatDateOnly(dateInput?: string | Date | null, timezoneHint?: string | null): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const tz = resolveTimezone(timezoneHint);

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz.iana,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(d);
    const day = parts.find((p) => p.type === 'day')?.value || '00';
    const month = parts.find((p) => p.type === 'month')?.value || '00';
    const year = parts.find((p) => p.type === 'year')?.value || '0000';
    return `${day}/${month}/${year}`;
  } catch {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

/**
 * Returns input string for HTML <input type="datetime-local" />: YYYY-MM-DDTHH:mm
 */
export function toDateTimeLocalInput(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Generates safe export filename with timestamp:
 * Example: AWMS_Data_Export_2026-09-04_1045.xlsx
 */
export function generateSafeExportFilename(prefix: string, ext = 'xlsx', dateInput?: Date): string {
  const d = dateInput || new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());

  // Clean prefix to remove invalid characters
  const cleanPrefix = prefix.replace(/[/\\?%*:|"<>]/g, '_');
  return `${cleanPrefix}_${year}-${month}-${day}_${hours}${minutes}.${ext}`;
}
