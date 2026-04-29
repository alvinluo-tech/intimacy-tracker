import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { routing } from "./routing";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  let locale = cookieStore.get("NEXT_LOCALE")?.value;

  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    const acceptLanguage = (await headers()).get("Accept-Language");
    if (acceptLanguage) {
      const preferred = acceptLanguage.split(",")[0]?.split("-")[0]?.trim().toLowerCase();
      if (preferred && routing.locales.includes(preferred as typeof routing.locales[number])) {
        locale = preferred;
      }
    }
  }

  if (!locale) locale = routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
