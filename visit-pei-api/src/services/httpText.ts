export async function getText(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'en-CA,en;q=0.9',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${url} (${res.status}) ${text.slice(0, 200)}`,
    );
  }
  return text;
}
