export function imageUrl(value) {
  if (!value) return "/placeholder.svg";
  return value.startsWith("https://images.unsplash.com/")
    ? value
    : "/api/images?path=" + encodeURIComponent(value);
}
