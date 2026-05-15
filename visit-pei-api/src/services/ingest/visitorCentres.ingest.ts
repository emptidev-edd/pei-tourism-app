import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { prisma } from '../../config/prisma.js';
import { getText } from '../httpText.js';

const LIST_URL = process.env.VIC_LIST_URL!;
if (!LIST_URL) throw new Error('Missing env var: VIC_LIST_URL');

const BASE_URL = process.env.VIC_BASE_URL!;
if (!BASE_URL) throw new Error('Missing env var: VIC_BASE_URL');

function makeId(sourceRef: string) {
  const hash = crypto.createHash('sha1').update(sourceRef).digest('hex');
  return `vic:${hash}`;
}

function clean(text?: string | null) {
  return text ? text.replace(/\s+/g, ' ').trim() : null;
}

function extractCommunityFromTitle(title: string) {
  let t = title.replace(/Visitor Information Centre/i, '').trim();
  t = t.replace(/\s+-\s+/g, ' ').trim();
  return t || null;
}

function parseLatLngFromGoogleMapsHref(href?: string | null) {
  if (!href) return { lat: null, lng: null };

  // Try @lat,lng format (typical in google.com/maps URLs)
  let m = href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) {
    return {
      lat: Number(m[1]),
      lng: Number(m[2]),
    };
  }

  // Try q=lat,lng format (typical in embed URLs)
  m = href.match(/[?&]q=\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (m) {
    return {
      lat: Number(m[1]),
      lng: Number(m[2]),
    };
  }

  return { lat: null, lng: null };
}

function decodeCloudflareEmail(encodedString: string): string | null {
  try {
    const key = parseInt(encodedString.substring(0, 2), 16);
    let email = '';
    for (let i = 2; i < encodedString.length; i += 2) {
      const charCode = parseInt(encodedString.substring(i, i + 2), 16) ^ key;
      email += String.fromCharCode(charCode);
    }
    return email;
  } catch {
    return null;
  }
}

