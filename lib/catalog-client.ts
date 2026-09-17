let cached: Promise<Response> | null = null;
let expiresAt = 0;

/** Share in-flight requests and reuse the catalog briefly across route changes. Each caller owns its response body. */
export function fetchTftCatalog() {
  if (!cached || Date.now() >= expiresAt) {
    const request = fetch("/api/tft", { signal: AbortSignal.timeout(15000) }).then((response) => {
      if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
      return response;
    });
    cached = request;
    expiresAt = Date.now() + 60000;
    void request.catch(() => { if (cached === request) cached = null; });
  }
  return cached.then((response) => response.clone());
}
