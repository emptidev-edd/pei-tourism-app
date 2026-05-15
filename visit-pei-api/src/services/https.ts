export const getJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'visit-pei-hub/1.0',
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json() as Promise<T>;
};