async function scrapeCentreDetail(url: string) {
  const html = await getText(url);
  const $ = cheerio.load(html);

  const title = clean($('h1').first().text()) || 'Visitor Information Centre';
  const community = extractCommunityFromTitle(title);

  // About text
  const aboutHeading = $('h2, h3')
    .filter(
      (_, el) => clean($(el).text())?.toLowerCase() === 'about this property',
    )
    .first();

  let description = null;
  if (aboutHeading.length) {
    const nextText = aboutHeading
      .nextAll()
      .map((_, el) => clean($(el).text()))
      .get()
      .find((t) => t && t.length > 20);

    description = nextText || null;
  }

  // Dates of operation / Hours - more comprehensive extraction
  let hoursText: string | null = null;

  // Try "Dates of Operation" label
  const datesLabel = $('strong, dt, .label')
    .filter((_, el) => {
      const text = clean($(el).text())?.toLowerCase();
      return text ? text.includes('dates of operation') : false;
    })
    .first();

  if (datesLabel.length) {
    // Get the next sibling or parent's next element
    const nextElem = datesLabel.next();
    if (nextElem.length) {
      hoursText = clean(nextElem.text());
    } else {
      const parent = datesLabel.parent();
      const afterText = parent.nextAll().first().text();
      hoursText = clean(afterText);
    }
  }

  // Fallback to time datetime elements
  if (!hoursText) {
    const timeElements = $('time[datetime]');
    if (timeElements.length >= 2) {
      const start = clean(timeElements.first().text());
      const end = clean(timeElements.last().text());
      if (start && end) {
        hoursText = `${start} - ${end}`;
      }
    }
  }

  // Last fallback to regex pattern
  if (!hoursText) {
    hoursText =
      clean($.text().match(/Hours of Operation\s*:?\s*([^\n\r]+)/i)?.[1]) ||
      null;
  }

  // Phone - improved extraction
  let phone: string | null = null;

  // Try tel: links first
  const telLink = $("a[href^='tel:']").first();
  if (telLink.length) {
    phone = telLink.attr('href')?.replace(/^tel:/i, '').trim() || null;
  }

  // Try contact section
  if (!phone) {
    const contactSection = $(".contact, [class*='contact']");
    if (contactSection.length) {
      const contactText = contactSection.text();
      const phoneMatch = contactText.match(
        /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/,
      );
      phone = phoneMatch?.[0] ?? null;
    }
  }

  // Final fallback - search entire body
  if (!phone) {
    const bodyText = $('body').text().replace(/\s+/g, ' ');
    const phoneMatch = bodyText.match(
      /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}/,
    );
    phone = phoneMatch?.[0] ?? null;
  }

  // Email extraction
  let email: string | null = null;

  // Try CloudFlare protected email first
  const cfEmail = $('span.__cf_email__').first();
  if (cfEmail.length) {
    const encoded = cfEmail.attr('data-cfemail');
    if (encoded) {
      email = decodeCloudflareEmail(encoded);
    }
  }

  // Try mailto: links
  if (!email) {
    const mailtoLink = $("a[href^='mailto:']").first();
    if (mailtoLink.length) {
      email =
        mailtoLink
          .attr('href')
          ?.replace(/^mailto:/i, '')
          .trim() || null;
    }
  }

  // Try contact section or body text for email pattern
  if (!email) {
    const bodyText = $('body').text();
    const emailMatch = bodyText.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    );
    email = emailMatch?.[0] ?? null;
  }

  // Website
  const website =
    $("a:contains('Website'), a:contains('Visit Website')")
      .first()
      .attr('href')
      ?.trim() || url;

  // Image - improved extraction
  let imageUrl: string | null = null;

  // Try figure img first
  imageUrl = $('figure img').attr('src') || null;

  // Try main content images
  if (!imageUrl) {
    imageUrl =
      $('main img, article img, .content img').first().attr('src') || null;
  }

  // Try og:image meta tag
  if (!imageUrl) {
    imageUrl = $('meta[property="og:image"]').attr('content') || null;
  }

  const finalImage =
    imageUrl && imageUrl.startsWith('http')
      ? imageUrl
      : imageUrl
        ? new URL(imageUrl, process.env.VIC_iMAGE_BASE_URL).toString()
        : null;

  // Address / directions - improved extraction
  let address: string | null = null;

  // Try "Location & Directions" heading
  const directionsHeading = $('h2, h3')
    .filter(
      (_, el) => clean($(el).text())?.toLowerCase() === 'location & directions',
    )
    .first();

  if (directionsHeading.length) {
    const directionsText = directionsHeading
      .nextAll()
      .map((_, el) => clean($(el).text()))
      .get()
      .find((t) => t && t.length > 10);

    address = directionsText || null;
  }

  // Try contact section with address class
  if (!address) {
    const addressElem = $(".address, [class*='address']").first();
    if (addressElem.length) {
      address = clean(addressElem.text());
    }
  }

  // Try to find community/region in structured format
  if (!address) {
    const communityElem = $(".community, .region, [class*='location']").first();
    if (communityElem.length) {
      address = clean(communityElem.text());
    }
  }

  // Try map link for lat/lng
  const mapsHref =
    $(
      "a[href*='google.com/maps'], a[href*='maps.google'], a[href*='goo.gl/maps']",
    )
      .first()
      .attr('href') ||
    $("iframe[src*='google.com/maps'], iframe[src*='maps.google']")
      .first()
      .attr('src') ||
    null;

  const { lat, lng } = parseLatLngFromGoogleMapsHref(mapsHref);

  return {
    sourceRef: url,
    name: title,
    community,
    address,
    phone,
    email,
    website,
    hours: hoursText,
    season: null,
    imageUrl: finalImage,
    lat,
    lng,
    description,
  };
}

