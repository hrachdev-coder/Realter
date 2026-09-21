import { z } from "zod";
export function safeNext(value, fallback = "/dashboard") {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, "https://tun.invalid");
    if (
      url.origin !== "https://tun.invalid" ||
      !/^\/(dashboard|properties|realtors)(\/|$)/.test(url.pathname)
    )
      return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
const email = z.string().trim().email("Enter a valid email address.").max(254);
const password = z.string().min(12, "Use at least 12 characters.").max(128);
const newPassword = z
  .object({ password, confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match.",
  });
export const authSchemas = {
  login: z.object({
    email,
    password: z.string().min(1, "Enter your password.").max(128),
  }),
  register: newPassword.safeExtend({
    account_type: z.enum(["owner", "realtor"]).default("owner"),
    full_name: z.string().trim().min(2, "Enter your full name.").max(100),
    email,
  }),
  forgot: z.object({ email }),
  reset: newPassword,
};
export function authMessage(error) {
  const code = error?.code;
  if (code === "email_address_not_authorized")
    return "Email sending is not configured for this address. Please contact support.";
  if (code === "over_email_send_rate_limit")
    return "Email sending limit reached. Please try later or contact support.";
  if (code === "invalid_credentials")
    return "The email or password is incorrect.";
  if (code === "email_not_confirmed")
    return "Confirm your email before logging in. You can request a new confirmation below.";
  if (code === "user_already_exists")
    return "You may already have an account. Try logging in or resetting your password.";
  if (code === "weak_password")
    return "Choose a stronger password with at least 12 characters.";
  if (code === "same_password")
    return "Choose a password different from your current password.";
  if (code === "session_not_found" || code === "refresh_token_not_found")
    return "Your session has expired. Please log in again.";
  if (error?.status === 429 || code?.includes("rate_limit"))
    return "Too many attempts. Please wait a minute and try again.";
  if (error instanceof TypeError || error?.name === "AuthRetryableFetchError")
    return "We could not connect. Check your connection and try again.";
  return "We could not complete this request. Please try again shortly.";
}
export function confirmationUrl(origin, next) {
  return origin + "/auth/callback?next=" + encodeURIComponent(safeNext(next));
}
export async function runAuth(auth, mode, raw, origin, next) {
  const input = authSchemas[mode].parse(raw);
  let result;
  if (mode === "login") result = await auth.signInWithPassword(input);
  else if (mode === "register")
    result = await auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.full_name, account_type: input.account_type },
        emailRedirectTo: confirmationUrl(origin, next),
      },
    });
  else if (mode === "forgot")
    result = await auth.resetPasswordForEmail(input.email, {
      redirectTo: origin + "/auth/callback?next=/reset-password",
    });
  else {
    const verified = await auth.getUser();
    if (verified.error || !verified.data.user)
      throw Object.assign(new Error("Session expired"), {
        code: "session_not_found",
      });
    result = await auth.updateUser({ password: input.password });
  }
  if (result.error) throw result.error;
  return result.data || {};
}
export async function finishConfirmation(auth, params) {
  const token = params.get("token_hash"),
    type = params.get("type"),
    code = params.get("code");
  const recovery =
    type === "recovery" || params.get("next") === "/reset-password";
  if (params.get("error")) return { ok: false, recovery };
  let result;
  if (token && ["signup", "email", "recovery"].includes(type))
    result = await auth.verifyOtp({ token_hash: token, type });
  else if (code) result = await auth.exchangeCodeForSession(code);
  else return { ok: false, recovery };
  return {
    ok: !result.error,
    recovery,
    next: recovery ? "/reset-password" : safeNext(params.get("next")),
  };
}
