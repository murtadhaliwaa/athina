import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

const SESSION_TIMEOUT_MS = 900;
const REFRESH_TIMEOUT_MS = 1800;
/** حدّث التوكن إذا بقي أقل من دقيقتين */
const REFRESH_IF_EXPIRES_WITHIN_MS = 120_000;

export type SessionResult = {
  supabaseResponse: NextResponse;
  user: User | null;
  role: string | null;
  /** true عند بطء/انقطاع الشبكة — لا نفرض تسجيل خروج */
  authDegraded: boolean;
};

async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("انتهت مهلة التحقق من الجلسة")),
          ms
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function roleOf(user: User | null) {
  return (
    (user?.app_metadata?.role as string | undefined) ??
    (user?.user_metadata?.role as string | undefined) ??
    null
  );
}

export async function updateSession(
  request: NextRequest
): Promise<SessionResult> {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    // getClaims يتحقق من JWT محلياً بدون تحذير getSession، وأخف من getUser في أغلب الطلبات
    const { data: claimsData } = await withTimeout(
      supabase.auth.getClaims(),
      SESSION_TIMEOUT_MS
    );
    const claims = claimsData?.claims;
    let user: User | null = null;

    if (claims?.sub) {
      const appMeta =
        (claims as { app_metadata?: Record<string, unknown> }).app_metadata ??
        {};
      const userMeta =
        (claims as { user_metadata?: Record<string, unknown> }).user_metadata ??
        {};
      user = {
        id: claims.sub,
        app_metadata: appMeta,
        user_metadata: userMeta,
        aud: typeof claims.aud === "string" ? claims.aud : "authenticated",
        created_at: "",
        email: typeof claims.email === "string" ? claims.email : undefined,
        role: typeof claims.role === "string" ? claims.role : undefined,
      } as User;

      const expMs =
        typeof claims.exp === "number" ? claims.exp * 1000 : null;
      if (expMs && expMs - Date.now() < REFRESH_IF_EXPIRES_WITHIN_MS) {
        try {
          const { data } = await withTimeout(
            supabase.auth.getUser(),
            REFRESH_TIMEOUT_MS
          );
          if (data.user) user = data.user;
        } catch {
          // أبقِ مطالبات التوكن إن فشل التحديث المؤقت
        }
      }
    }

    return {
      supabaseResponse,
      user,
      role: roleOf(user),
      authDegraded: false,
    };
  } catch {
    return {
      supabaseResponse,
      user: null,
      role: null,
      authDegraded: true,
    };
  }
}
