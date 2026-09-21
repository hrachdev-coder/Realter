import test from "node:test";
import assert from "node:assert/strict";
import {
  safeNext,
  authSchemas,
  runAuth,
  finishConfirmation,
  authMessage,
} from "../lib/auth.js";
test("login accepts existing shorter passwords without weakening registration", () => {
  assert.equal(
    authSchemas.login.safeParse({ email: "a@example.com", password: "oldpass" })
      .success,
    true,
  );
  assert.equal(
    authSchemas.register.safeParse({
      full_name: "Ani Test",
      email: "a@example.com",
      password: "oldpass",
      confirm_password: "oldpass",
    }).success,
    false,
  );
});
test("registration trims identity fields and requires matching passwords", () => {
  const base = {
    full_name: " Ani Test ",
    email: " a@example.com ",
    password: "long-test-password",
    confirm_password: "long-test-password",
  };
  assert.equal(authSchemas.register.parse(base).full_name, "Ani Test");
  assert.equal(authSchemas.register.parse(base).email, "a@example.com");
  assert.equal(
    authSchemas.register.safeParse({ ...base, confirm_password: "different" })
      .success,
    false,
  );
});
test("return destinations reject external URLs and encoded traversal", () => {
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/dashboard/../../evil",
    "/login",
    "/%2f%2fevil.example",
    "/dashboard\\evil",
    "/dashboard\nfoo",
    null,
  ])
    assert.equal(safeNext(value), "/dashboard");
  assert.equal(
    safeNext("/dashboard/properties/new?from=home"),
    "/dashboard/properties/new?from=home",
  );
});
test("registration calls Supabase with confirmation and safe return destination", async () => {
  let payload;
  const data = { session: null };
  const auth = {
    signUp: async (input) => {
      payload = input;
      return { data, error: null };
    },
  };
  assert.deepEqual(
    await runAuth(
      auth,
      "register",
      {
        full_name: "Ani Test",
        email: "a@example.com",
        password: "long-test-password",
        confirm_password: "long-test-password",
      },
      "https://tun.example",
      "//evil.example",
    ),
    data,
  );
  assert.equal(
    payload.options.emailRedirectTo,
    "https://tun.example/auth/callback?next=%2Fdashboard",
  );
  assert.equal(payload.confirm_password, undefined);
});
test("forgot password uses a recovery callback and neutral response", async () => {
  let address, options;
  await runAuth(
    {
      resetPasswordForEmail: async (a, o) => {
        address = a;
        options = o;
        return { data: {}, error: null };
      },
    },
    "forgot",
    { email: " a@example.com " },
    "https://tun.example",
  );
  assert.equal(address, "a@example.com");
  assert.equal(
    options.redirectTo,
    "https://tun.example/auth/callback?next=/reset-password",
  );
});
test("reset refuses expired sessions before updating password", async () => {
  let changed = false;
  const auth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    updateUser: async () => {
      changed = true;
    },
  };
  await assert.rejects(
    runAuth(
      auth,
      "reset",
      {
        password: "long-test-password",
        confirm_password: "long-test-password",
      },
      "https://tun.example",
    ),
  );
  assert.equal(changed, false);
});
test("reset updates only the password of a verified user", async () => {
  let payload;
  const auth = {
    getUser: async () => ({ data: { user: { id: "verified" } }, error: null }),
    updateUser: async (input) => {
      payload = input;
      return { data: { user: { id: "verified" } }, error: null };
    },
  };
  await runAuth(
    auth,
    "reset",
    { password: "long-test-password", confirm_password: "long-test-password" },
    "https://tun.example",
  );
  assert.deepEqual(payload, { password: "long-test-password" });
});
test("confirmation supports PKCE and server token hashes", async () => {
  const calls = [];
  const auth = {
    exchangeCodeForSession: async (code) => {
      calls.push(code);
      return { error: null };
    },
    verifyOtp: async (args) => {
      calls.push(args);
      return { error: null };
    },
  };
  assert.deepEqual(
    await finishConfirmation(
      auth,
      new URLSearchParams({
        code: "test-code",
        next: "/dashboard/properties/new",
      }),
    ),
    { ok: true, recovery: false, next: "/dashboard/properties/new" },
  );
  assert.deepEqual(
    await finishConfirmation(
      auth,
      new URLSearchParams({ token_hash: "test-hash", type: "recovery" }),
    ),
    { ok: true, recovery: true, next: "/reset-password" },
  );
  assert.equal(calls.length, 2);
});
test("invalid confirmation types and provider errors fail closed", async () => {
  let called = false;
  const auth = {
    verifyOtp: async () => {
      called = true;
    },
    exchangeCodeForSession: async () => ({ error: { message: "expired" } }),
  };
  assert.equal(
    (
      await finishConfirmation(
        auth,
        new URLSearchParams({ token_hash: "x", type: "admin" }),
      )
    ).ok,
    false,
  );
  assert.equal(called, false);
  assert.equal(
    (await finishConfirmation(auth, new URLSearchParams({ code: "expired" })))
      .ok,
    false,
  );
});
test("auth errors expose useful messages, not raw backend details", () => {
  assert.match(authMessage({ code: "invalid_credentials" }), /incorrect/);
  assert.match(
    authMessage({ code: "email_not_confirmed" }),
    /Confirm your email/,
  );
  assert.match(authMessage({ status: 429 }), /wait/);
  assert.equal(
    authMessage({ message: "private internal stack" }).includes("private"),
    false,
  );
});
