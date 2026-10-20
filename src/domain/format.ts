export const DAY = 864e5;

/** Rounds to the cent, half away from zero, without float noise (1.005 → 1.01, −0.125 → −0.13). */
export const r2 = (n: number) => {
  const v = (Math.sign(n) * Math.round(Math.abs(n) * 100 + 1e-7)) / 100;
  return v === 0 ? 0 : v;
};
export const uid = () => Math.random().toString(36).slice(2, 10);

const eurFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
export const eur = (n: number) => eurFmt.format(n);
/** Whole euros for small tiles ("151 €"). */
export const eurShort = (n: number) => eur(Math.round(n)).replace(/,00(?=\s?€)/, '');

/**
 * Parses "12,50", "12.50", "1 234,56", "1.234,56" or "1,234.56". When both separators appear,
 * the last one is the decimal mark. Returns NaN for anything that is not a clean number.
 */
export function parseAmount(s: string | number | null | undefined): number {
  if (typeof s === 'number') return Number.isFinite(s) ? r2(s) : NaN;
  let t = String(s ?? '').replace(/[\s\u00a0\u202f€]/g, '');
  if (!t) return NaN;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const dec = lastComma > lastDot ? ',' : '.';
    const thousands = dec === ',' ? '.' : ',';
    t = t.split(thousands).join('').replace(dec, '.');
  } else if (lastComma >= 0) {
    if (t.indexOf(',') !== lastComma) return NaN;
    t = t.replace(',', '.');
  } else if (lastDot >= 0 && t.indexOf('.') !== lastDot) return NaN;
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(t)) return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? r2(n) : NaN;
}
export const amountInput = (n: number) => String(n).replace('.', ',');

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const realToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
/** Date for a given day of month, clamped to the month length; month may overflow (-1, 12, …). */
export const onDay = (y: number, m: number, day: number) => {
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return new Date(yy, mm, Math.min(day, daysInMonth(yy, mm)));
};
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const hoursLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 36e5));

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', o);
const fShort = fmt({ day: 'numeric', month: 'short' });
const fLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const fMonthYear = fmt({ month: 'long', year: 'numeric' });
const fFull = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const fTime = fmt({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fMon = fmt({ month: 'short' });
export const dateShort = (d: Date) => fShort.format(d);
export const dateLong = (d: Date) => fLong.format(d);
export const monthYear = (d: Date) => fMonthYear.format(d);
export const dateFull = (d: Date) => fFull.format(d);
export const dateTime = (d: Date) => fTime.format(d);
export const monthAbbr = (d: Date) => fMon.format(d).replace('.', '');
