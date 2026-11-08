import { getSupabaseUrl } from "@/lib/env-public";

export function menuImagePublicUrl(
  imagePath: string | null | undefined,
  version?: string | number | Date | null,
) {
  if (!imagePath) return null;
  const base = `${getSupabaseUrl()}/storage/v1/object/public/menu-images/${imagePath}`;
  if (version == null || version === "") return base;
  const v =
    version instanceof Date ? version.getTime() : String(version);
  return `${base}?v=${encodeURIComponent(v)}`;
}
