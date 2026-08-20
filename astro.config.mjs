import { defineConfig } from 'astro/config';

// Fully static output. Deployed to Cloudflare Workers as static assets
// (see wrangler.jsonc); every push to main builds and deploys automatically.
// `site` feeds canonical URLs and the hosted .ics calendar link.
export default defineConfig({
  output: 'static',
  site: 'https://www.uncsep.com',
  compressHTML: true,
});
