import { searchProperties } from "@/lib/search-server";
export async function GET(request) {
  try {
    const result = await searchProperties(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      {
        error: error.issues
          ? "Please check your search filters."
          : error.message,
      },
      { status: error.issues ? 400 : error.status || 503 },
    );
  }
}
