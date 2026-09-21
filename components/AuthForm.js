"use client";
import { useLocale } from "@/components/LocaleProvider";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import { useAuth } from "./AuthProvider";
import {
  authSchemas,
  authMessage,
  confirmationUrl,
  runAuth,
  safeNext,
} from "@/lib/auth";
const copy = {
  login: [
    "Welcome back.",
    "Log in to manage your properties, clients, and next opportunities.",
    "Log in",
  ],
  register: [
    "Make yourself at home.",
    "Create your realtor account and start your next chapter.",
    "Create account",
  ],
  forgot: [
    "Forgot your password?",
    "Enter your email and we’ll send you a recovery link.",
    "Send recovery link",
  ],
  reset: [
    "Choose a new password.",
    "Use a unique password with at least 12 characters.",
    "Save new password",
  ],
};
export default function AuthForm({
  mode = "login",
  next = "/dashboard",
  initialError = "",
  loggedOut = false,
}) {
  const { t: tr, locale } = useLocale();

  const { configured } = useAuth();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(initialError),
    [error, setError] = useState(Boolean(initialError)),
    [fields, setFields] = useState({}),
    [show, setShow] = useState(false),
    [sent, setSent] = useState(false),
    [email, setEmail] = useState(""),
    [canResend, setCanResend] = useState(false),
    [cooldown, setCooldown] = useState(0);
  const formRef = useRef(null);
  const target = safeNext(next),
    [title, description, button] = copy[mode];
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function submit(e) {
    e.preventDefault();
    if (busy || !configured) return;
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const checked = authSchemas[mode].safeParse(raw);
    setFields({});
    setMessage("");
    setError(false);
    if (!checked.success) {
      const errors = Object.fromEntries(
        checked.error.issues.map((i) => [i.path[0], i.message]),
      );
      setFields(errors);
      formRef.current?.elements
        .namedItem(checked.error.issues[0].path[0])
        ?.focus();
      return;
    }
    setBusy(true);
    setEmail(raw.email?.trim() || "");
    try {
      const data = await runAuth(
        supabase().auth,
        mode,
        raw,
        location.origin,
        target,
      );
      if (mode === "login" || (mode === "register" && data.session)) {
        location.assign(target);
        return;
      }
      if (mode === "reset") {
        location.assign("/dashboard?password_updated=1");
        return;
      }
      setSent(true);
      setCanResend(mode === "register");
      setCooldown(60);
      setMessage(
        mode === "forgot"
          ? "If an account exists for this email, a recovery link will arrive shortly."
          : "If you already have an account, log in. A new confirmation email is only needed for an unconfirmed account. For a new eligible registration, check your inbox.",
      );
      formRef.current?.reset();
    } catch (e) {
      setError(true);
      setMessage(authMessage(e));
      setCanResend(e.code === "email_not_confirmed");
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (busy || cooldown || !configured) return;
    setBusy(true);
    setError(false);
    try {
      const address =
        email || formRef.current?.elements.namedItem("email")?.value || "";
      const parsed = authSchemas.forgot.parse({ email: address });
      const { error } = await supabase().auth.resend({
        type: "signup",
        email: parsed.email,
        options: { emailRedirectTo: confirmationUrl(location.origin, target) },
      });
      if (error) throw error;
      setMessage("If confirmation is pending, a new link will arrive shortly.");
      setCooldown(60);
    } catch (e) {
      setError(true);
      setMessage(e.issues?.[0]?.message || authMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const passwordField = (name, label) => (
    <label key={name} htmlFor={name}>
      {tr(label)}
      <div className="password-control">
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          required
          maxLength={128}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          aria-invalid={!!fields[name]}
          aria-describedby={fields[name] ? name + "-error" : undefined}
        />
        {name === "password" && (
          <button
            type="button"
            aria-label={tr(show ? "Hide password" : "Show password")}
            aria-pressed={show}
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {fields[name] && (
        <small id={name + "-error"} className="field-error">
          {tr(fields[name])}
        </small>
      )}
    </label>
  );
  return (
    <main className="auth-page">
      <div className="auth-story">
        <div className="eyebrow light">
          {tr("YOUR BUSINESS, A LITTLE MORE CONNECTED")}
        </div>
        <h2>
          {tr("Good homes.")}
          <br />
          {tr("Great connections.")}
        </h2>
        <p>
          {tr(
            "Your listings, your clients, and every next step — together in one thoughtful workspace.",
          )}
        </p>
        <div className="auth-benefit">
          <ShieldCheck size={22} />
          <span>
            {tr("A private workspace for your real estate business.")}
          </span>
        </div>
      </div>
      <section className="auth">
        <div className="eyebrow">{tr("WELCOME TO TUN")}</div>
        <h1>
          {tr(
            sent
              ? mode === "register"
                ? "Registration next steps"
                : "Check your inbox."
              : title,
          )}
        </h1>
        <p>
          {tr(
            sent
              ? "Check your spam folder too. Links expire, so use the most recent email."
              : description,
          )}
        </p>
        {!configured && (
          <div className="notice" role="status">
            <strong>{tr("Accounts are not connected yet.")}</strong>
            <br />
            {tr(
              "Login, registration, and email recovery are unavailable in this preview. You can explore the demo workspace below.",
            )}
          </div>
        )}
        {loggedOut && (
          <div className="notice success" role="status">
            {tr("You’ve been logged out.")}
          </div>
        )}
        {message && (
          <div
            className={"notice " + (error ? "error" : "success")}
            role={error ? "alert" : "status"}
          >
            {sent && !error && <MailCheck size={22} />} {tr(message)}
          </div>
        )}
        {!sent && (
          <form
            ref={formRef}
            className="form-stack"
            onSubmit={submit}
            noValidate
          >
            <fieldset disabled={busy || !configured} className="auth-fields">
              {mode === "register" && (
                <label htmlFor="account_type">
                  {tr("I’m joining as")}
                  <select
                    id="account_type"
                    name="account_type"
                    defaultValue="owner"
                  >
                    <option value="owner">
                      {tr("Homeowner — list my property")}
                    </option>
                    <option value="realtor">
                      {tr("Realtor — manage listings and clients")}
                    </option>
                  </select>
                </label>
              )}
              {mode === "register" && (
                <label htmlFor="full_name">
                  {tr("Full name")}
                  <input
                    id="full_name"
                    name="full_name"
                    required
                    maxLength={100}
                    autoComplete="name"
                    aria-invalid={!!fields.full_name}
                  />
                  {fields.full_name && (
                    <small className="field-error">
                      {tr(fields.full_name)}
                    </small>
                  )}
                </label>
              )}
              {mode !== "reset" && (
                <label htmlFor="email">
                  {tr("Email")}
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={!!fields.email}
                  />
                  {fields.email && (
                    <small className="field-error">{tr(fields.email)}</small>
                  )}
                </label>
              )}
              {tr(
                mode !== "forgot" &&
                  passwordField(
                    "password",
                    mode === "reset" ? "New password" : "Password",
                  ),
              )}
              {["register", "reset"].includes(mode) && (
                <>
                  {tr(passwordField("confirm_password", "Confirm password"))}
                  <small className="muted">
                    {tr(
                      "Use at least 12 characters. Your passwords must match.",
                    )}
                  </small>
                </>
              )}
              {mode === "login" && (
                <Link className="forgot-link" href="/forgot-password">
                  {tr("Forgot password?")}
                </Link>
              )}
              <button className="button" disabled={busy || !configured}>
                {tr(busy ? "Please wait…" : button)}
              </button>
            </fieldset>
          </form>
        )}
        {canResend && (
          <button
            type="button"
            className="button secondary"
            style={{ marginTop: 15, width: "100%" }}
            disabled={busy || cooldown > 0 || !configured}
            onClick={resend}
          >
            {tr(
              cooldown
                ? "Resend in " + cooldown + "s"
                : "Resend confirmation email",
            )}
          </button>
        )}
        {sent && (
          <button
            type="button"
            className="auth-text-button"
            onClick={() => {
              setSent(false);
              setMessage("");
              setCanResend(false);
            }}
          >
            {tr("Use a different email")}
          </button>
        )}
        <div className="auth-footer">
          {mode === "login" ? (
            <span>
              {tr("New here?")}
              {tr(" ")}
              <Link href={"/register?next=" + encodeURIComponent(target)}>
                {tr("Create an account")}
              </Link>
            </span>
          ) : (
            <Link href={"/login?next=" + encodeURIComponent(target)}>
              {tr("← Back to log in")}
            </Link>
          )}
          {!configured && (
            <Link href="/dashboard">{tr("Explore the demo workspace →")}</Link>
          )}
        </div>
      </section>
    </main>
  );
}
