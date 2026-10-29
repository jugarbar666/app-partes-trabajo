import { PeriodicityUnit } from '../types/domain';

/**
 * Formatea un importe en céntimos enteros a euros con formato español (ej. 12550 -> "125,50 €")
 * Evita errores de coma flotante en operaciones monetarias.
 */
export function formatCentsToEUR(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) {
    return '—';
  }
  const euros = cents / 100;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

/**
 * Convierte una entrada de texto en euros (ej. "125,50" o "125.5" o "0") a céntimos enteros exactos.
 * Devuelve null si es inválido o negativo.
 */
export function parseEurosToCents(input: string | number): number | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input < 0) return null;
    return Math.round(input * 100);
  }
  const trimmed = input.trim().replace(/\s/g, '').replace('€', '');
  if (!trimmed) return null;

  // Normalizar separador decimal español o punto
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const parts = normalized.split('.');
  const integerPart = parseInt(parts[0], 10);
  const decimalPart = parts[1] ? parseInt(parts[1].padEnd(2, '0'), 10) : 0;
  const totalCents = integerPart * 100 + decimalPart;
  return totalCents >= 0 ? totalCents : null;
}

/**
 * Sanea y valida una zona horaria IANA para Intl.DateTimeFormat.
 * Si es inválida, nula o un nombre coloquial (ej. "Madrid", "España"),
 * devuelve una zona horaria IANA válida y segura (por defecto Europe/Madrid).
 */
export function sanitizeTimezone(tz?: string | null): string {
  if (!tz || typeof tz !== 'string') return 'Europe/Madrid';
  const trimmed = tz.trim();
  if (!trimmed) return 'Europe/Madrid';

  const lower = trimmed.toLowerCase();
  if (
    lower === 'madrid' ||
    lower === 'españa' ||
    lower === 'espana' ||
    lower === 'spain' ||
    lower === 'peninsula' ||
    lower === 'península'
  ) {
    return 'Europe/Madrid';
  }
  if (
    lower === 'canarias' ||
    lower === 'canary' ||
    lower === 'tenerife' ||
    lower === 'las palmas' ||
    lower === 'islas canarias'
  ) {
    return 'Atlantic/Canary';
  }
  if (lower === 'utc' || lower === 'gmt') {
    return 'UTC';
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch {
    return 'Europe/Madrid';
  }
}

/**
 * Parsea con tolerancia fechas en string ISO, fechas con espacio 'YYYY-MM-DD HH:mm:ss' o instancias Date.
 * Devuelve un Date válido o null si no se puede parsear.
 */
export function parseDateRobust(isoOrDate: string | Date | null | undefined): Date | null {
  if (!isoOrDate) return null;
  if (isoOrDate instanceof Date) {
    return Number.isNaN(isoOrDate.getTime()) ? null : isoOrDate;
  }
  if (typeof isoOrDate !== 'string') return null;
  const trimmed = isoOrDate.trim();
  if (!trimmed) return null;

  // Intento directo
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  // Si contiene espacio en vez de T (ej. '2026-10-21 09:30:00' o '2026-10-21 09:30')
  if (trimmed.includes(' ')) {
    const withT = new Date(trimmed.replace(' ', 'T'));
    if (!Number.isNaN(withT.getTime())) return withT;
  }

  return null;
}

/**
 * Formatea un instante UTC en fecha dd/mm/aaaa según la zona horaria configurada (por defecto Europe/Madrid).
 * Es totalmente tolerante ante zonas horarias inválidas y formatos de fecha variados.
 */
export function formatDateES(isoOrDate: string | Date | null | undefined, timezone: string | null = 'Europe/Madrid'): string {
  if (!isoOrDate) return '—';

  if (typeof isoOrDate === 'string') {
    const trimmed = isoOrDate.trim();
    if (!trimmed) return '—';
    // Si es una fecha civil YYYY-MM-DD, no aplicar desplazamiento de hora que pueda cambiar el día
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}/${m}/${y}`;
    }
  }

  const date = parseDateRobust(isoOrDate);
  if (!date) return '—';

  const safeTz = sanitizeTimezone(timezone);
  try {
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: safeTz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    } catch {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    }
  }
}

/**
 * Formatea un instante UTC en fecha y hora 24h (dd/mm/aaaa HH:mm) según la zona horaria de la empresa
 */
export function formatDateTimeES(iso: string | Date | null | undefined, timezone: string | null = 'Europe/Madrid'): string {
  if (!iso) return '—';
  const date = parseDateRobust(iso);
  if (!date) return '—';

  const safeTz = sanitizeTimezone(timezone);
  try {
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: safeTz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    } catch {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${d}/${m}/${y} ${h}:${min}`;
    }
  }
}

