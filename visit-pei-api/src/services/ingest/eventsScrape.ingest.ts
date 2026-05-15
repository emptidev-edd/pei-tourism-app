import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { getText } from '../httpText.js';
import { prisma } from '../../config/prisma.js';

const BASE_LIST_URL = 'https://www.tourismpei.com/what-to-do/events';

const normalizePhone = (raw: string) => {
  const cleaned = raw.replace(/[^\d+]/g, '');
  const digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;

  if (digits.length < 10 || digits.length > 15) return null;

  if (digits.length === 11 && digits.startsWith('1')) return digits;
  if (digits.length === 10) return digits;

  return digits;
};

const visibleText = ($: cheerio.CheerioAPI) => {
  $('script, style, noscript, head, meta, link').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
};

const scrapePartnerContact = async (partnerUrl: string) => {
  const html = await getText(partnerUrl);
  const $ = cheerio.load(html);

  // Special-case Explore Summerside (best structured)
  if (partnerUrl.includes('exploresummerside.com')) {
    const contact = $('div.contact').first();
    const mailto = contact.find('a[href^="mailto:"]').first().attr('href');
    const tel = contact.find('a[href^="tel:"]').first().attr('href');

    const contactEmail = mailto
      ? mailto.replace(/^mailto:\s*/i, '').trim()
      : null;
    const contactPhone = tel
      ? normalizePhone(tel.replace(/^tel:\s*/i, '').trim())
      : null;

    const community =
      contact
        .find('strong:contains("Location")')
        .first()
        .parent()
        .find('span')
        .first()
        .text()
        .trim() || null;

    return { community, contactEmail, contactPhone };
  }

  // 1) EMAIL (prefer mailto)
  let contactEmail: string | null = null;
  const mailto = $('a[href^="mailto:"]').first().attr('href');
  if (mailto) {
    contactEmail = mailto.replace(/^mailto:\s*/i, '').trim();
  } else {
    const text = visibleText($);
    const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    contactEmail = m?.[0] ?? null;
  }

  // 2) PHONE (prefer tel)
  let contactPhone: string | null = null;
  const telHref = $('a[href^="tel:"]').first().attr('href');
  if (telHref) {
    contactPhone = normalizePhone(telHref.replace(/^tel:\s*/i, '').trim());
  } else {
    const text = visibleText($);
    const m = text.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/);
    contactPhone = m ? normalizePhone(m[0]) : null;
  }

  return { community: null, contactEmail, contactPhone };
};

const toDateOnlyUTC = (d: Date) => {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0),
  );
};

const parseIsoDate = (s?: string) => {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : undefined;
};

const makeId = (sourceRef: string, startAt: Date) => {
  const hash = crypto
    .createHash('sha1')
    .update(`${sourceRef}|${startAt.toISOString()}`)
    .digest('hex');
  return `tourismpei:${hash}`;
};

// Parses strings like:
// "February 13 - 16, 2026"
// "Feb 6 - Mar 1, 2026"
// "Feb 11, 2026"
const parseTourismPeiDateRange = (
  raw: string,
): { startAt: Date; endAt?: Date } | null => {
  const txt = raw.replace(/\s+/g, ' ').trim();

  // Try: "Month D, YYYY"
  const single = txt.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (single) {
    const d = new Date(`${single[1]} ${single[2]}, ${single[3]} 12:00:00`);
    if (!Number.isFinite(d.getTime())) return null;
    return { startAt: toDateOnlyUTC(d) };
  }

  // Try: "Month D - D, YYYY"
  const sameMonth = txt.match(
    /^([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2}),\s*(\d{4})$/,
  );
  if (sameMonth) {
    const start = new Date(
      `${sameMonth[1]} ${sameMonth[2]}, ${sameMonth[4]} 12:00:00`,
    );
    const end = new Date(
      `${sameMonth[1]} ${sameMonth[3]}, ${sameMonth[4]} 12:00:00`,
    );
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()))
      return null;
    return { startAt: toDateOnlyUTC(start), endAt: toDateOnlyUTC(end) };
  }

  // Try: "Month D - Month D, YYYY"
  const crossMonth = txt.match(
    /^([A-Za-z]+)\s+(\d{1,2})\s*-\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/,
  );
  if (crossMonth) {
    const start = new Date(
      `${crossMonth[1]} ${crossMonth[2]}, ${crossMonth[5]} 12:00:00`,
    );
    const end = new Date(
      `${crossMonth[3]} ${crossMonth[4]}, ${crossMonth[5]} 12:00:00`,
    );
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()))
      return null;
    return { startAt: toDateOnlyUTC(start), endAt: toDateOnlyUTC(end) };
  }

  return null;
};

