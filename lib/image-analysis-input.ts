import { patchInfo } from "@/data/tft";

export const MAX_IMAGES = 3;
export const MAX_TOTAL_IMAGE_CHARS = 3_800_000;
const MAX_BODY_BYTES = 3_850_000;
export class AnalysisInputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function readAnalysisInput(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw new AnalysisInputError("Images are too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AnalysisInputError("Invalid JSON body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new AnalysisInputError("Images are too large.", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new AnalysisInputError("Invalid JSON body."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AnalysisInputError("Expected a JSON object.");
  const raw = body as Record<string, unknown>;
  for (const key of ["sourceId", "sourceName", "patch"]) {
    if (raw[key] !== undefined && (typeof raw[key] !== "string" || (raw[key] as string).length > (key === "patch" ? 32 : 200))) throw new AnalysisInputError(`Invalid ${key}.`);
  }
  if (!Array.isArray(raw.images) || !raw.images.length || raw.images.length > MAX_IMAGES) throw new AnalysisInputError(`Upload between 1 and ${MAX_IMAGES} images.`);
  const images: string[] = [];
  for (const value of raw.images) {
    if (typeof value !== "string" || !/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(value)) throw new AnalysisInputError("Only base64 JPEG, PNG and WebP images are supported.");
    images.push(value);
  }
  if (images.reduce((sum, value) => sum + value.length, 0) > MAX_TOTAL_IMAGE_CHARS) throw new AnalysisInputError("Images are too large.", 413);
  return { images, sourceName: (raw.sourceName as string | undefined)?.trim() || "Unknown source", patch: (raw.patch as string | undefined)?.trim() || patchInfo.patch };
}
