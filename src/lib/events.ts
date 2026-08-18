// Recruitment event helpers. All dates in recruitment.json are local Chapel Hill
// time (America/New_York) written as "YYYY-MM-DD" (all-day) or "YYYY-MM-DDTHH:MM".
// We never construct timezone-dependent Date objects for display — everything is
// derived from the string components so labels are identical on any build machine.

export const TZ = 'America/New_York';

export interface RawEvent {
  name: string;
  phase: string;
  start: string;
  end?: string;
  alsoOn?: string[];
  venue?: string;
  attire?: string;
  description?: string;
  calendar?: boolean;
}

export interface Local {
  y: number; m: number; d: number;      // calendar date
  hh?: number; mm?: number;             // undefined for all-day
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseLocal(s: string): Local {
  const [date, time] = s.split('T');
  const [y, m, d] = date.split('-').map(Number);
  if (!time) return { y, m, d };
  const [hh, mm] = time.split(':').map(Number);
  return { y, m, d, hh, mm };
}

export const isAllDay = (l: Local) => l.hh === undefined;

/** Weekday name for a local date (uses UTC arithmetic so the machine tz is irrelevant). */
export function weekday(l: Local): string {
  return DAYS[new Date(Date.UTC(l.y, l.m - 1, l.d)).getUTCDay()];
}
export const weekdayShort = (l: Local) => weekday(l).slice(0, 3);

export const monthDay = (l: Local) => `${MONTHS[l.m - 1]} ${l.d}`;

/** "7 pm", "6:30 pm", "12 pm", "11:59 pm" */
export function clock(l: Local): string {
  if (l.hh === undefined) return '';
  const h12 = l.hh % 12 === 0 ? 12 : l.hh % 12;
  const suffix = l.hh < 12 ? 'am' : 'pm';
  return l.mm ? `${h12}:${String(l.mm).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}

/** "7–8 pm" (drops the first suffix when both share it), "11 am–1 pm" */
export function timeRange(a: Local, b?: Local): string {
  if (a.hh === undefined) return '';
  if (!b || b.hh === undefined) return clock(a);
  const ca = clock(a), cb = clock(b);
  const sa = ca.slice(-2), sb = cb.slice(-2);
  return sa === sb ? `${ca.slice(0, -3)}–${cb}` : `${ca}–${cb}`;
}

/** Add one calendar day (for all-day DTEND, which is exclusive in iCalendar). */
export function nextDay(l: Local): Local {
  const t = new Date(Date.UTC(l.y, l.m - 1, l.d + 1));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export interface EventView {
  name: string;
  phase: string;
  /** "Aug 19" · "Aug 17 – Sep 2" · "Sep 9 · 10" */
  dateLabel: string;
  /** "Wednesday · 7–8 pm" · "Friday" · "Wed or Thu · 6–8:30 pm" · "Times TBD" */
  whenLabel: string;
  meta: string;
  description: string;
  allDay: boolean;
  start: Local;
  end?: Local;
  /** every date this event occurs on (start + alsoOn), as Local with the same times */
  occurrences: { start: Local; end?: Local }[];
  calendar: boolean;
  raw: RawEvent;
}

export function describe(e: RawEvent): EventView {
  const start = parseLocal(e.start);
  const end = e.end ? parseLocal(e.end) : undefined;
  const allDay = isAllDay(start);
  const extra = (e.alsoOn ?? []).map((d) => {
    const dl = parseLocal(d);
    return {
      start: { ...dl, hh: start.hh, mm: start.mm },
      end: end ? { ...dl, hh: end.hh, mm: end.mm } : undefined,
    };
  });
  const occurrences = [{ start, end }, ...extra];

  let dateLabel = monthDay(start);
  if (allDay && end && (end.m !== start.m || end.d !== start.d)) {
    dateLabel = `${monthDay(start)} – ${monthDay(end)}`;
  } else if (extra.length) {
    const others = extra.map((o) => (o.start.m === start.m ? String(o.start.d) : monthDay(o.start)));
    dateLabel = `${monthDay(start)} · ${others.join(' · ')}`;
  }

  let whenLabel: string;
  if (allDay && end && (end.m !== start.m || end.d !== start.d)) {
    whenLabel = 'Times TBD';
  } else if (extra.length) {
    const days = occurrences.map((o) => weekdayShort(o.start)).join(' or ');
    whenLabel = allDay ? days : `${days} · ${timeRange(start, end)}`;
  } else {
    whenLabel = allDay ? weekday(start) : `${weekday(start)} · ${timeRange(start, end)}`;
  }

  return {
    name: e.name,
    phase: e.phase,
    dateLabel,
    whenLabel,
    meta: [e.venue, e.attire].filter(Boolean).join(' · '),
    description: e.description ?? '',
    allDay,
    start,
    end,
    occurrences,
    calendar: e.calendar !== false,
    raw: e,
  };
}

/** "Fri Aug 28" for the application-window strings. */
export function shortDate(s: string): string {
  const l = parseLocal(s);
  return `${weekdayShort(l)} ${monthDay(l)}`;
}