/**
 * Formatea solo la hora HH:mm en formato 24h según la zona horaria configurada
 */
export function formatTimeES(iso: string | Date | null | undefined, timezone: string | null = 'Europe/Madrid'): string {
  if (!iso) return '—';
  const date = parseDateRobust(iso);
  if (!date) return '—';

  const safeTz = sanitizeTimezone(timezone);
  try {
    return new Intl.DateTimeFormat('es-ES', {
      timeZone: safeTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    } catch {
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${h}:${min}`;
    }
  }
}

/**
 * Obtiene el nombre del día de la semana en español para un instante en la zona horaria indicada
 */
export function getWeekdayNameES(iso: string, timezone: string | null = 'Europe/Madrid'): string {
  const date = parseDateRobust(iso);
  if (!date) return '—';
  const safeTz = sanitizeTimezone(timezone);
  try {
    const weekday = new Intl.DateTimeFormat('es-ES', {
      timeZone: safeTz,
      weekday: 'long',
    }).format(date);
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  } catch {
    try {
      const weekday = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        weekday: 'long',
      }).format(date);
      return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    } catch {
      return '—';
    }
  }
}

/**
 * Obtiene la fecha civil actual YYYY-MM-DD en la zona horaria de la empresa
 */
export function getCurrentLocalDate(timezone: string | null = 'Europe/Madrid', referenceDate: Date = new Date()): string {
  const safeTz = sanitizeTimezone(timezone);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(referenceDate);
  } catch {
    const y = referenceDate.getFullYear();
    const m = String(referenceDate.getMonth() + 1).padStart(2, '0');
    const d = String(referenceDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Calcula la duración real en minutos y formato legible (HH h MM min) entre dos instantes UTC.
 * Maneja correctamente cruces de medianoche y cambios de horario de verano (DST) porque opera sobre epoch UTC.
 */
export function calculateDuration(clockInIso: string, clockOutIso: string | null): {
  minutes: number;
  hoursDecimal: number;
  formatted: string;
} {
  if (!clockOutIso) {
    return { minutes: 0, hoursDecimal: 0, formatted: 'En curso' };
  }
  const startMs = new Date(clockInIso).getTime();
  const endMs = new Date(clockOutIso).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return { minutes: 0, hoursDecimal: 0, formatted: '0h 00m' };
  }
  const totalMinutes = Math.round((endMs - startMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hoursDecimal = Math.round((totalMinutes / 60) * 100) / 100;
  return {
    minutes: totalMinutes,
    hoursDecimal,
    formatted: `${hours}h ${String(mins).padStart(2, '0')}m`,
  };
}

/**
 * Calcula una fecha civil (YYYY-MM-DD) sumando o restando meses naturales con ajuste al último día válido
 * del mes destino (ej. 31 de marzo - 1 mes = 28 o 29 de febrero; 31 de enero + 1 mes = 28 o 29 de febrero).
 */
export function addCalendarMonthsClamped(civilDate: string, monthsDelta: number): string {
  const [yStr, mStr, dStr] = civilDate.split('-');
  const year = parseInt(yStr, 10);
  const monthIndex = parseInt(mStr, 10) - 1; // 0-11
  const day = parseInt(dStr, 10);

  const totalMonths = year * 12 + monthIndex + monthsDelta;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12;

  // Último día válido del mes destino
  const maxDayInTargetMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, maxDayInTargetMonth);

  const yOut = String(targetYear).padStart(4, '0');
  const mOut = String(targetMonthIndex + 1).padStart(2, '0');
  const dOut = String(clampedDay).padStart(2, '0');
  return `${yOut}-${mOut}-${dOut}`;
}

/**
 * Suma días civiles a una fecha YYYY-MM-DD sin distorsión por zona horaria
 */
export function addCalendarDays(civilDate: string, daysDelta: number): string {
  const [yStr, mStr, dStr] = civilDate.split('-');
  const dt = new Date(Date.UTC(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10)));
  dt.setUTCDate(dt.getUTCDate() + daysDelta);
  return dt.toISOString().slice(0, 10);
}

/**
 * Calcula las 3 fechas de aviso obligatorio para un vencimiento de revisión:
 * - 1 mes natural antes (con ajuste al último día válido del mes)
 * - 1 semana antes (7 días naturales antes)
 * - El mismo día del vencimiento
 */
export function calculateReviewNoticeSchedule(dueDateCivil: string): {
  oneMonthBefore: string;
  oneWeekBefore: string;
  sameDay: string;
} {
  return {
    oneMonthBefore: addCalendarMonthsClamped(dueDateCivil, -1),
    oneWeekBefore: addCalendarDays(dueDateCivil, -7),
    sameDay: dueDateCivil,
  };
}

export type ReviewAlertLevel = 'caducada' | 'semana' | 'mes' | 'en_plazo';

export interface ReviewAlertInfo {
  level: ReviewAlertLevel;
  diffDays: number;
  colorName: 'negro' | 'rojo' | 'naranja' | 'neutro';
  badgeClass: string;
  pillClass: string;
  borderCardClass: string;
  iconBgClass: string;
  textClass: string;
  label: string;
  shortLabel: string;
  isOverdue: boolean;
  isUrgentWeek: boolean;
  isWarningMonth: boolean;
}

/**
 * Evalúa el nivel de alerta visual de un vencimiento de revisión:
 * - Si ya ha caducado (< 0 días): señal de alerta en NEGRO
 * - Cuando quede una semana (0 a 7 días): señal de alerta en ROJO
 * - Cuando quede un mes (8 a 30 días): señal de alerta en NARANJA
 * - Si queda más de un mes (> 30 días): estado neutro / en plazo
 */
export function getReviewAlertInfo(
  dueDateCivil: string | null | undefined,
  referenceTodayCivil?: string
): ReviewAlertInfo {
  if (!dueDateCivil || !/^\d{4}-\d{2}-\d{2}$/.test(dueDateCivil.slice(0, 10))) {
    return {
      level: 'en_plazo',
      diffDays: 999,
      colorName: 'neutro',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      pillClass: 'bg-slate-500',
      borderCardClass: 'border-slate-200',
      iconBgClass: 'bg-slate-600 text-white',
      textClass: 'text-slate-600',
      label: 'Sin fecha',
      shortLabel: '—',
      isOverdue: false,
      isUrgentWeek: false,
      isWarningMonth: false,
    };
  }

  const cleanDueDate = dueDateCivil.slice(0, 10);
  const today = referenceTodayCivil || getCurrentLocalDate();

  const [y1, m1, d1] = cleanDueDate.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  const dtDue = Date.UTC(y1, m1 - 1, d1);
  const dtToday = Date.UTC(y2, m2 - 1, d2);
  const diffDays = Math.round((dtDue - dtToday) / (1000 * 60 * 60 * 24));

  // 1. Caducada (diffDays < 0): ALERTA EN NEGRO
  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      level: 'caducada',
      diffDays,
      colorName: 'negro',
      badgeClass: 'bg-black text-white border-black font-extrabold shadow-xs',
      pillClass: 'bg-black text-white ring-1 ring-black',
      borderCardClass: 'border-l-4 border-l-black bg-slate-100/70',
      iconBgClass: 'bg-black text-white',
      textClass: 'text-black font-extrabold',
      label: `⛔ Caducada (hace ${daysAgo} ${daysAgo === 1 ? 'día' : 'días'})`,
      shortLabel: '⛔ Caducada',
      isOverdue: true,
      isUrgentWeek: false,
      isWarningMonth: false,
    };
  }

  // 2. Queda una semana (0 a 7 días): ALERTA EN ROJO
  if (diffDays <= 7) {
    const dayText = diffDays === 0 ? 'Vence HOY' : `Vence en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    return {
      level: 'semana',
      diffDays,
      colorName: 'rojo',
      badgeClass: 'bg-red-600 text-white border-red-700 font-extrabold shadow-xs',
      pillClass: 'bg-red-600 text-white ring-1 ring-red-600',
      borderCardClass: 'border-l-4 border-l-red-600 bg-red-50/40',
      iconBgClass: 'bg-red-600 text-white',
      textClass: 'text-red-700 font-extrabold',
      label: `🚨 Alerta 1 semana (${dayText})`,
      shortLabel: `🚨 1 semana (${diffDays}d)`,
      isOverdue: false,
      isUrgentWeek: true,
      isWarningMonth: false,
    };
  }

  // 3. Queda un mes (8 a 30 días): ALERTA EN NARANJA
  if (diffDays <= 30) {
    return {
      level: 'mes',
      diffDays,
      colorName: 'naranja',
      badgeClass: 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold shadow-xs',
      pillClass: 'bg-amber-500 text-slate-950 ring-1 ring-amber-600',
      borderCardClass: 'border-l-4 border-l-amber-500 bg-amber-50/40',
      iconBgClass: 'bg-amber-500 text-slate-950',
      textClass: 'text-amber-800 font-extrabold',
      label: `⚠️ Alerta 1 mes (Vence en ${diffDays} días)`,
      shortLabel: `⚠️ 1 mes (${diffDays}d)`,
      isOverdue: false,
      isUrgentWeek: false,
      isWarningMonth: true,
    };
  }

  // 4. En plazo (> 30 días): Estado neutro
  return {
    level: 'en_plazo',
    diffDays,
    colorName: 'neutro',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 font-semibold',
    pillClass: 'bg-slate-500 text-white ring-1 ring-slate-400',
    borderCardClass: 'border-slate-200',
    iconBgClass: 'bg-blue-600 text-white',
    textClass: 'text-slate-600',
    label: `● En plazo (Vence en ${diffDays} días)`,
    shortLabel: 'En plazo',
    isOverdue: false,
    isUrgentWeek: false,
    isWarningMonth: false,
  };
}

/**
 * Calcula la siguiente fecha sugerida de revisión a partir de la fecha realizada y la periodicidad del tipo
 */
export function calculateNextReviewDate(
  baseCivilDate: string,
  unit: PeriodicityUnit,
  value: number
): string {
  if (unit === 'none' || value <= 0) return baseCivilDate;
  if (unit === 'days') return addCalendarDays(baseCivilDate, value);
  if (unit === 'months') return addCalendarMonthsClamped(baseCivilDate, value);
  if (unit === 'years') return addCalendarMonthsClamped(baseCivilDate, value * 12);
  return baseCivilDate;
}

/**
 * Normaliza un número de teléfono para enlaces tel: y WhatsApp (https://wa.me/)
 */
/**
 * Normaliza un número de teléfono individual para asegurar el prefijo +34
 * si no incluye otro prefijo internacional.
 */
export function formatSinglePhoneWithPrefix34(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('+34')) {
    const digits = trimmed.slice(3).replace(/\D/g, '');
    return digits ? `+34 ${digits}` : '+34';
  }
  if (trimmed.startsWith('0034')) {
    const digits = trimmed.slice(4).replace(/\D/g, '');
    return digits ? `+34 ${digits}` : '+34';
  }
  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  if (digits.startsWith('34') && digits.length === 11) {
    return `+34 ${digits.slice(2)}`;
  }

  return `+34 ${digits}`;
}

/**
 * Asegura que los números de teléfono incluyan automáticamente el prefijo +34
 * sin que el usuario tenga que escribirlo a mano.
 * Soporta números individuales o múltiples separados por comas/barras.
 */
export function formatPhoneWithPrefix34(input: string | null | undefined): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (trimmed.includes(',') || trimmed.includes(';')) {
    return trimmed
      .split(/[,;]/)
      .map((p) => formatSinglePhoneWithPrefix34(p.trim()))
      .filter(Boolean)
      .join(', ');
  }

  return formatSinglePhoneWithPrefix34(trimmed);
}

