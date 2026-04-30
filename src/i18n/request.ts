import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { routing } from "./routing";

const allNamespaces = [
  "about", "analytics", "auth", "common", "email", "encounter", "errors",
  "feedback", "imageViewer", "lock", "map", "nav", "partners", "pin",
  "playback", "privacyPolicy", "settings", "termsOfService", "timeline",
];

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

  const messages: Record<string, any> = {};
  for (const ns of allNamespaces) {
    try {
      messages[ns] = (await import(`../../messages/${locale}/${ns}.json`)).default;
    } catch {
      try {
        messages[ns] = (await import(`../../messages/${routing.defaultLocale}/${ns}.json`)).default;
      } catch {
        // skip missing namespace
      }
    }
  }

  return { locale, messages };
});
