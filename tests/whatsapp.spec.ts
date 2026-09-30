import { test, expect } from '@playwright/test';
import { cities, cityPath } from '../src/data/cities';

test('every WhatsApp action has a draft, with page and city context even without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  const routes: [string, string][] = [
    ['/', 'rooftop solar'],
    ['/about/', 'installation process'],
    ['/services/', 'system care services'],
    ['/products/', 'available models'],
    ['/projects/', 'project gallery'],
    ['/contact/', 'site-visit availability'],
    ['/solar-guide/', 'subsidy eligibility'],
    ['/financing/', 'financing options'],
    ['/privacy/', 'privacy policy'],
    ['/terms/', 'warranty conditions'],
    ['/reviews/', 'rooftop solar'], // Existing redirect to the homepage reviews section.
    ['/404.html', 'get started'],
    ...cities.map((city): [string, string] => [cityPath(city.slug), city.name]),
  ];
  for (const [route, topic] of routes) {
    await page.goto(route);
    await expect(page.locator('.footer-region h2')).toHaveText(
      'Serving Andhra Pradesh. Based in Proddatur.',
    );
    const links = await page
      .locator('a[href^="https://wa.me/"]')
      .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
    expect(links.length, route).toBeGreaterThanOrEqual(2);
    for (const href of links) {
      const url = new URL(href);
      expect(url.origin + url.pathname).toBe('https://wa.me/919441259786');
      expect([...url.searchParams.keys()]).toEqual(['text']);
      expect(url.searchParams.get('text'), route).toMatch(/^Hi Incetekh/);
      expect(url.searchParams.get('text')!.length).toBeGreaterThan(40);
    }
    for (const shell of ['.site-header', '.footer-contact']) {
      const href = (await page
        .locator(`${shell} .whatsapp-link`)
        .getAttribute('href'))!;
      expect(
        new URL(href).searchParams.get('text'),
        `${route} ${shell}`,
      ).toContain(topic);
    }
  }
  await context.close();
});

test('specific enquiry drafts keep the clicked action context', async ({
  page,
}) => {
  for (const [route, selector, topic] of [
    ['/', '.site-visit .whatsapp-link', 'arrange a free site visit'],
    ['/services/', '.site-cta .whatsapp-link', 'roof or existing solar system'],
    ['/contact/', '#complaints .whatsapp-link', 'service issue'],
    [
      '/solar-guide/',
      '#maintenance .whatsapp-link',
      'system performance check',
    ],
    ['/financing/', 'main .whatsapp-link', 'finance options'],
  ]) {
    await page.goto(route);
    const href = (await page.locator(selector).getAttribute('href'))!;
    expect(new URL(href).searchParams.get('text')).toContain(topic);
  }
});