export interface CountryPhonePrefix {
  code: string;
  country: string;
  flag: string;
}

export const COUNTRY_PHONE_PREFIXES: CountryPhonePrefix[] = [
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+33', country: 'Francia', flag: '🇫🇷' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '+49', country: 'Alemania', flag: '🇩🇪' },
  { code: '+39', country: 'Italia', flag: '🇮🇹' },
  { code: '+376', country: 'Andorra', flag: '🇦🇩' },
  { code: '+212', country: 'Marruecos', flag: '🇲🇦' },
  { code: '+1', country: 'EE. UU. / Canadá', flag: '🇺🇸' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+41', country: 'Suiza', flag: '🇨🇭' },
  { code: '+32', country: 'Bélgica', flag: '🇧🇪' },
  { code: '+31', country: 'Países Bajos', flag: '🇳🇱' },
  { code: '+40', country: 'Rumanía', flag: '🇷🇴' },
  { code: '+48', country: 'Polonia', flag: '🇵🇱' },
  { code: '+380', country: 'Ucrania', flag: '🇺🇦' },
  { code: '+353', country: 'Irlanda', flag: '🇮🇪' },
  { code: '+43', country: 'Austria', flag: '🇦🇹' },
  { code: '+46', country: 'Suecia', flag: '🇸🇪' },
  { code: '+47', country: 'Noruega', flag: '🇳🇴' },
  { code: '+45', country: 'Dinamarca', flag: '🇩🇰' },
  { code: '+358', country: 'Finlandia', flag: '🇫🇮' },
  { code: '+30', country: 'Grecia', flag: '🇬🇷' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japón', flag: '🇯🇵' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
];

const PREFIXES_SORTED_BY_LENGTH = [...COUNTRY_PHONE_PREFIXES].sort(
  (a, b) => b.code.length - a.code.length
);

export function parsePhoneAndPrefix(
  fullPhone: string | null | undefined,
  defaultPrefix = '+34'
): { prefix: string; localNumber: string } {
  if (!fullPhone) {
    return { prefix: defaultPrefix, localNumber: '' };
  }
  let trimmed = fullPhone.trim();
  if (trimmed.startsWith('00')) {
    trimmed = '+' + trimmed.slice(2);
  }
  if (trimmed.startsWith('+')) {
    const matched = PREFIXES_SORTED_BY_LENGTH.find((p) => trimmed.startsWith(p.code));
    if (matched) {
      return {
        prefix: matched.code,
        localNumber: trimmed.slice(matched.code.length).trim(),
      };
    }
    const generic = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
    if (generic) {
      return {
        prefix: generic[1],
        localNumber: generic[2].trim(),
      };
    }
  }
  return {
    prefix: defaultPrefix,
    localNumber: trimmed,
  };
}

/**
 * Devuelve el número de teléfono local sin el prefijo internacional
 * para mostrarlo limpiamente en un campo que incluye selector de prefijo.
 */
export function cleanLocalPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return parsePhoneAndPrefix(phone).localNumber;
}

export function normalizePhoneLinks(rawPhone: string | null | undefined): {
  valid: boolean;
  display: string;
  telHref: string;
  whatsappHref: string;
} {
  if (!rawPhone) {
    return { valid: false, display: '', telHref: '#', whatsappHref: '#' };
  }
  const digitsAndPlus = rawPhone.replace(/[^\d+]/g, '');
  const digitsOnly = digitsAndPlus.replace(/\D/g, '');
  if (digitsOnly.length < 9) {
    return { valid: false, display: rawPhone, telHref: '#', whatsappHref: '#' };
  }
  const intlDigits =
    digitsOnly.length === 9 && /^[6789]/.test(digitsOnly) ? `34${digitsOnly}` : digitsOnly;
  
  const displayFormatted = formatPhoneWithPrefix34(rawPhone);

  return {
    valid: true,
    display: displayFormatted || rawPhone.trim(),
    telHref: `tel:+${intlDigits}`,
    whatsappHref: `https://wa.me/${intlDigits}`,
  };
}

/**
 * Normaliza un email para enlace mailto: sin envío automático
 */
export function normalizeEmailLink(rawEmail: string | null | undefined): {
  valid: boolean;
  display: string;
  mailtoHref: string;
} {
  if (!rawEmail) return { valid: false, display: '', mailtoHref: '#' };
  const clean = rawEmail.trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  return {
    valid,
    display: clean,
    mailtoHref: valid ? `mailto:${encodeURIComponent(clean)}` : '#',
  };
}

/**
 * Protege celdas exportadas a Excel frente a inyección de fórmulas (CSV/XLSX Formula Injection)
 * Si un texto comienza por =, +, -, @, tabulador o retorno de carro, antepone un apóstrofo.
 */
export function sanitizeSpreadsheetCell(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Calcula un hash determinista del contenido material de un parte para verificar la vigencia de la firma del cliente.
 * Si cambian los trabajos realizados, materiales o el importe del parte, el hash cambia e invalida la firma previa.
 */
export function computeWorkOrderContentHash(params: {
  planned_work: string;
  total_amount_cents: number | null;
  entries: Array<{ description: string; observations: string }>;
  materials: Array<{ article_name_snapshot: string; quantity: number; unit_price_cents: number }>;
}): string {
  const canonical = JSON.stringify({
    pw: params.planned_work.trim(),
    amt: params.total_amount_cents,
    ent: params.entries.map((e) => `${e.description.trim()}|${(e.observations || '').trim()}`).sort(),
    mat: params.materials
      .map((m) => `${m.article_name_snapshot.trim()}|${m.quantity}|${m.unit_price_cents}`)
      .sort(),
  });
  let hash = 5381;
  for (let i = 0; i < canonical.length; i++) {
    hash = (hash * 33) ^ canonical.charCodeAt(i);
  }
  return `wo-hash-${(hash >>> 0).toString(16)}`;
}

/**
 * Obtiene la fecha civil YYYY-MM-DD en la zona horaria especificada para un instante ISO o Date dado.
 */
export function getLocalDateString(
  isoOrDate: string | Date | null | undefined,
  timezone: string | null = 'Europe/Madrid'
): string {
  if (!isoOrDate) return '';
  const date = parseDateRobust(isoOrDate);
  if (!date) return '';
  const safeTz = sanitizeTimezone(timezone);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Combina una fecha civil YYYY-MM-DD y una hora HH:mm en la zona horaria especificada y devuelve un string UTC ISO exacto.
 */
export function combineLocalDateAndTimeToIso(
  civilDate: string,
  timeHHmm: string,
  timezone: string = 'Europe/Madrid'
): string {
  const safeTz = sanitizeTimezone(timezone);
  const [year, month, day] = civilDate.split('-').map(Number);
  const [hour, minute] = timeHHmm.split(':').map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour || 0, minute || 0, 0));
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(utcGuess);
    const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    let localHour = getPart('hour');
    if (localHour === 24) localHour = 0;
    const localDay = getPart('day');
    let diffMinutes = (localHour - (hour || 0)) * 60 + (getPart('minute') - (minute || 0));
    if (localDay !== day) {
      diffMinutes += (localDay > day ? 1 : -1) * 24 * 60;
    }
    const realUtcMs = utcGuess.getTime() - diffMinutes * 60000;
    return new Date(realUtcMs).toISOString();
  } catch {
    return new Date(`${civilDate}T${timeHHmm}:00`).toISOString();
  }
}

