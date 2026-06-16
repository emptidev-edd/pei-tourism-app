import crypto from 'crypto';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { getText } from '../httpText.js';
import { prisma } from '../../config/prisma.js';

const BASE = 'https://www.princeedwardisland.ca';
const LIST_URL = `${BASE}/en/events`;
const SOURCE = 'GOV_PEI_EVENTS';

const rss = new Parser();

const makeId = (ref: string, d: Date) =>
  `govpei:${crypto.createHash('sha1').update(`${ref}|${d.toISOString()}`).digest('hex')}`;

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
      (j?.['@graph'] ?? []).filter((x: any) => x['@type'] === 'Event').forEach((x: any) => evs.push(x));
    } catch {}
  });
  return evs;
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
      address: (ev.location?.address?.streetAddress as string) ?? null,
      community: (ev.location?.address?.addressLocality as string) ?? null,
      website: (ev.url as string) ?? url,
      imageUrl: typeof ev.image === 'string' ? ev.image : ((ev.image?.[0] as string) ?? null),
      contactEmail: null as string | null,
      contactPhone: null as string | null,
    };
  }

  const title = $('h1').first().text().trim();
  if (!title) return null;

  const timeEl = $('time').first();
  const startAt = pd(timeEl.attr('datetime') ?? timeEl.text().trim());
  if (!startAt) return null;

  const description =
    $('.field--name-body p, .field-body p, main article p').first().text().trim() || null;
  const community =
    $('.field--name-field-event-location, .event-location').first()
      .text()
      .replace(/\s+/g, ' ')
      .trim() || null;
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
    venueName: null,
    address: null,
    community,
    website: url,
    imageUrl,
    contactEmail,
    contactPhone,
  };
};

const getLinksFromPage = async (page: number): Promise<string[]> => {
  const url = page === 0 ? LIST_URL : `${LIST_URL}?page=${page}`;
  const html = await getText(url);
  const $ = cheerio.load(html);
  const links: string[] = [];
  const seen = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (!href.match(/\/en\/(topic|events)\//i) || href === '/en/events' || href === '/en/events/')
      return;
    const abs = href.startsWith('http') ? href : `${BASE}${href}`;
    if (!seen.has(abs)) {
      seen.add(abs);
      links.push(abs);
    }
  });

  return links;
};

export const ingestGovPeiEvents = async ({ maxPages = 50 }: { maxPages?: number } = {}) => {
  const links: string[] = [];
  let usedRss = false;

  for (const rssUrl of [`${LIST_URL}?_format=rss`, `${BASE}/en/rss/events.xml`]) {
    try {
      const feed = await rss.parseURL(rssUrl);
      feed.items.forEach(i => i.link && links.push(i.link));
      usedRss = true;
      break;
    } catch {}
  }

  if (!usedRss) {
    for (let p = 0; p < maxPages; p++) {
      const batch = await getLinksFromPage(p);
      if (!batch.length) break;
      links.push(...batch);
    }
  }

  const unique = [...new Set(links)];
  let upserts = 0;
  const errors: { url: string; message: string }[] = [];

  for (const url of unique) {
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
          address: ev.address,
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

  return { source: LIST_URL, linksFound: unique.length, upserts, errors: errors.slice(0, 25) };
};
