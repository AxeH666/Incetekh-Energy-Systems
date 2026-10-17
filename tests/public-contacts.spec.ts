import { test, expect } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { parse, type DefaultTreeAdapterMap } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];

test('all generated languages publish only the approved contacts and valid internal links', async () => {
  const files = (await readdir('dist', { recursive: true })).filter((file) =>
    file.endsWith('.html'),
  );
  const documents = new Map<
    string,
    { lang: string; links: string[]; ids: Set<string> }
  >();
  for (const file of files) {
    const html = await readFile(join('dist', file), 'utf8');
    // Includes visible copy, metadata, structured data and inline scripts.
    expect(html.replace(/\s/g, ''), file).not.toMatch(
      /support@incetekh\.com|9440168111|info@incetekhenergy\.com/,
    );
    const result = { lang: '', links: [] as string[], ids: new Set<string>() };
    function visit(node: Node) {
      if ('tagName' in node) {
        const attr = (name: string) =>
          node.attrs.find((attribute) => attribute.name === name)?.value;
        if (node.tagName === 'html') result.lang = attr('lang') ?? '';
        if (node.tagName === 'a' && attr('href'))
          result.links.push(attr('href')!);
        if (attr('id')) result.ids.add(attr('id')!);
      }
      if ('childNodes' in node) node.childNodes.forEach(visit);
    }
    visit(parse(html));
    documents.set(file.replaceAll('\\', '/'), result);
  }
  const languageCounts: Record<string, number> = {};
  for (const [file, document] of documents) {
    const phones = document.links.filter((href) => href.startsWith('tel:'));
    const emails = document.links.filter((href) => href.startsWith('mailto:'));
    const whatsapp = document.links.filter((href) => href.includes('wa.me'));
    if (file !== 'reviews/index.html') {
      languageCounts[document.lang] = (languageCounts[document.lang] ?? 0) + 1;
      expect(phones.length, file).toBeGreaterThan(0);
      expect(emails.length, file).toBeGreaterThan(0);
      expect(whatsapp.length, file).toBeGreaterThan(0);
    }
    for (const phone of phones) expect(phone, file).toBe('tel:+919441259786');
    for (const email of emails) {
      const url = new URL(email);
      expect(url.pathname, file).toBe('incetekhenergy@gmail.com');
      expect([...url.searchParams.keys()], file).toEqual(
        url.search ? ['subject'] : [],
      );
    }
    for (const href of whatsapp) {
      const url = new URL(href);
      expect(url.origin + url.pathname, file).toBe(
        'https://wa.me/919441259786',
      );
      expect(url.searchParams.get('text')?.trim(), file).toBeTruthy();
    }
    const path = '/' + file.replace(/index\.html$/, '');
    for (const href of document.links.filter(
      (link) => link.startsWith('/') || link.startsWith('#'),
    )) {
      const url = new URL(href, `https://incetekhenergy.com${path}`);
      const targetFile = decodeURIComponent(url.pathname).slice(1);
      const target = documents.get(
        targetFile.endsWith('.html')
          ? targetFile
          : posix.join(targetFile, 'index.html'),
      );
      expect(target, `${file}: ${href}`).toBeDefined();
      if (url.hash)
        expect(
          target!.ids.has(decodeURIComponent(url.hash.slice(1))),
          `${file}: ${href}`,
        ).toBe(true);
    }
  }
  // 23 content routes plus the error page in each language; English-only preview.
  expect(languageCounts).toEqual({
    en: 25,
    te: 24,
    hi: 24,
    ta: 24,
    ml: 24,
    kn: 24,
  });
  expect(documents.size).toBe(146); // Also includes the legacy Reviews redirect.
});