export interface WeekDayInfo {
  dateStr: string; // '2026-10-19'
  dayNumber: number; // 19
  monthShort: string; // 'oct'
  monthNumber: number; // 10
  year: number; // 2026
  weekdayName: string; // 'Lunes'
  weekdayShort: string; // 'Lun'
  formattedDate: string; // '19/10/2026'
  isToday: boolean;
}

/**
 * Obtiene los días para la semana de la fecha indicada con desplazamiento de semanas
 * (0 = semana actual, 1 = semana siguiente, -1 = semana anterior).
 * Si workDaysOnly = true, devuelve los 5 días laborables (Lunes a Viernes).
 */
export function getWeekDays(
  referenceCivilDate: string,
  weekOffset: number = 0,
  timezone: string | null = 'Europe/Madrid',
  workDaysOnly: boolean = false
): WeekDayInfo[] {
  const [yStr, mStr, dStr] = referenceCivilDate.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  // Instante UTC mediodía para evitar variaciones por horario de verano (DST)
  const ref = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = ref.getUTCDay(); // 0: Dom, 1: Lun, ..., 6: Sáb
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) + weekOffset * 7;
  const mondayUtcMs = ref.getTime() + diffToMonday * 86400000;

  const weekdayNames = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];
  const weekdayShorts = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const monthNamesShort = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];

  const totalDays = workDaysOnly ? 5 : 7;
  const days: WeekDayInfo[] = [];
  for (let i = 0; i < totalDays; i++) {
    const curDate = new Date(mondayUtcMs + i * 86400000);
    const dateStr = curDate.toISOString().slice(0, 10);
    const curYear = curDate.getUTCFullYear();
    const curMonth = curDate.getUTCMonth() + 1;
    const curDay = curDate.getUTCDate();
    const dd = String(curDay).padStart(2, '0');
    const mm = String(curMonth).padStart(2, '0');

    days.push({
      dateStr,
      dayNumber: curDay,
      monthShort: monthNamesShort[curMonth - 1] || '',
      monthNumber: curMonth,
      year: curYear,
      weekdayName: weekdayNames[i],
      weekdayShort: weekdayShorts[i],
      formattedDate: `${dd}/${mm}/${curYear}`,
      isToday: dateStr === referenceCivilDate,
    });
  }
  return days;
}

