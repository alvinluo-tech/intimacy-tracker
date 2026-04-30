import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { routing } from "./routing";

const defaultNamespaces = ["common", "errors"];

const routeNamespaceMap: Record<string, string[]> = {
  "/dashboard": ["nav", "analytics", "encounter", "imageViewer"],
  "/timeline": ["nav", "timeline", "encounter", "imageViewer"],
  "/map": ["nav", "map"],
  "/settings": ["nav", "settings", "pin", "partners", "feedback", "imageViewer"],
  "/settings/about": ["nav", "about"],
  "/settings/privacy-policy": ["nav", "privacyPolicy"],
  "/settings/terms-of-service": ["nav", "termsOfService"],
  "/settings/privacy": ["nav", "settings"],
  "/partners": ["nav", "partners", "encounter", "imageViewer"],
  "/playback": ["nav", "playback", "encounter"],
  "/lock": ["lock", "pin"],
  "/location-picker": ["map"],
  "/login": ["auth"],
  "/register": ["auth"],
  "/forgot-password": ["auth"],
  "/reset-password": ["auth"],
  "/verify-email": ["auth"],
};

function matchNamespaces(pathname: string): string[] {
  const exact = routeNamespaceMap[pathname];
  if (exact) return exact;

  const matched = Object.entries(routeNamespaceMap).find(([route]) =>
    pathname.startsWith(route + "/")
  );
  if (matched) return matched[1];

  if (pathname.startsWith("/records/")) return ["nav", "encounter", "imageViewer"];

  return [];
}

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

  const pathname = (await headers()).get("x-pathname") ?? "";
  const matched = matchNamespaces(pathname);
  const allNamespaces = [...new Set([...defaultNamespaces, ...matched])];

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