const withinRange = (d: Date, start?: Date, end?: Date) => {
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

type ListItem = { url: string; listCommunity: string | null };

const getEventLinksFromListPage = async (page: number): Promise<ListItem[]> => {
  const url = `${BASE_LIST_URL}?page=${page}`;
  const html = await getText(url);
  const $ = cheerio.load(html);

  const items: ListItem[] = [];
  const seen = new Set<string>();

  // Each card has a "Full Details" link; easiest is to capture those
  $('a:contains("Full Details")').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || !href.startsWith('/what-to-do/events/')) return;

    const abs = new URL(href, 'https://www.tourismpei.com').toString();
    if (seen.has(abs)) return;
    seen.add(abs);

    const card = $(el).closest('article, .views-row, .card, .result');
    const cardText = card.text().replace(/\s+/g, ' ').trim();

    // Extract "Summerside | Summerside Area" => Summerside
    const m = cardText.match(/([A-Za-z \-']+)\s*\|\s*([A-Za-z \-']+ Area)/);
    const listCommunity = m?.[1]?.trim() ?? null;

    items.push({ url: abs, listCommunity });
  });

  return items;
};

const scrapeEventDetail = async (
  url: string,
  listCommunity?: string | null,
) => {
  const html = await getText(url);
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();
  if (!title) throw new Error(`No title found for ${url}`);

  const bodyText = $('body').text().replace(/\s+/g, ' ');

  // Event Date
  const dateMatch = bodyText.match(/Event Date:\s*([A-Za-z].+?\d{4})/);
  if (!dateMatch) throw new Error(`No Event Date found for ${url}`);

  const dateRange = parseTourismPeiDateRange(dateMatch[1].trim());
  if (!dateRange)
    throw new Error(`Could not parse Event Date "${dateMatch[1]}" for ${url}`);

  // Website (Visit Website button)
  const website =
    $('div.links a.btn.extlink').first().attr('href')?.trim() ||
    $('a:contains("Visit Website")').first().attr('href')?.trim() ||
    null;

  // Partner override (if Tourism PEI links out)
  let partnerCommunity: string | null = null;
  let partnerEmail: string | null = null;
  let partnerPhone: string | null = null;

  if (website) {
    try {
      const partner = await scrapePartnerContact(website);
      console.log('Partner URL:', website);
      console.log('Partner extracted:', partner);
      partnerCommunity = partner.community;
      partnerEmail = partner.contactEmail;
      partnerPhone = partner.contactPhone;
    } catch (e) {
      // if partner page fails, don't break ingestion
    }
  }

  // Better image: try content image first, fall back to og:image
  let imageUrl: string | null = null;
  
  // Try figure > img (actual event image)
  const contentImg = $('figure img').first().attr('src')?.trim();
  if (contentImg) {
    imageUrl = new URL(contentImg, 'https://www.tourismpei.com').toString();
  }
  
  // Fallback: og:image (often generic seo-default-image.jpg)
  if (!imageUrl) {
    const ogImage = $('meta[property="og:image"]').attr('content')?.trim();
    if (ogImage) {
      imageUrl = new URL(ogImage, 'https://www.tourismpei.com').toString();
    }
  }

  // Details text (best effort)
  const detailsHeading = $('h3:contains("Details")').first();
  let description: string | null = null;
  if (detailsHeading.length) {
    const next = detailsHeading
      .nextAll()
      .filter((_, el) => $(el).text().trim().length > 0)
      .first();
    description = next.text().trim() || null;
  }

  let community: string | null = null;
  let venueName: string | null = null;

  // Best source: div.contact > strong:contains("Location") > sibling span
  const contactBlock = $('div.contact').first();
  if (contactBlock.length) {
    const locStrong = contactBlock.find('strong:contains("Location")').first();
    if (locStrong.length) {
      const locSpan = locStrong
        .parent()
        .find('span')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();
      if (locSpan) community = locSpan;
    }
  }

  // Fallback: div.location text
  if (!community) {
    const locationText =
      $('div.location').first().text().replace(/\s+/g, ' ').trim() || null;
    if (locationText) {
      const parts = locationText
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
      community = parts[0] ?? null;
    }
  }

  if (!community) {
    const locHeader = $(
      'h3:contains("Location"), h2:contains("Location"), label:contains("Location")',
    ).first();
    if (locHeader.length) {
      const nextText = locHeader
        .nextAll()
        .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
        .get()
        .find((t) => t && t.length > 1);
      if (nextText) community = nextText;
    }
  }

  if (!community) {
    const placeLinkText = $('a[href^="/places-to-go/"]').first().text().trim();
    if (placeLinkText) community = placeLinkText;
  }

  if (!community) {
    const locMatch = bodyText.match(
      /Location\s+([A-Za-z0-9&,'().\- ]+)\s{2,}([A-Za-z0-9'().\- ]+)/,
    );
    venueName = locMatch?.[1]?.trim() || null;
    community = locMatch?.[2]?.trim() || null;
  }

  if (!community && website) {
    try {
      const host = new URL(website).hostname.toLowerCase();
      if (host.includes('summerside')) community = 'Summerside';
      else if (host.includes('charlottetown')) community = 'Charlottetown';
      else if (host.includes('kingscounty')) community = 'Kings County';
      else if (host.includes('princecounty')) community = 'Prince County';
    } catch {}
  }

  // Contact email + phone
  let contactEmail: string | null = null;
  let contactPhone: string | null = null;

  // Best source: div.contact > strong:contains("Contact") block
  if (contactBlock.length) {
    const contactStrong = contactBlock
      .find('strong:contains("Contact")')
      .first();
    if (contactStrong.length) {
      const contactP = contactStrong.parent();
      const mailto = contactP.find('a[href^="mailto:"]').first().attr('href');
      if (mailto) contactEmail = mailto.replace(/^mailto:\s*/i, '').trim();

      const tel = contactP.find('a[href^="tel:"]').first().attr('href');
      if (tel) contactPhone = tel.replace(/^tel:\s*/i, '').trim();
    }
  }

  // Fallback: h3/h2 Contact header section
  if (!contactEmail || !contactPhone) {
    const contactHeader = $(
      'h3:contains("Contact"), h2:contains("Contact")',
    ).first();
    const contactRoot = contactHeader.length ? contactHeader.parent() : null;

    if (contactRoot) {
      if (!contactEmail) {
        const mailtoHref = contactRoot
          .find('a[href^="mailto:"]')
          .first()
          .attr('href');
        if (mailtoHref)
          contactEmail = mailtoHref.replace(/^mailto:/i, '').trim();
      }
      if (!contactPhone) {
        const telHref = contactRoot
          .find('a[href^="tel:"]')
          .first()
          .attr('href');
        if (telHref) contactPhone = telHref.replace(/^tel:/i, '').trim();
      }
    }
  }

  // Final override: partner + listing card are source of truth
  const finalCommunity = partnerCommunity || community || listCommunity || null;
  const finalEmail = partnerEmail || contactEmail;
  const finalPhone = partnerPhone || contactPhone;

  return {
    sourceRef: url,
    title,
    startAt: dateRange.startAt,
    endAt: dateRange.endAt ?? null,
    allDay: true,
    venueName,
    community: finalCommunity,
    description,
    website,
    imageUrl,
    contactEmail: finalEmail,
    contactPhone: finalPhone,
  };
};

