import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { getText } from '../httpText.js';
import { prisma } from '../../config/prisma.js';

const BASE = 'https://exploresummerside.com';
const LIST_URL = `${BASE}/events/`;
const SOURCE = 'EXPLORE_SUMMERSIDE';

const makeId = (ref: string, d: Date) =>
  `exploresummerside:${crypto.createHash('sha1').update(`${ref}|${d.toISOString()}`).digest('hex')}`;

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

const parseDateRange = (raw: string): { startAt: Date; endAt?: Date } | null => {
  const txt = raw.replace(/\s+/g, ' ').trim();
  const y = new Date().getFullYear();

  const sameMonth = txt.match(/^([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})?$/);
  if (sameMonth) {
    const m = MONTH_MAP[sameMonth[1].toLowerCase()];
    if (m === undefined) return null;
    const yr = sameMonth[4] ? +sameMonth[4] : y;
    return {
      startAt: new Date(Date.UTC(yr, m, +sameMonth[2])),
      endAt: new Date(Date.UTC(yr, m, +sameMonth[3])),
    };
  }

  const crossMonth = txt.match(
    /^([A-Za-z]+)\s+(\d{1,2})\s*[-–]\s*([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})?$/,
  );
  if (crossMonth) {
    const m1 = MONTH_MAP[crossMonth[1].toLowerCase()];
    const m2 = MONTH_MAP[crossMonth[3].toLowerCase()];
    if (m1 === undefined || m2 === undefined) return null;
    const yr = crossMonth[5] ? +crossMonth[5] : y;
    return {
      startAt: new Date(Date.UTC(yr, m1, +crossMonth[2])),
      endAt: new Date(Date.UTC(yr, m2, +crossMonth[4])),
    };
  }

  const single = txt.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
  if (single) {
    const m = MONTH_MAP[single[1].toLowerCase()];
    if (m === undefined) return null;
    return { startAt: new Date(Date.UTC(+single[3], m, +single[2])) };
  }

  const d = new Date(txt);
  if (isFinite(d.getTime())) return { startAt: toUTC(d) };

  return null;
};

type ListItem = { url: string; imageUrl: string | null };

