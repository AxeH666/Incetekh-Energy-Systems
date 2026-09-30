import {
  parse,
  serialize,
  html as htmlTypes,
  type DefaultTreeAdapterMap,
} from 'parse5';
import { languages, languageOf, localPath, sourcePath } from './languages';
import { phrase, translate } from './text';
import { runtimeKeys } from './runtime';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
const catalogues = import.meta.glob<Record<string, string>>(
  './catalogues/*.json',
  { eager: true, import: 'default' },
);

// Fail the build if translating a sentence drops or duplicates a factual value.
const placeholders = (value: string) =>
  [...value.matchAll(/\{(city|\d+)\}/g)]
    .map((match) => match[0])
    .sort()
    .join('|');
for (const [file, catalogue] of Object.entries(catalogues)) {
  for (const [source, value] of Object.entries(catalogue)) {
    if (!value.trim() || placeholders(source) !== placeholders(value))
      throw new Error(`Invalid translation in ${file}: ${source}`);
  }
}

export function localizeHTML(html: string, path: string, site: URL) {
  const language = languageOf(path);
  const original = sourcePath(path);
  const catalogue = catalogues[`./catalogues/${language}.json`] ?? {};
  const missing = new Set<string>();
  function text(value: string) {
    if (language === 'en' || !/[a-zA-Z]/.test(value)) return value;
    const { key } = phrase(value);
    if (!(key in catalogue)) missing.add(key);
    return translate(value, catalogue);
  }
  const tree = parse(html);
  let head: Element | undefined;
  let body: Element | undefined;
  const attr = (el: Element, name: string) =>
    el.attrs.find((a) => a.name === name)?.value;
  function set(el: Element, name: string, value: string) {
    const entry = el.attrs.find((a) => a.name === name);
    if (entry) entry.value = value;
    else el.attrs.push({ name, value });
  }
  function visit(node: Node, skip = false) {
    if (node.nodeName === '#text') {
      if (!skip)
        (node as DefaultTreeAdapterMap['textNode']).value = text(
          (node as DefaultTreeAdapterMap['textNode']).value,
        );
      return;
    }
    if (!('tagName' in node)) {
      if ('childNodes' in node)
        node.childNodes.forEach((child) => visit(child, skip));
      return;
    }
    const el = node;
    if (el.tagName === 'head') head = el;
    if (el.tagName === 'body') body = el;
    if (el.tagName === 'html') set(el, 'lang', language);
    skip ||=
      ['script', 'style', 'svg'].includes(el.tagName) ||
      attr(el, 'translate') === 'no';

    // Menu labels are native language names and must never be translated.
    if (attr(el, 'data-language-label') !== undefined) {
      set(el, 'lang', language);
      for (const child of el.childNodes)
        if (child.nodeName === '#text')
          (child as DefaultTreeAdapterMap['textNode']).value = languages.find(
            (item) => item.code === language,
          )!.name;
    }
    const option = attr(el, 'data-language-option');
    if (option) {
      el.attrs = el.attrs.filter((a) => a.name !== 'aria-current');
      if (option === language) set(el, 'aria-current', 'true');
    }
    if (
      el.tagName === 'summary' &&
      attr(el, 'aria-label')?.startsWith('Language:')
    ) {
      set(
        el,
        'aria-label',
        `Language: ${languages.find((item) => item.code === language)!.name}`,
      );
    }
    if (!skip) {
      for (const a of el.attrs) {
        if (
          [
            'alt',
            'aria-label',
            'aria-valuetext',
            'placeholder',
            'title',
          ].includes(a.name) &&
          a.value
        )
          a.value = text(a.value);
      }
      if (
        el.tagName === 'meta' &&
        (attr(el, 'name') === 'description' ||
          ['og:title', 'og:description', 'og:image:alt'].includes(
            attr(el, 'property') ?? '',
          ))
      ) {
        set(el, 'content', text(attr(el, 'content') ?? ''));
      }
      if (el.tagName === 'a') {
        const href = attr(el, 'href') ?? '';
        if (
          href.startsWith('/') &&
          !href.startsWith('//') &&
          !href.startsWith('/_astro/') &&
          !href.startsWith('/brand/')
        )
          set(el, 'href', localPath(sourcePath(href), language));
        if (href.startsWith('https://wa.me/')) {
          const url = new URL(href);
          const draft = url.searchParams.get('text');
          if (draft && language !== 'en') {
            // Keep the established URL encoding for English links and preserve the recipient.
            set(
              el,
              'href',
              `${url.origin}${url.pathname}?text=${encodeURIComponent(text(draft))}`,
            );
          }
        }
      }
    }
    el.childNodes.forEach((child) => visit(child, skip));
  }
  visit(tree);
  if (missing.size)
    throw new Error(
      `Missing ${language} translations: ${[...missing].join(' | ')}`,
    );
  if (!head || !body) return html;
  const noindex = original === '/404.html';
  if (!noindex) {
    for (const code of [...languages.map((item) => item.code), 'x-default']) {
      const href = new URL(
        localPath(original, code === 'x-default' ? 'en' : code),
        site,
      ).href;
      head.childNodes.push({
        nodeName: 'link',
        tagName: 'link',
        attrs: [
          { name: 'rel', value: 'alternate' },
          { name: 'hreflang', value: code },
          { name: 'href', value: href },
        ],
        namespaceURI: htmlTypes.NS.HTML,
        childNodes: [],
        parentNode: head,
      });
    }
  }
  if (language !== 'en' && original === '/') {
    const messages = Object.fromEntries(
      runtimeKeys.map((key) => {
        if (!catalogue[key])
          throw new Error(`Missing ${language} runtime translation: ${key}`);
        return [key, catalogue[key]];
      }),
    );
    const script: Element = {
      nodeName: 'script',
      tagName: 'script',
      attrs: [
        { name: 'id', value: 'language-messages' },
        { name: 'type', value: 'application/json' },
      ],
      namespaceURI: htmlTypes.NS.HTML,
      childNodes: [],
      parentNode: body,
    };
    script.childNodes.push({
      nodeName: '#text',
      value: JSON.stringify(messages).replace(/</g, '\\u003c'),
      parentNode: script,
    });
    body.childNodes.push(script);
  }
  return serialize(tree);
}
