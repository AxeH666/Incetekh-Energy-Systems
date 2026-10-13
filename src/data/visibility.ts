// These are public build-time values, never account credentials.
const indexing = import.meta.env.PUBLIC_SITE_INDEXABLE?.trim() ?? 'false';
if (!['true', 'false'].includes(indexing)) {
  throw new Error('PUBLIC_SITE_INDEXABLE must be true or false.');
}
// Workers Builds injects these at build time. Do not override them in the dashboard.
// Fail closed when Cloudflare context is incomplete; a shared launch flag must
// never make a feature-branch build indexable. Local production builds may opt in
// for release validation, but astro dev always stays non-indexable.
const workersCI = import.meta.env.WORKERS_CI?.trim() ?? '';
const branch = import.meta.env.WORKERS_CI_BRANCH?.trim() ?? '';
const productionBuild =
  (!workersCI && !branch) || (workersCI === '1' && branch === 'main');
export const indexable =
  import.meta.env.PROD && indexing === 'true' && productionBuild;
const token = import.meta.env.PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN?.trim() ?? '';
if (token && !/^[a-f0-9]{32}$/i.test(token)) {
  throw new Error(
    'Use the 32-character public Cloudflare Web Analytics token.',
  );
}
// Preview traffic must never enter the production analytics property.
export const analyticsToken = indexable ? token : '';
export const googleVerification =
  import.meta.env.PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ?? '';
if (googleVerification && !/^[a-zA-Z0-9_-]+$/.test(googleVerification)) {
  throw new Error('Use only the Search Console verification value, not HTML.');
}
