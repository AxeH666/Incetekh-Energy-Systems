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
// Cloudflare Automatic Setup injects analytics at the edge; do not embed a beacon.
export const googleVerification =
  import.meta.env.PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ?? '';
if (googleVerification && !/^[a-zA-Z0-9_-]+$/.test(googleVerification)) {
  throw new Error('Use only the Search Console verification value, not HTML.');
}
