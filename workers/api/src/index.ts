const SERVICE_NAME = "schrsistemas-api";
const SERVICE_VERSION = "1.0.0";

const ALLOWED_ORIGINS = new Set([
  "https://schrsistemas.com",
  "https://www.schrsistemas.com",
  "http://localhost:3000"
]);

function buildHeaders(origin: string | null): Headers {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin"
  });

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
  }

  return headers;
}

function jsonResponse(
  body: Record<string, string>,
  status: number,
  origin: string | null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: buildHeaders(origin)
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return jsonResponse({ error: "origin_not_allowed" }, 403, null);
      }

      return new Response(null, {
        status: 204,
        headers: buildHeaders(origin)
      });
    }

    if (url.pathname === "/api/health") {
      if (request.method !== "GET") {
        return jsonResponse({ error: "method_not_allowed" }, 405, origin);
      }

      return jsonResponse(
        {
          status: "ok",
          service: SERVICE_NAME,
          version: SERVICE_VERSION
        },
        200,
        origin
      );
    }

    if (url.pathname === "/") {
      return jsonResponse(
        {
          service: SERVICE_NAME,
          status: "available",
          health: "/api/health"
        },
        200,
        origin
      );
    }

    return jsonResponse({ error: "not_found" }, 404, origin);
  }
};
