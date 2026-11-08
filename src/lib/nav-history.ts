/** تتبّع بسيط: هل يوجد تنقّل سابق داخل الجلسة؟ */

const CURR_KEY = "cafe_nav_curr_v1";
const HAS_KEY = "cafe_nav_has_v1";

/** يُستدعى عند تغيّر المسار */
export function recordNavPath(url: string) {
  if (typeof window === "undefined") return;
  try {
    const prev = sessionStorage.getItem(CURR_KEY);
    if (prev && prev !== url) {
      sessionStorage.setItem(HAS_KEY, "1");
    }
    sessionStorage.setItem(CURR_KEY, url);
  } catch {
    /* تجاهل */
  }
}

export function canNavigateBack(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(HAS_KEY) === "1";
  } catch {
    return false;
  }
}

/** صفحات الشريط السفلي / الجذر — بلا زر رجوع */
export function isPrimaryNavPath(pathname: string): boolean {
  if (pathname === "/waiter" || pathname === "/waiter/orders") return true;
  if (
    pathname === "/cashier" ||
    pathname === "/cashier/bills" ||
    pathname === "/cashier/history" ||
    pathname === "/cashier/shift"
  ) {
    return true;
  }
  if (
    pathname === "/owner" ||
    pathname === "/owner/menu" ||
    pathname === "/owner/staff" ||
    pathname.startsWith("/owner/reports")
  ) {
    return true;
  }
  return false;
}

/** احتياطي إن فُتحت الصفحة مباشرة بلا تاريخ */
export function fallbackBackHref(
  pathname: string,
  tableId: string | null,
): string {
  if (/^\/cashier\/bills\/[^/]+/.test(pathname)) return "/cashier/bills";
  if (pathname.startsWith("/cashier")) return "/cashier";
  if (pathname.startsWith("/waiter/new") && tableId) {
    return `/waiter/table/${tableId}`;
  }
  if (/^\/waiter\/table\/[^/]+$/.test(pathname)) return "/waiter";
  if (pathname.startsWith("/waiter")) return "/waiter";
  if (pathname.startsWith("/owner")) return "/owner";
  return "/";
}
