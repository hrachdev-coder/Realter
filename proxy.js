import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { configured } from "./lib/config";
import { safeNext } from "./lib/auth";
import { requestOrigin } from "./lib/request";
export async function proxy(request) {
  if (!configured) return NextResponse.next();
  let response = NextResponse.next({ request });
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = new URL("/login", requestOrigin(request));
    url.searchParams.set(
      "next",
      safeNext(request.nextUrl.pathname + request.nextUrl.search),
    );
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|placeholder.svg).*)"],
};
