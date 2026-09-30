export const languages = [
  { code: 'en', name: 'English' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
] as const;

export type Language = (typeof languages)[number]['code'];
export const translatedLanguages = languages.filter(
  ({ code }) => code !== 'en',
);

export function localPath(path: string, language: string) {
  if (path === '/404.html' && language !== 'en') return `/${language}/404/`;
  return language === 'en' ? path : `/${language}${path}`;
}

export function sourcePath(path: string) {
  const original = path.replace(/^\/(te|hi|ta|ml|kn)(?=\/)/, '') || '/';
  // Astro renders its English error route at /404/ but emits /404.html.
  return /^\/404(?:\/|\.html)?$/.test(original) ? '/404.html' : original;
}

export function languageOf(path: string): Language {
  return (
    languages.find(({ code }) => path.startsWith(`/${code}/`))?.code ?? 'en'
  );
}
