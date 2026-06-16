import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { getText } from '../httpText.js';
import { prisma } from '../../config/prisma.js';

const CALENDAR_URL = 'https://www.summerside.ca/calendar';
// CivicLive (Granicus) hosted subdomain
const CIVICLIVE_BASE = 'https://summerside.hosted.civiclive.com';
const CIVICLIVE_EVENTS = `${CIVICLIVE_BASE}/events`;
const SOURCE = 'SUMMERSIDE_CITY';

const makeId = (ref: string, d: Date) =>
  `summersidecity:${crypto.createHash('sha1').update(`${ref}|${d.toISOString()}`).digest('hex')}`;

const toUTC = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const pd = (s?: string | null): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return isFinite(d.getTime()) ? d : null;
};

const extractLdEvents = ($: cheerio.CheerioAPI): any[] => {
  const evs: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).html() ?? '');
      if (j?.['@type'] === 'Event') evs.push(j);
      (j?.['@graph'] ?? [])
        .filter((x: any) => x['@type'] === 'Event')
        .forEach((x: any) => evs.push(x));
    } catch {}
  });
  return evs;
};

type ParsedEvent = {
  title: string;
  startAt: Date;
  endAt: Date | null;
  description: string | null;
  venueName: string | null;
  address: string | null;
  website: string;
  imageUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

const parsePage = ($: cheerio.CheerioAPI, pageUrl: string): ParsedEvent[] => {
  const events: ParsedEvent[] = [];

  // JSON-LD
  for (const ev of extractLdEvents($)) {
    const startAt = pd(ev.startDate);
    if (!startAt || !ev.name) continue;
    events.push({
      title: String(ev.name).trim(),
      startAt: toUTC(startAt),
      endAt: pd(ev.endDate) ? toUTC(pd(ev.endDate)!) : null,
      description: (ev.description as string) ?? null,
      venueName: (ev.location?.name as string) ?? null,
      address: (ev.location?.address?.streetAddress as string) ?? null,
      website: (ev.url as string) ?? pageUrl,
      imageUrl: typeof ev.image === 'string' ? ev.image : ((ev.image?.[0] as string) ?? null),
      contactEmail: null,
      contactPhone: null,
    });
  }

  if (events.length) return events;

  // CivicLive / generic government calendar selectors
  const cardSel = [
    '.event-listing',
    '.calendar-event',
    '.event-item',
    '[class*="event"]',
    'article',
    '.views-row',
    'li.event',
  ].join(', ');

  $(cardSel).each((_, el) => {
    const title =
      $(el).find('h2, h3, h4, .event-title, .title, a').first().text().trim();
    if (!title) return;

    const timeEl = $(el).find('time').first();
    const dateStr =
      timeEl.attr('datetime') ??
      timeEl.text().trim() ??
      $(el).find('.event-date, .date, [class*="date"]').first().text().trim();
    const startAt = pd(dateStr);
    if (!startAt) return;

    const description = $(el).find('p, .description').first().text().trim() || null;
    const venueName = $(el).find('.location, .venue, [class*="venue"]').first().text().trim() || null;
    const website = $(el).find('a[href]').first().attr('href') ?? pageUrl;
    const imageUrl = $(el).find('img').first().attr('src') ?? null;
    const contactEmail =
      $(el).find('a[href^="mailto:"]').first().attr('href')?.replace(/^mailto:/i, '').trim() ?? null;
    const contactPhone =
      $(el).find('a[href^="tel:"]').first().attr('href')?.replace(/^tel:/i, '').trim() ?? null;

    events.push({
      title,
      startAt: toUTC(startAt),
      endAt: null,
      description,
      venueName,
      address: null,
      website,
      imageUrl,
      contactEmail,
      contactPhone,
    });
  });

  return events;
};

export const ingestSummersideCity = async ({ maxPages = 50 }: { maxPages?: number } = {}) => {
  const allEvents: (ParsedEvent & { sourceRef: string })[] = [];

  // Try the main city calendar first, then CivicLive subdomain
  const urlsToTry = [
    CALENDAR_URL,
    CIVICLIVE_EVENTS,
    `${CIVICLIVE_EVENTS}/search/results/all`,
  ];

  for (const url of urlsToTry) {
    try {
      const html = await getText(url);
      const $ = cheerio.load(html);
      const found = parsePage($, url);
      if (found.length) {
        found.forEach(ev => allEvents.push({ ...ev, sourceRef: url }));
        break;
      }
    } catch {}
  }

  // If none found yet, try paginating the main calendar
  if (!allEvents.length) {
    for (let p = 1; p <= maxPages; p++) {
      try {
        const url = `${CALENDAR_URL}?page=${p}`;
        const html = await getText(url);
        const $ = cheerio.load(html);
        const found = parsePage($, url);
        if (!found.length) break;
        found.forEach(ev => allEvents.push({ ...ev, sourceRef: url }));
      } catch {
        break;
      }
    }
  }

  let upserts = 0;
  const errors: { title: string; message: string }[] = [];

  for (const ev of allEvents) {
    try {
      const id = makeId(ev.sourceRef + ev.title, ev.startAt);
      await prisma.event.upsert({
        where: { id },
        update: {
          title: ev.title,
          description: ev.description,
          startAt: ev.startAt,
          endAt: ev.endAt,
          venueName: ev.venueName,
          address: ev.address,
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
          venueName: ev.venueName,
          address: ev.address,
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
    source: CALENDAR_URL,
    linksFound: allEvents.length,
    upserts,
    errors: errors.slice(0, 25),
  };
};
