"use client";
import { useLocale } from "@/components/LocaleProvider";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { authMessage } from "@/lib/auth";
export default function LogoutButton({ demo = false }) {
  const { t: tr, locale } = useLocale();

  const { logout } = useAuth(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="logout-control">
      <button
        className="button secondary small"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await logout();
          } catch (e) {
            setError(authMessage(e));
            setBusy(false);
          }
        }}
      >
        {tr(busy ? "Logging out…" : demo ? "Leave demo" : "Log out")}
      </button>
      {error && (
        <p role="alert" className="field-error">
          {tr(error)}
        </p>
      )}
    </div>
  );
}
