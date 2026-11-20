export async function getProfileImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl) return "";
  if (/^(https?:|data:|blob:)/.test(imageUrl)) return imageUrl;
  return imageUrl;
}
