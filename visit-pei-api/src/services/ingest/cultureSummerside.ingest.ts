import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { getText } from '../httpText.js';
import { prisma } from '../../config/prisma.js';

// Culture Summerside - Squarespace site with programming & events
const BASE = 'https://www.culturesummerside.com';
const PAGES_TO_TRY = [
  `${BASE}/programming-and-events-1`,
  `${BASE}/events`,
  `${BASE}/programming`,
];
const SOURCE = 'CULTURE_SUMMERSIDE';

const makeId = (ref: string, d: Date) =>
  `culturesummerside:${crypto.createHash('sha1').update(`${ref}|${d.toISOString()}`).digest('hex')}`;

const toUTC = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const pd = (s?: string | null): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return isFinite(d.getTime()) ? d : null;
};

const MONTH_MAP: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
  november: 10, nov: 10, december: 11, dec: 11,
};

const parseDateFuzzy = (raw: string): Date | null => {
  const txt = raw.replace(/\s+/g, ' ').trim();

  // "July 18, 2026"
  const mdy = txt.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (mdy) {
    const m = MONTH_MAP[mdy[1].toLowerCase()];
    if (m !== undefined) return new Date(Date.UTC(+mdy[3], m, +mdy[2]));
  }

  // ISO / numeric
  const d = new Date(txt);
  if (isFinite(d.getTime())) return toUTC(d);

  return null;
};

type EventData = {
  title: string;
  startAt: Date;
  endAt: Date | null;
  description: string | null;
  imageUrl: string | null;
  website: string;
  contactEmail: string | null;
  contactPhone: string | null;
  sourceRef: string;
};

const parseFromPage = ($: cheerio.CheerioAPI, pageUrl: string): EventData[] => {
  const events: EventData[] = [];

  // JSON-LD first (Squarespace includes this)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).html() ?? '');
      const nodes =
        j?.['@type'] === 'Event'
          ? [j]
          : (j?.['@graph'] ?? []).filter((x: any) => x['@type'] === 'Event');
      nodes.forEach((ev: any) => {
        const startAt = pd(ev.startDate);
        if (!startAt || !ev.name) return;
        events.push({
          title: String(ev.name).trim(),
          startAt: toUTC(startAt),
          endAt: pd(ev.endDate) ? toUTC(pd(ev.endDate)!) : null,
          description: (ev.description as string) ?? null,
          imageUrl: typeof ev.image === 'string' ? ev.image : ((ev.image?.url as string) ?? null),
          website: (ev.url as string) ?? pageUrl,
          contactEmail: null,
          contactPhone: null,
          sourceRef: (ev.url as string) ?? pageUrl,
        });
      });
    } catch {}
  });

  if (events.length) return events;

  // Squarespace event blocks: .eventitem, .event-excerpt, [class*="EventItem"]
  const cardSel = [
    '.eventitem',
    '.event-excerpt',
    '[class*="EventItem"]',
    '[class*="event-item"]',
    'article[data-item-type="event"]',
    '.summary-item',
  ].join(', ');

  $(cardSel).each((_, el) => {
    const title =
      $(el).find('[class*="title"], h1, h2, h3').first().text().trim();
    if (!title) return;

    const timeEl = $(el).find('time').first();
    const dateStr = timeEl.attr('datetime') ?? timeEl.text().trim();
    const startAt = parseDateFuzzy(dateStr);
    if (!startAt) return;

    const description = $(el).find('p, [class*="description"]').first().text().trim() || null;
    const imageUrl = $(el).find('img').first().attr('src') ?? null;
    const href = $(el).find('a[href]').first().attr('href');
    const website = href ? (href.startsWith('http') ? href : `${BASE}${href}`) : pageUrl;
    const contactEmail =
      $(el).find('a[href^="mailto:"]').first().attr('href')?.replace(/^mailto:/i, '').trim() ?? null;
    const contactPhone =
      $(el).find('a[href^="tel:"]').first().attr('href')?.replace(/^tel:/i, '').trim() ?? null;

    events.push({
      title,
      startAt: toUTC(startAt),
      endAt: null,
      description,
      imageUrl,
      website,
      contactEmail,
      contactPhone,
      sourceRef: website,
    });
  });

  return events;
};

export const ingestCultureSummerside = async () => {
  const allEvents: EventData[] = [];

  for (const url of PAGES_TO_TRY) {
    try {
      const html = await getText(url);
      const $ = cheerio.load(html);
      const found = parseFromPage($, url);
      if (found.length) {
        allEvents.push(...found);
        break;
      }
    } catch {}
  }

  let upserts = 0;
  const errors: { title: string; message: string }[] = [];

  for (const ev of allEvents) {
    try {
      const id = makeId(ev.sourceRef, ev.startAt);
      await prisma.event.upsert({
        where: { id },
        update: {
          title: ev.title,
          description: ev.description,
          startAt: ev.startAt,
          endAt: ev.endAt,
          community: 'Summerside',
          website: ev.website,
          imageUrl: ev.imageUrl,
          contactEmail: ev.contactEmail,
          contactPhone: ev.contactPhone,
          source: SOURCE,
          sourceRef: ev.sourceRef,
        },
        create: {
          id,
          title: ev.title,
          description: ev.description,
          startAt: ev.startAt,
          endAt: ev.endAt,
          allDay: true,
          community: 'Summerside',
          website: ev.website,
          imageUrl: ev.imageUrl,
          contactEmail: ev.contactEmail,
          contactPhone: ev.contactPhone,
          categories: [],
          tags: [],
          source: SOURCE,
          sourceRef: ev.sourceRef,
        },
      });
      upserts++;
    } catch (e: any) {
      errors.push({ title: ev.title, message: e?.message ?? 'Unknown' });
    }
  }

  return {
    source: PAGES_TO_TRY[0],
    linksFound: allEvents.length,
    upserts,
    errors: errors.slice(0, 25),
  };
};
