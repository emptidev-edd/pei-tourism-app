import { resolveEventImageUrl } from '../event-image';

describe('resolveEventImageUrl', () => {
  it('passes absolute http and https URLs through untouched', () => {
    expect(resolveEventImageUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
    expect(resolveEventImageUrl('http://cdn.example.com/a.png')).toBe(
      'http://cdn.example.com/a.png',
    );
  });

  it('resolves a relative path against the API origin without the /api segment', () => {
    const resolved = resolveEventImageUrl('/sample-club.jpg');
    expect(resolved).toBe('http://127.0.0.1:4000/sample-club.jpg');
    expect(resolved).not.toContain('/api');
  });

  it('resolves a path that is missing its leading slash', () => {
    expect(resolveEventImageUrl('sample-club.jpg')).toBe(
      'http://127.0.0.1:4000/sample-club.jpg',
    );
  });

  it('returns null for empty input', () => {
    expect(resolveEventImageUrl(null)).toBeNull();
    expect(resolveEventImageUrl(undefined)).toBeNull();
    expect(resolveEventImageUrl('')).toBeNull();
    expect(resolveEventImageUrl('   ')).toBeNull();
  });
});
