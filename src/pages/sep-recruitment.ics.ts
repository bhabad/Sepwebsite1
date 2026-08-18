// Static endpoint → dist/sep-recruitment.ics
// Subscribe-able calendar of the current recruitment cycle. Google Calendar's
// "Add by URL", Apple Calendar, and Outlook all accept this file.
import type { APIRoute } from 'astro';
import rec from '../data/recruitment.json';
import { buildIcs } from '../lib/ics';
import { withBase } from '../lib/url';

export const GET: APIRoute = ({ site }) => {
  const pageUrl = new URL(withBase('/recruitment/'), site ?? 'https://www.uncsep.com').href;
  const body = buildIcs({
    calendarName: `SEP UNC ${rec.cycle} Recruitment`,
    pageUrl,
    uidDomain: 'uncsep.com',
    events: rec.events,
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="sep-recruitment.ics"',
    },
  });
};
