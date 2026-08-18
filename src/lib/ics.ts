// Builds the iCalendar feed for the recruitment schedule. Pure string output —
// no dependency. Consumed by src/pages/sep-recruitment.ics.ts.
import { describe, nextDay, TZ, type Local, type RawEvent } from './events';

const pad = (n: number) => String(n).padStart(2, '0');
const stampDate = (l: Local) => `${l.y}${pad(l.m)}${pad(l.d)}`;
const stampDateTime = (l: Local) => `${stampDate(l)}T${pad(l.hh ?? 0)}${pad(l.mm ?? 0)}00`;

/** RFC 5545 text escaping. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (curBytes + b > limit) { out.push(cur); cur = ' ' + ch; curBytes = 1 + b; }
    else { cur += ch; curBytes += b; }
  }
  out.push(cur);
  return out.join('\r\n');
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Standard America/New_York rules (US DST since 2007).
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZ}`,
  'X-LIC-LOCATION:America/New_York',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:-0500',
  'TZOFFSETTO:-0400',
  'TZNAME:EDT',
  'DTSTART:19700308T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0400',
  'TZOFFSETTO:-0500',
  'TZNAME:EST',
  'DTSTART:19701101T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export interface IcsOptions {
  calendarName: string;
  /** Absolute URL of the recruitment page, put in each event's URL/DESCRIPTION. */
  pageUrl: string;
  /** Domain used for stable UIDs. */
  uidDomain: string;
  events: RawEvent[];
  /** Fixed DTSTAMP (build time). */
  now?: Date;
}

export function buildIcs(o: IcsOptions): string {
  const now = o.now ?? new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sigma Eta Pi at UNC//Recruitment//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(o.calendarName)}`,
    `X-WR-TIMEZONE:${TZ}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
    ...VTIMEZONE,
  ];

  for (const raw of o.events) {
    const ev = describe(raw);
    if (!ev.calendar) continue;
    ev.occurrences.forEach((occ, i) => {
      const uid = `${slug(ev.name)}-${stampDate(occ.start)}@${o.uidDomain}`;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      if (ev.allDay) {
        const endExclusive = nextDay(occ.end ?? occ.start);
        lines.push(`DTSTART;VALUE=DATE:${stampDate(occ.start)}`);
        lines.push(`DTEND;VALUE=DATE:${stampDate(endExclusive)}`);
      } else {
        const end = occ.end ?? { ...occ.start, hh: (occ.start.hh ?? 0) + 1 };
        lines.push(`DTSTART;TZID=${TZ}:${stampDateTime(occ.start)}`);
        lines.push(`DTEND;TZID=${TZ}:${stampDateTime(end)}`);
      }
      const nightTag = ev.occurrences.length > 1 ? ` (night ${i + 1} of ${ev.occurrences.length})` : '';
      lines.push(`SUMMARY:${esc(`SEP: ${ev.name}${nightTag}`)}`);
      if (raw.venue) lines.push(`LOCATION:${esc(raw.venue)}`);
      const desc = [ev.description, raw.attire ? `Attire: ${raw.attire}` : '', `Details: ${o.pageUrl}`].filter(Boolean).join('\n');
      lines.push(`DESCRIPTION:${esc(desc)}`);
      lines.push(`URL:${o.pageUrl}`);
      lines.push('CATEGORIES:SEP UNC Recruitment');
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:OPAQUE');
      lines.push('END:VEVENT');
    });
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
