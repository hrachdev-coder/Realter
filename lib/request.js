// Pin production requests to the canonical origin. Local development may
// use either loopback hostname, but still requires exact browser Origin/Host.
export function requestOrigin(
  request,
  canonical = process.env.NEXT_PUBLIC_SITE_URL,
) {
  const internal = new URL(request.url);
  const host = request.headers.get("host") || internal.host;
  const visible = new URL(internal.protocol + "//" + host);
  if (!canonical) return visible.origin;
  const configured = new URL(canonical);
  const loopback = (value) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(value);
  if (
    loopback(configured.hostname) &&
    loopback(visible.hostname) &&
    configured.protocol === visible.protocol &&
    configured.port === visible.port
  )
    return visible.origin;
  return configured.origin;
}
export function isSameOrigin(request) {
  try {
    return request.headers.get("origin") === requestOrigin(request);
  } catch {
    return false;
  }
}
