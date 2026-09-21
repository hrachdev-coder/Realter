import test from "node:test";
import assert from "node:assert/strict";
import { messages } from "../lib/messages.js";
import {
  translate,
  validLocale,
  formatPrice,
  formatDate,
} from "../lib/i18n.js";
test("every UI message has Armenian and Russian translations", () => {
  assert.ok(Object.keys(messages).length > 400);
  for (const [key, entry] of Object.entries(messages)) {
    for (const locale of ["hy", "ru"])
      assert.ok(entry[locale]?.trim(), key + " " + locale);
    assert.equal(translate(key, "en"), key);
  }
});
test("locale validation defaults safely to Armenian", () => {
  assert.equal(validLocale("ru"), "ru");
  assert.equal(validLocale("../xx"), "hy");
  assert.equal(validLocale(undefined), "hy");
});
test("dynamic rental and result labels translate without altering numeric values", () => {
  assert.equal(
    translate("Minimum rent / month", "ru"),
    "Минимальная аренда / месяц",
  );
  assert.equal(translate("Resend in 42s", "hy"), "Կրկին ուղարկել 42 վրկ․ հետո");
  assert.equal(translate(" / month", "ru"), " /месяц");
  assert.equal(translate("12 homes to discover", "ru"), "12 объявлений");
});
test("unknown user text and React values pass through unchanged", () => {
  const child = { type: "span", props: { children: "test" } };
  assert.equal(translate(child, "ru"), child);
  assert.equal(
    translate("My unique listing 847", "hy"),
    "My unique listing 847",
  );
  assert.equal(translate(null, "hy"), null);
});
test("currency and date formatters follow selected locale", () => {
  assert.notEqual(
    formatPrice(1200, "USD", "en"),
    formatPrice(1200, "USD", "ru"),
  );
  assert.equal(formatDate("2026-09-16", "en"), "Sep 16, 2026");
  assert.match(formatDate("2026-09-16", "ru"), /16/);
});
