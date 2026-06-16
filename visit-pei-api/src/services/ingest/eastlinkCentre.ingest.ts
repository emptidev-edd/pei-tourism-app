import crypto from 'crypto';
import { prisma } from '../../config/prisma.js';

// Eastlink Centre uses WordPress with a custom `event` post type
// Events are loaded via JS on the front end — use the WP REST API instead
const API_BASE = 'https://www.eastlinkcentrepei.com/wp-json/wp/v2/event';
const SITE_URL = 'https://www.eastlinkcentrepei.com';
const SOURCE = 'EASTLINK_CENTRE';

const makeId = (ref: string, d: Date) =>
  `eastlinkcentre:${crypto.createHash('sha1').update(`${ref}|${d.toISOString()}`).digest('hex')}`;

const toUTC = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const MONTHS_RE = /January|February|March|April|May|June|July|August|September|October|November|December/gi;
const MONTH_MAP: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

const stripOrdinal = (s: string) => s.replace(/(\d+)(?:st|nd|rd|th)/gi, '$1');

// Extract the first clear event date from content text
const extractDateFromText = (text: string): Date | null => {
  const stripped = stripOrdinal(text);
  const monthsPattern = Object.keys(MONTH_MAP)
    .map(m => m.charAt(0).toUpperCase() + m.slice(1))
    .join('|');
  const re = new RegExp(`(${monthsPattern})\\s+(\\d{1,2})(?:\\s*[-–]\\s*\\d{1,2})?(?:,\\s*)?(\\d{4})?`, 'i');
  const m = stripped.match(re);
  if (!m) return null;
  const month = MONTH_MAP[m[1].toLowerCase()];
  if (month === undefined) return null;
  const day = +m[2];
  const year = m[3] ? +m[3] : new Date().getFullYear();
  const d = new Date(Date.UTC(year, month, day));
  return isFinite(d.getTime()) ? d : null;
};

const htmlToText = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim();

const decodeHtmlEntities = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
   .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

const extractImageFromContent = (html: string): string | null => {
  const m = html.match(/src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"/i);
  return m ? m[1] : null;
};

type WpEvent = {
  id: number;
  date: string;
  title: { rendered: string };
  content: { rendered: string };
  link: string;
  featured_media: number;
  _embedded?: { 'wp:featuredmedia'?: { source_url: string }[] };
};

const fetchPage = async (page: number): Promise<WpEvent[]> => {
  const url = `${API_BASE}?per_page=100&page=${page}&_embed&_fields=id,date,title,content,link,featured_media,_embedded`;
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (res.status === 400) return []; // WP returns 400 for out-of-range page
  if (!res.ok) throw new Error(`WP API error ${res.status}`);
  return res.json() as Promise<WpEvent[]>;
};

export const ingestEastlinkCentre = async ({ maxPages = 50 }: { maxPages?: number } = {}) => {
  const allEvents: WpEvent[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const batch = await fetchPage(page);
    if (!batch.length) break;
    allEvents.push(...batch);
  }

  let upserts = 0;
  const errors: { title: string; message: string }[] = [];

  for (const wpEv of allEvents) {
    try {
      const title = decodeHtmlEntities(wpEv.title.rendered).trim();
      if (!title) continue;

      const contentText = htmlToText(wpEv.content.rendered);

      // Try to extract actual event date from content; fall back to post date
      const dateFromContent = extractDateFromText(contentText);
      const startAt = toUTC(dateFromContent ?? new Date(wpEv.date));

      const description = contentText.slice(0, 500) || null;
      const imageUrl =
        wpEv._embedded?.['wp:featuredmedia']?.[0]?.source_url ??
        extractImageFromContent(wpEv.content.rendered) ??
        null;

      const id = makeId(wpEv.link, startAt);
      await prisma.event.upsert({
        where: { id },
        update: {
          title,
          description,
          startAt,
          imageUrl,
          venueName: 'Eastlink Centre',
          community: 'Summerside',
          website: wpEv.link,
          source: SOURCE,
          sourceRef: wpEv.link,
        },
        create: {
          id,
          title,
          description,
          startAt,
          endAt: null,
          allDay: true,
          imageUrl,
          venueName: 'Eastlink Centre',
          community: 'Summerside',
          website: wpEv.link,
          categories: [],
          tags: [],
          source: SOURCE,
          sourceRef: wpEv.link,
        },
      });
      upserts++;
    } catch (e: any) {
      errors.push({ title: wpEv.title?.rendered ?? '?', message: e?.message ?? 'Unknown' });
    }
  }

  return { source: `${SITE_URL}/events/`, linksFound: allEvents.length, upserts, errors: errors.slice(0, 25) };
};
