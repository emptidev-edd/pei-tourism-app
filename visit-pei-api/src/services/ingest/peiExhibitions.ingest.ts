import crypto from 'crypto';
import { getText } from '../httpText.js';
import { prisma } from '../../config/prisma.js';

const SCHEDULE_URL = 'https://www.peiae.ca/schedule';
const SOURCE = 'PEI_EXHIBITIONS';

const makeId = (ref: string, d: Date) =>
  `peiexhibitions:${crypto.createHash('sha1').update(`${ref}|${d.toISOString()}`).digest('hex')}`;

const MONTH_MAP: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, october: 9, oct: 9,
  november: 10, nov: 10, december: 11, dec: 11,
};

// Strip ordinal suffixes: "26th" → "26", "1st" → "1", "3rd" → "3"
const stripOrdinal = (s: string) => s.replace(/(\d+)(?:st|nd|rd|th)/gi, '$1');

const parseExhibitionDate = (raw: string): { startAt: Date; endAt?: Date } | null => {
  const txt = stripOrdinal(raw).replace(/\s+/g, ' ').replace(/\(Rain Date:[^)]+\)/gi, '').trim();
  const y = new Date().getFullYear();

  // "July 15-18, 2026"
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

  // "June 26-July 4, 2026"
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

  // "July 18, 2026"
  const single = txt.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
  if (single) {
    const m = MONTH_MAP[single[1].toLowerCase()];
    if (m === undefined) return null;
    return { startAt: new Date(Date.UTC(+single[3], m, +single[2])) };
  }

  const d = new Date(txt);
  if (isFinite(d.getTime())) return { startAt: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) };

  return null;
};

const MONTHS_RE = 'January|February|March|April|May|June|July|August|September|October|November|December';
const COUNTIES = ['Prince County', 'Queens County', 'Kings County'];

type RawItem = { name: string; dateRaw: string; community: string };

const scrapeSchedule = async (): Promise<RawItem[]> => {
  const html = await getText(SCHEDULE_URL);

  // Squarespace embeds page content inside <script> JSON blocks.
  // Stripping only tags (not script content) is the correct approach —
  // this mirrors what worked when testing with curl + Python.
  const bodyText = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const items: RawItem[] = [];
  const seen = new Set<string>();

  // Find all occurrences of "Name MonthDay[th]-..., Year" in the text
  // We look for a month name and work backwards to find the event name
  const fullDateRe = new RegExp(
    `([A-Z][A-Za-z '\\-&àâéèê]+?)\\s+` +
    `((${MONTHS_RE})\\s+\\d{1,2}(?:st|nd|rd|th)?` +
    `(?:\\s*[-–]\\s*(?:(?:${MONTHS_RE})\\s+)?\\d{1,2}(?:st|nd|rd|th)?)?,?\\s*(?:\\(Rain Date:[^)]+\\))?\\s*\\d{4})`,
    'g',
  );

  let match: RegExpExecArray | null;
  while ((match = fullDateRe.exec(bodyText)) !== null) {
    let name = match[1].trim();
    const dateRaw = match[2].trim();

    // Strip leading county prefix if present
    for (const county of COUNTIES) {
      if (name.startsWith(county)) {
        name = name.slice(county.length).trim();
      }
    }

    // Skip very short or very long names, and county headers themselves
    if (name.length < 4 || name.length > 80 || COUNTIES.includes(name)) continue;

    const key = `${name}|${dateRaw}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Determine community from which county section the text is in
    let community = 'PEI';
    const pos = match.index;
    let lastCounty = 'PEI';
    for (const county of COUNTIES) {
      const ci = bodyText.lastIndexOf(county, pos);
      const li = bodyText.lastIndexOf(lastCounty === 'PEI' ? '' : lastCounty, pos);
      if (ci !== -1 && ci > li) lastCounty = county;
    }
    community = lastCounty;

    items.push({ name, dateRaw, community });
  }

  return items;
};

export const ingestPeiExhibitions = async () => {
  const rawItems = await scrapeSchedule();
  let upserts = 0;
  const errors: { name: string; message: string }[] = [];

  for (const item of rawItems) {
    try {
      const dates = parseExhibitionDate(item.dateRaw);
      if (!dates) continue;

      const sourceRef = `${SCHEDULE_URL}#${encodeURIComponent(item.name)}`;
      const id = makeId(sourceRef, dates.startAt);

      await prisma.event.upsert({
        where: { id },
        update: {
          title: item.name,
          startAt: dates.startAt,
          endAt: dates.endAt ?? null,
          allDay: true,
          community: item.community,
          website: SCHEDULE_URL,
          source: SOURCE,
          sourceRef,
        },
        create: {
          id,
          title: item.name,
          startAt: dates.startAt,
          endAt: dates.endAt ?? null,
          allDay: true,
          community: item.community,
          website: SCHEDULE_URL,
          categories: [],
          tags: [],
          source: SOURCE,
          sourceRef,
        },
      });
      upserts++;
    } catch (e: any) {
      errors.push({ name: item.name, message: e?.message ?? 'Unknown' });
    }
  }

  return { source: SCHEDULE_URL, linksFound: rawItems.length, upserts, errors: errors.slice(0, 25) };
};
