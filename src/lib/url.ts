// Prefix a root-relative path with the configured base so the site works both
// at / (local dev, custom domain) and under a subpath (GitHub Pages project site).
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const withBase = (path: string) => `${base}${path}`;

// Strip the base from a pathname for nav "current page" comparisons.
export const stripBase = (pathname: string) =>
  base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
