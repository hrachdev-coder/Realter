export function onRequestError(error, request, context) {
  console.error(
    JSON.stringify({
      event: "request_error",
      time: new Date().toISOString(),
      digest: typeof error?.digest === "string" ? error.digest : undefined,
      method: request.method,
      route: context.routePath,
      router: context.routerKind,
    }),
  );
}
