# Built-in website languages

The header offers English, Telugu, Hindi, Tamil, Malayalam and Kannada. Each
language uses the same page components and stylesheet. English URLs are unchanged;
other languages use `/te/`, `/hi/`, `/ta/`, `/ml/` and `/kn/`. Switching language
keeps the current page and, with JavaScript enabled, its section fragment.
Internal navigation stays in the selected language. There is no saved preference,
automatic redirection, translation overlay or visitor-side translation service.

## Implementation

`src/i18n/routes.ts` registers static versions of every content page, including
all 13 city guides and the error page. Build-time middleware parses the generated
HTML with the development dependency `parse5` and applies checked-in catalogues.
It translates text, accessible labels, metadata and the draft in WhatsApp links.
Phone numbers, link recipients, IDs, form values, calculations, original assets
and structured data are preserved. Only clicking an explicit WhatsApp link opens
WhatsApp; this feature never sends a message.

The native HTML dropdown supports keyboard use, Escape and outside-click closing.
Language navigation also works without JavaScript. Longer scripts have suitable
line height, system font fallbacks and a wrapping header. No remote fonts or
new content-security-policy permissions are needed.

Dynamic calculator, gallery and form messages use a small local JSON payload
containing only the 21 messages used on the homepage. Full catalogues remain at
build time. The existing form remains unconnected and truthfully reports that
the request was not sent. It does not transmit or persist visitor details.

Localized pages have their own canonical URL, language attribute and reciprocal
language alternates. An indexing-enabled sitemap contains 138 public URLs
(23 pages in six languages). Error pages are noindex and excluded. Preview mode
remains noindex with an empty sitemap.

## Copy maintenance and review

The five additional languages were initially machine-translated using Google's
public translation interface during authoring, then corrected for detected
placeholder/value errors. That authoring process is not part of the website,
build or dependencies. **Native-speaker editorial review has not been completed.**
Review regional phrasing, particularly financial, subsidy and legal text, before
public launch. English remains the source copy; no new business claims are added.

Catalogues live in `src/i18n/catalogues/`. Each key is normalized English text.
`{city}` and numbered placeholders preserve city names and numerical values.
Missing entries, empty translations or mismatched placeholders fail the build.
When changing English copy, update all five catalogues, retain exact placeholders,
and run `npm run verify`. For a new dynamic message, also add its normalized key
to `src/i18n/runtime.ts`. Do not translate HTML IDs, CSS classes, input values,
phone numbers or URLs. Inspect the affected layouts with longer regional text.

## References

- [Astro middleware and build-time responses](https://docs.astro.build/en/guides/middleware/)
- [Astro route injection](https://docs.astro.build/en/reference/integrations-reference/#injectroute-option)
- [Google Translate website translation and widget eligibility](https://support.google.com/translate/answer/2534559?co=GENIE.Platform%3DDesktop&hl=en)

Validation evidence and limitations are recorded in [VALIDATION.md](VALIDATION.md).
This component is a local implementation; it does not deploy the site.
