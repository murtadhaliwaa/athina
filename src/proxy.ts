import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function homeForRole(role: string | null) {
  switch (role) {
    case "OWNER":
      return "/owner";
    case "CASHIER":
      return "/cashier";
    case "WAITER":
      return "/waiter";
    default:
      return "/login";
  }
}

function canAccess(pathname: string, role: string | null) {
  if (pathname.startsWith("/owner")) return role === "OWNER";
  if (pathname.startsWith("/cashier"))
    return role === "CASHIER" || role === "OWNER";
  if (pathname.startsWith("/waiter"))
    return role === "WAITER" || role === "OWNER";
  return true;
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, role, authDegraded } =
    await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith("/login");
  const isPublic = isAuthPage;
  // إعادة توجيه HTML تكسر Server Actions → "An unexpected response was received from the server"
  const isServerAction = request.headers.has("next-action");

  // شبكة بطيئة: مرّر الطلب للصفحة (layouts تفحص الجلسة) بدل انتظار طويل أو طرد المستخدم
  if (authDegraded || isServerAction) {
    return supabaseResponse;
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole(role);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole(role);
    return NextResponse.redirect(url);
  }

  if (user && !canAccess(pathname, role)) {
    const url = request.nextUrl.clone();
    url.pathname = homeForRole(role);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sounds/|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav)$).*)",
  ],
};
