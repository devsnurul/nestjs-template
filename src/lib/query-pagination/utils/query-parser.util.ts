import qs from 'qs';

export function parseQueryString(queryString: string): Record<string, unknown> {
  if (!queryString || typeof queryString !== 'string') {
    return {};
  }
  return qs.parse(queryString, {
    allowDots: true,
  });
}