export async function scrapeVisitorCentres(args: { replace?: boolean }) {
  if (args.replace) {
    await prisma.visitorCentre.deleteMany({
      where: { source: 'TOURISM_PEI_SCRAPE' },
    });
  }

  const html = await getText(LIST_URL);
  const $ = cheerio.load(html);

  const links = new Set<string>();

  // More comprehensive link collection
  // Look for all attraction links that might be visitor centres
  $('a[href*="/attractions/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const linkText = clean($(el).text())?.toLowerCase() || '';
      const hrefLower = href.toLowerCase();

      // Match links that contain visitor/information/centre keywords
      // or have relevant text content
      if (
        hrefLower.includes('visitor') ||
        hrefLower.includes('information') ||
        hrefLower.includes('centre') ||
        hrefLower.includes('center') ||
        hrefLower.includes('welcome') ||
        linkText.includes('visitor') ||
        linkText.includes('information') ||
        linkText.includes('centre') ||
        linkText.includes('center') ||
        linkText.includes('welcome')
      ) {
        try {
          const fullUrl = href.startsWith('http')
            ? href
            : new URL(href, BASE_URL).href;
          links.add(fullUrl);
        } catch {
          // skip unparseable hrefs
        }
      }
    }
  });

  // ALSO look for OperatorDetails links (Provincial VICs use this format)
  // These are on the visitor centres page, so include them all
  $('a[href*="/search/OperatorDetails/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const fullUrl = href.startsWith('http')
          ? href
          : new URL(href, BASE_URL).href;
        links.add(fullUrl);
        console.log(`Found OperatorDetails link: ${fullUrl}`);
      } catch {
        // skip unparseable hrefs
      }
    }
  });

  // Also try to find links from cards/listings directly
  $('.card a, .listing a, article a').each((_, el) => {
    const href = $(el).attr('href');
    if (
      href &&
      (href.includes('/attractions/') ||
        href.includes('/search/OperatorDetails/'))
    ) {
      const linkText = clean($(el).text())?.toLowerCase() || '';
      const card = $(el).closest('.card, .listing, article');
      const cardText = clean(card.text())?.toLowerCase() || '';

      if (
        linkText.includes('visitor') ||
        linkText.includes('information') ||
        linkText.includes('centre') ||
        linkText.includes('welcome') ||
        cardText.includes('visitor') ||
        cardText.includes('information') ||
        cardText.includes('centre') ||
        cardText.includes('welcome')
      ) {
        try {
          const fullUrl = href.startsWith('http')
            ? href
            : new URL(href, BASE_URL).href;
          links.add(fullUrl);
        } catch {
          // skip unparseable hrefs
        }
      }
    }
  });

  console.log(`Found ${links.size} visitor centre links`);
  if (links.size > 0) {
    console.log('Sample links:', Array.from(links).slice(0, 3));
  }

  let upserts = 0;
  const errors: { url: string; message: string }[] = [];

  for (const url of links) {
    try {
      console.log(`Scraping: ${url}`);
      const data = await scrapeCentreDetail(url);

      await prisma.visitorCentre.upsert({
        where: { id: makeId(url) },
        update: {
          name: data.name,
          address: data.address,
          community: data.community,
          phone: data.phone,
          email: data.email,
          website: data.website,
          hours: data.hours,
          season: data.season,
          imageUrl: data.imageUrl,
          lat: data.lat,
          lng: data.lng,
        },
        create: {
          id: makeId(url),
          name: data.name,
          address: data.address,
          community: data.community,
          phone: data.phone,
          email: data.email,
          website: data.website,
          hours: data.hours,
          season: data.season,
          imageUrl: data.imageUrl,
          lat: data.lat,
          lng: data.lng,
          source: 'TOURISM_PEI_SCRAPE',
          sourceRef: url,
        },
      });

      upserts++;
      console.log(`✓ Upserted: ${data.name}`);
    } catch (err) {
      console.error(`✗ Failed to scrape ${url}:`, err);
      errors.push({ url, message: String(err) });
    }
  }

  return {
    ok: true,
    source: LIST_URL,
    linksFound: links.size,
    upserts,
    errors: errors.slice(0, 20),
  };
}