/**
 * Limpia el nombre de un operario o administrador eliminando sufijos de rol entre paréntesis
 * (ej. "Juan Carlos (Administrador)" -> "Juan Carlos", "Juan (Operario)" -> "Juan").
 * Para que en las asignaciones solo aparezca estrictamente el nombre del operario.
 */
export function cleanOperatorName(rawName?: string | null): string {
  if (!rawName) return '';
  return rawName
    .replace(/\s*\((?:Administrador[^)]*|Administración[^)]*|Operari[oa][^)]*|Admin[^)]*|Técnic[oa][^)]*)\)/gi, '')
    .trim();
}

/**
 * Calcula la hora frontera / punto medio entre el fin del turno de mañana y el inicio de tarde
 * para clasificar marcas de fichaje en jornada partida (ej: 13:30 y 15:30 -> 14:30).
 */
export function getShiftMidpointTime(endMorning = '13:30', startAfternoon = '15:30'): string {
  const [h1, m1] = endMorning.split(':').map((v) => parseInt(v, 10) || 0);
  const [h2, m2] = startAfternoon.split(':').map((v) => parseInt(v, 10) || 0);
  const totalMins1 = h1 * 60 + m1;
  const totalMins2 = h2 * 60 + m2;
  const midMins = Math.floor((totalMins1 + totalMins2) / 2);
  const midH = Math.floor(midMins / 60);
  const midM = midMins % 60;
  return `${String(midH).padStart(2, '0')}:${String(midM).padStart(2, '0')}`;
}