const getLinksFromPage = async (page: number): Promise<ListItem[]> => {
  const url = page === 0 ? LIST_URL : `${LIST_URL}?page=${page}`;
  const html = await getText(url);
  const $ = cheerio.load(html);
  const items: ListItem[] = [];
  const seen = new Set<string>();

  // Explore Summerside uses WordPress or a tourism CMS
  const cardSel = 'article, .event-card, .event-item, .post, .views-row, [class*="event"]';
  $(cardSel).each((_, el) => {
    const anchor = $(el).find('a[href]').first();
    const href = anchor.attr('href');
    if (!href) return;
    const abs = href.startsWith('http') ? href : `${BASE}${href}`;
    if (seen.has(abs)) return;
    seen.add(abs);
    const imageUrl = $(el).find('img').first().attr('src') ?? null;
    items.push({ url: abs, imageUrl });
  });

  // Generic link fallback
  if (!items.length) {
    $(`a[href^="${BASE}/events/"], a[href^="/events/"]`).each((_, el) => {
      const href = $(el).attr('href') ?? '';
      if (href === LIST_URL || href === '/events/') return;
      const abs = href.startsWith('http') ? href : `${BASE}${href}`;
      if (!seen.has(abs)) {
        seen.add(abs);
        items.push({ url: abs, imageUrl: null });
      }
    });
  }

  return items;
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

const scrapeDetail = async (url: string, listImageUrl: string | null) => {
  const html = await getText(url);
  const $ = cheerio.load(html);

  // JSON-LD
  for (const j of extractLdEvents($)) {
    const startAt = pd(j.startDate);
    if (!startAt) continue;
    return {
      title: String(j.name ?? '').trim(),
      startAt: toUTC(startAt),
      endAt: pd(j.endDate) ? toUTC(pd(j.endDate)!) : null,
      description: (j.description as string) ?? null,
      venueName: (j.location?.name as string) ?? null,
      website: (j.url as string) ?? url,
      imageUrl: listImageUrl ?? (typeof j.image === 'string' ? j.image : null),
      contactEmail: (j.organizer?.email as string) ?? null,
      contactPhone: (j.organizer?.telephone as string) ?? null,
      community: 'Summerside',
    };
  }

  const title = $('h1').first().text().trim();
  if (!title) return null;

  // Date: "Event Date:" label pattern (same as Tourism PEI partner sites)
  const bodyText = $('body').text().replace(/\s+/g, ' ');
  const dateMatch = bodyText.match(/(?:Event\s*Date|Date)[:\s]+([A-Za-z].+?\d{4})/);
  const dateRaw = dateMatch?.[1]?.trim();
  const dates = dateRaw ? parseDateRange(dateRaw) : null;

  // Also try time[datetime]
  const timeEl = $('time').first();
  const startAt = dates?.startAt ?? pd(timeEl.attr('datetime') ?? timeEl.text().trim());
  if (!startAt) return null;

  const description = $('main p, .entry-content p, .field-body p').first().text().trim() || null;

  // Explore Summerside contact block (already known from existing scraper)
  const contact = $('div.contact').first();
  const mailto = contact.find('a[href^="mailto:"]').first().attr('href');
  const tel = contact.find('a[href^="tel:"]').first().attr('href');
  const contactEmail = mailto ? mailto.replace(/^mailto:\s*/i, '').trim() : null;
  const contactPhone = tel ? tel.replace(/^tel:\s*/i, '').trim() : null;

  const locSpan = contact.find('strong:contains("Location")').first().parent().find('span').first().text().trim();
  const community = locSpan || 'Summerside';

  const imageUrl =
    listImageUrl ??
    $('meta[property="og:image"]').attr('content') ??
    $('main img, .entry-content img').first().attr('src') ??
    null;

  const websiteEl = $('div.links a.btn.extlink, a:contains("Visit Website")').first();
  const website = websiteEl.attr('href') ?? url;

  return {
    title,
    startAt: toUTC(startAt),
    endAt: dates?.endAt ? toUTC(dates.endAt) : null,
    description,
    venueName: null,
    website,
    imageUrl,
    contactEmail,
    contactPhone,
    community,
  };
};

export const ingestExploreSummerside = async ({ maxPages = 50 }: { maxPages?: number } = {}) => {
  const allItems: ListItem[] = [];
  const seen = new Set<string>();

  for (let p = 0; p < maxPages; p++) {
    const batch = await getLinksFromPage(p);
    if (!batch.length) break;
    batch.forEach(item => {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        allItems.push(item);
      }
    });
  }

  let upserts = 0;
  const errors: { url: string; message: string }[] = [];

  for (const { url, imageUrl } of allItems) {
    try {
      const ev = await scrapeDetail(url, imageUrl);
      if (!ev?.title || !ev.startAt) continue;
      const id = makeId(url, ev.startAt);
      await prisma.event.upsert({
        where: { id },
        update: {
          title: ev.title,
          description: ev.description,
          startAt: ev.startAt,
          endAt: ev.endAt,
          venueName: ev.venueName,
          community: ev.community,
          website: ev.website,
          imageUrl: ev.imageUrl,
          contactEmail: ev.contactEmail,
          contactPhone: ev.contactPhone,
          source: SOURCE,
          sourceRef: url,
        },
        create: {
          id,
          title: ev.title,
          description: ev.description,
          startAt: ev.startAt,
          endAt: ev.endAt,
          allDay: true,
          venueName: ev.venueName,
          community: ev.community,
          website: ev.website,
          imageUrl: ev.imageUrl,
          contactEmail: ev.contactEmail,
          contactPhone: ev.contactPhone,
          categories: [],
          tags: [],
          source: SOURCE,
          sourceRef: url,
        },
      });
      upserts++;
    } catch (e: any) {
      errors.push({ url, message: e?.message ?? 'Unknown' });
    }
  }

  return { source: LIST_URL, linksFound: allItems.length, upserts, errors: errors.slice(0, 25) };
};
