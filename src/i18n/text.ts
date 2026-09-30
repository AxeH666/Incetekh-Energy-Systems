import { cities } from '../data/cities';

// Placeholders preserve exact numbers, units and city names in every language.
export function phrase(value: string) {
  const values: Record<string, string> = {};
  let key = value.replace(/\s+/g, ' ').trim();
  for (const city of cities) {
    if (key.includes(city.name)) {
      values.city = city.name;
      key = key.replaceAll(city.name, '{city}');
    }
  }
  let index = 0;
  key = key.replace(/\d[\d,]*(?:\.\d+)?/g, (number) => {
    const id = String(index++);
    values[id] = number;
    return `{${id}}`;
  });
  return { key, values };
}

export function translate(value: string, catalogue: Record<string, string>) {
  const { key, values } = phrase(value);
  const template = catalogue[key];
  if (!template) return value;
  const translated = template.replace(
    /\{(city|\d+)\}/g,
    (_, id: string) => values[id] ?? `{${id}}`,
  );
  return value.match(/^\s*/)?.[0] + translated + value.match(/\s*$/)?.[0];
}

let runtimeCatalogue: Record<string, string> | undefined;
export function t(value: string) {
  if (typeof document === 'undefined' || document.documentElement.lang === 'en')
    return value;
  runtimeCatalogue ??= JSON.parse(
    document.querySelector('#language-messages')?.textContent || '{}',
  );
  return translate(value, runtimeCatalogue!);
}
