const IMAGEKIT_URL = import.meta.env.VITE_IMAGEKIT_URL;

type ImageTransformOptions = {
  width?: number;
  height?: number;
  crop?: string;
};

export function getImageUrl(
  path: string,
  { width, height, crop }: ImageTransformOptions = {},
): string {
  const transformations: string[] = [];

  if (width) transformations.push(`w-${width}`);
  if (height) transformations.push(`h-${height}`);
  if (crop) transformations.push(`c-${crop}`);

  const transformation = transformations.length
    ? `/tr:${transformations.join(",")}`
    : "";

  return `${IMAGEKIT_URL}${transformation}/${path}`;
}
const SIGNED_URL_TTL_MS = 45 * 60 * 1000;

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const inFlight = new Map<string, Promise<string>>();
const isDirectUrl = (v: string) =>
  /^(https?:|blob:|data:|\/)/.test(v);
export const getProfileImageUrl = async (key?: string): Promise<string> => {
  if (!key) return "";
  if (isDirectUrl(key)) return key;

  const cached = signedUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const { default: axios } = await import("axios");

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/upload/get-download-url`,
        { fileKey: key },
      );

      const url: string = data?.signedUrl ?? "";

      if (url) {
        signedUrlCache.set(key, {
          url,
          expiresAt: Date.now() + SIGNED_URL_TTL_MS,
        });
      }

      return url;
    } catch {
      return "";
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
};
