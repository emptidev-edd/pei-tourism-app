import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { getText } from '../httpText.js';
import { prisma } from '../../config/prisma.js';

const BASE = 'https://www.discovercharlottetown.com';
const LIST_URL = `${BASE}/events/`;
const SOURCE = 'DISCOVER_CHARLOTTETOWN';

const makeId = (ref: string, d: Date) =>
  `dcharlottetown:${crypto.createHash('sha1').update(`${ref}|${d.toISOString()}`).digest('hex')}`;

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

const getLinksFromPage = async (page: number): Promise<string[]> => {
  const url = page === 0 ? LIST_URL : `${LIST_URL}page/${page}/`;
  const html = await getText(url);
  const $ = cheerio.load(html);
  const links: string[] = [];
  const seen = new Set<string>();

  const push = (href: string) => {
    const abs = href.startsWith('http') ? href : `${BASE}${href}`;
    if (!seen.has(abs)) {
      seen.add(abs);
      links.push(abs);
    }
  };

  // The Events Calendar plugin selectors
  $('a.tribe-event-url, .tribe-events-list a[href*="/event/"], .wp-block-tribe-events a[href*="/event/"], article a[href*="/event/"]')
    .each((_, el) => {
      const href = $(el).attr('href');
      if (href) push(href);
    });

  // JSON-LD on list page may have urls
  for (const ev of extractLdEvents($)) {
    const u = ev.url ?? ev['@id'];
    if (typeof u === 'string') push(u);
  }

  // Generic fallback: any link with /event/ in the path
  if (!links.length) {
    $('a[href*="/event/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) push(href);
    });
  }

  return links;
};

const scrapeDetail = async (url: string) => {
  const html = await getText(url);
  const $ = cheerio.load(html);

  for (const ev of extractLdEvents($)) {
    const startAt = pd(ev.startDate);
    if (!startAt) continue;
    return {
      title: String(ev.name ?? '').trim(),
      startAt: toUTC(startAt),
      endAt: pd(ev.endDate) ? toUTC(pd(ev.endDate)!) : null,
      description: (ev.description as string) ?? null,
      venueName: (ev.location?.name as string) ?? null,
      address:
        [ev.location?.address?.streetAddress, ev.location?.address?.addressLocality]
          .filter(Boolean)
          .join(', ') || null,
      community:
        (ev.location?.address?.addressLocality as string) ?? 'Charlottetown',
      website: (ev.url as string) ?? url,
      imageUrl:
        typeof ev.image === 'string'
          ? ev.image
          : ((ev.image?.url ?? ev.image?.[0]) as string | null) ?? null,
      contactEmail: (ev.organizer?.email as string) ?? null,
      contactPhone: (ev.organizer?.telephone as string) ?? null,
    };
  }

  // The Events Calendar HTML fallback
  const title =
    $('.tribe-events-single-event-title, h1.entry-title, h1').first().text().trim();
  if (!title) return null;

  const startEl = $('abbr.tribe-events-abbr[title], time[datetime]').first();
  const startAt = pd(
    startEl.attr('title') ?? startEl.attr('datetime') ?? startEl.text().trim(),
  );
  if (!startAt) return null;

  const description =
    $('.tribe-events-single-section--description p, .entry-content p')
      .first()
      .text()
      .trim() || null;
  const venueName =
    $('.tribe-venue, .tribe-venue-location').first().text().replace(/\s+/g, ' ').trim() || null;
  const imageUrl = $('meta[property="og:image"]').attr('content') ?? null;
  const contactEmail =
    $('a[href^="mailto:"]').first().attr('href')?.replace(/^mailto:/i, '').trim() ?? null;
  const contactPhone =
    $('a[href^="tel:"]').first().attr('href')?.replace(/^tel:/i, '').trim() ?? null;

  return {
    title,
    startAt: toUTC(startAt),
    endAt: null,
    description,
    venueName,
    address: null,
    community: 'Charlottetown',
    website: url,
    imageUrl,
    contactEmail,
    contactPhone,
  };
};

export const ingestDiscoverCharlottetown = async ({ maxPages = 50 }: { maxPages?: number } = {}) => {
  const links: string[] = [];
  const seen = new Set<string>();

  for (let p = 0; p < maxPages; p++) {
    const batch = await getLinksFromPage(p);
    if (!batch.length) break;
    batch.forEach(l => {
      if (!seen.has(l)) {
        seen.add(l);
        links.push(l);
      }
    });
  }

  let upserts = 0;
  const errors: { url: string; message: string }[] = [];

  for (const url of links) {
    try {
      const ev = await scrapeDetail(url);
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
          address: ev.address,
          community: ev.community,
          website: ev.website,
          imageUrl: ev.imageUrl,
          contactEmail: ev.contactEmail ?? null,
          contactPhone: ev.contactPhone ?? null,
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
          address: ev.address,
          community: ev.community,
          website: ev.website,
          imageUrl: ev.imageUrl,
          contactEmail: ev.contactEmail ?? null,
          contactPhone: ev.contactPhone ?? null,
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

  return { source: LIST_URL, linksFound: links.length, upserts, errors: errors.slice(0, 25) };
};