export const scrapeTourismPeiEvents = async (args: {
  startDate?: string;
  endDate?: string;
  maxPages?: number;
  tags?: string[];
}) => {
  const start = parseIsoDate(args.startDate);
  const end = parseIsoDate(args.endDate);
  const maxPages = args.maxPages ?? 5;

  const allItems: ListItem[] = [];

  // 1) gather links from list pages
  for (let p = 0; p < maxPages; p++) {
    const items = await getEventLinksFromListPage(p);
    allItems.push(...items);
    if (items.length === 0) break;
  }

  // 2) scrape each detail and upsert
  let scraped = 0;
  let upserts = 0;
  const errors: { url: string; message: string }[] = [];

  for (const item of allItems) {
    const { url, listCommunity } = item;
    try {
      const ev = await scrapeEventDetail(url, listCommunity);

      if (start && !withinRange(ev.startAt, start, undefined)) continue;
      if (end && !withinRange(ev.startAt, undefined, end)) continue;

      const id = makeId(ev.sourceRef, ev.startAt);

      await prisma.event.upsert({
        where: { id },
        update: {
          title: ev.title,
          description: ev.description,
          startAt: ev.startAt,
          endAt: ev.endAt,
          allDay: ev.allDay,
          venueName: ev.venueName,
          community: ev.community,
          website: ev.website,
          imageUrl: ev.imageUrl,
          contactEmail: ev.contactEmail ?? null,
          contactPhone: ev.contactPhone ?? null,
          tags: args.tags ?? [],
          source: 'TOURISM_PEI_SCRAPE',
          sourceRef: ev.sourceRef,
        },
        create: {
          id,
          title: ev.title,
          description: ev.description,
          startAt: ev.startAt,
          endAt: ev.endAt,
          allDay: ev.allDay,
          venueName: ev.venueName,
          community: ev.community,
          website: ev.website,
          imageUrl: ev.imageUrl,
          contactEmail: ev.contactEmail ?? null,
          contactPhone: ev.contactPhone ?? null,
          tags: args.tags ?? [],
          categories: [],
          source: 'TOURISM_PEI_SCRAPE',
          sourceRef: ev.sourceRef,
        },
      });

      scraped++;
      upserts++;
    } catch (e: any) {
      errors.push({ url, message: e?.message ?? 'Unknown error' });
    }
  }

  return {
    source: BASE_LIST_URL,
    pagesScanned: maxPages,
    linksFound: allItems.length,
    scraped,
    upserts,
    errors: errors.slice(0, 25),
  };
};
