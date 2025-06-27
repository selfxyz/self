export function getCountry() {
  return;
}

type Locale = {
  languageCode: string;
  scriptCode?: string;
  countryCode: string;
  languageTag: string;
  isRTL: boolean;
};

export function getLocales(): Locale[] {
  return navigator.languages.map(lang => {
    const locale = new Intl.Locale(lang);
    return {
      languageCode: locale.language,
      countryCode: locale.region ?? '',
      scriptCode: locale.script,
      languageTag: lang,
      // @ts-expect-error this not in type but appears to be in browsers
      isRTL: locale.textInfo?.direction === 'rtl',
    };
  });
}

export function getTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
