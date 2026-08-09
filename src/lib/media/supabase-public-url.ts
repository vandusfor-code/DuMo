import { getStorageBucket } from "@/lib/media/storage-config";

/** Parsea URL pública de Supabase Storage → bucket + path relativo. */
export function parseSupabasePublicUrl(publicUrl: string): {
  bucket: string;
  storagePath: string;
} {
  let url: URL;
  try {
    url = new URL(publicUrl.trim());
  } catch {
    throw new Error("URL de media inválida.");
  }

  const marker = "/storage/v1/object/public/";
  const idx = url.pathname.indexOf(marker);
  if (idx < 0) {
    throw new Error("URL de Supabase Storage no reconocida.");
  }

  const rest = decodeURIComponent(url.pathname.slice(idx + marker.length));
  const slash = rest.indexOf("/");
  if (slash <= 0) {
    throw new Error("Ruta de Supabase Storage incompleta.");
  }

  const bucket = rest.slice(0, slash);
  const storagePath = rest.slice(slash + 1);
  if (!storagePath) {
    throw new Error("Ruta de Supabase Storage vacía.");
  }

  const expected = getStorageBucket();
  if (bucket !== expected) {
    // Acepta bucket distinto si viene del bridge; no forzar error duro.
  }

  return { bucket, storagePath };
}
