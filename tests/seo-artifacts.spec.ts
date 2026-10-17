import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse, type DefaultTreeAdapterMap } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
const origin = 'https://incetekhenergy.com';
const launch =
  (process.env.SEO_EXPECT_INDEXABLE ?? process.env.PUBLIC_SITE_INDEXABLE) ===
  'true';
const codes = ['en', 'te', 'hi', 'ta', 'ml', 'kn'];

test('every eligible artifact has reciprocal language alternates and valid search metadata', async () => {
  const files = (await readdir('dist', { recursive: true })).filter((file) =>
    file.endsWith('.html'),
  );
  const eligible = new Set<string>();
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  let excluded = 0;
  for (const file of files) {
    const normalized = file.replaceAll('\\', '/');
    const path = '/' + normalized.replace(/index\.html$/, '');
    const html = await readFile(join('dist', file), 'utf8');
    const elements: Element[] = [];
    function visit(node: Node) {
      if ('tagName' in node) elements.push(node);
      if ('childNodes' in node) node.childNodes.forEach(visit);
    }
    visit(parse(html));
    const attr = (el: Element, name: string) =>
      el.attrs.find((a) => a.name === name)?.value;
    const meta = (key: string) =>
      elements
        .filter(
          (el) =>
            el.tagName === 'meta' &&
            (attr(el, 'name') === key || attr(el, 'property') === key),
        )
        .map((el) => attr(el, 'content'));
    const links = (rel: string) =>
      elements.filter((el) => el.tagName === 'link' && attr(el, 'rel') === rel);
    if (
      /^(404\.html|(?:te|hi|ta|ml|kn)\/404\/index\.html|reviews\/index\.html|solar-preview\/index\.html)$/.test(
        normalized,
      )
    ) {
      excluded++;
      expect(meta('robots').join(','), file).toContain('noindex');
      // Astro's legacy meta redirect may include its destination canonical.
      if (normalized !== 'reviews/index.html') {
        expect(links('canonical'), file).toHaveLength(0);
        expect(links('alternate'), file).toHaveLength(0);
      }
      continue;
    }
    eligible.add(origin + path);
    expect(meta('robots'), file).toEqual([
      launch ? 'index, follow' : 'noindex, follow',
    ]);
    expect(
      links('canonical').map((el) => attr(el, 'href')),
      file,
    ).toEqual([origin + path]);
    const lang = attr(
      elements.find((el) => el.tagName === 'html')!,
      'lang',
    );
    expect(codes, file).toContain(lang);
    const original = path.replace(/^\/(te|hi|ta|ml|kn)(?=\/)/, '');
    const alternates = Object.fromEntries(
      links('alternate').map((el) => [attr(el, 'hreflang'), attr(el, 'href')]),
    );
    expect(links('alternate'), file).toHaveLength(7);
    expect(alternates, file).toEqual(
      Object.fromEntries(
        [...codes, 'x-default'].map((code) => [
          code,
          origin +
            (code === 'en' || code === 'x-default' ? '' : '/' + code) +
            original,
        ]),
      ),
    );
    const titleNodes = elements.filter((el) => el.tagName === 'title');
    expect(titleNodes, file).toHaveLength(1);
    const title = titleNodes[0].childNodes
      .map((node) => ('value' in node ? node.value : ''))
      .join('');
    const description = meta('description');
    expect(description, file).toHaveLength(1);
    expect(description[0]!.trim().length, file).toBeGreaterThan(20);
    expect(title.trim().length, file).toBeGreaterThan(10);
    expect(titles.has(title), file).toBe(false);
    expect(descriptions.has(description[0]!), file).toBe(false);
    titles.add(title);
    descriptions.add(description[0]!);
    expect(meta('og:title'), file).toEqual([title]);
    expect(meta('og:description'), file).toEqual(description);
    expect(meta('og:url'), file).toEqual([origin + path]);
    expect(meta('og:type'), file).toEqual(['website']);
    expect(meta('twitter:card'), file).toEqual(['summary']);
    expect(meta('og:image'), file).toHaveLength(1);
    const socialImage = new URL(meta('og:image')[0]!);
    expect(socialImage.origin, file).toBe(origin);
    expect(
      (await readFile(join('dist', decodeURIComponent(socialImage.pathname))))
        .length,
    ).toBeGreaterThan(0);
    expect(html, file).not.toMatch(
      /support@incetekh\.com|info@incetekhenergy\.com/,
    );
  }
  expect(eligible.size).toBe(138);
  expect(excluded).toBe(8);
  const xml = await readFile('dist/sitemap.xml', 'utf8');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  expect(urls.length).toBe(launch ? 138 : 0);
  expect(new Set(urls)).toEqual(launch ? eligible : new Set());
});
