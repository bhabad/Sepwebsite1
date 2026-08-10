import { defineConfig } from 'astro/config';

// Fully static output. Deployed to GitHub Pages at bhabad.github.io/Sepwebsite1
// (BASE_PATH is set by the deploy workflow; local dev serves at / as before).
// When the site moves to its own domain (uncsep.com), drop base and set site.
export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://www.uncsep.com',
  base: process.env.BASE_PATH || '/',
  compressHTML: true,
});
