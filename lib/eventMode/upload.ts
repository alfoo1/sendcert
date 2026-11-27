// Browser helper: reads an image file and uploads it through
// /api/events/assets, which normalizes it and returns a public URL.

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadEventImage(
  source: File | string,
  kind: 'logo' | 'partner' | 'background',
): Promise<{ url: string; w: number; h: number }> {
  const dataUrl = typeof source === 'string' ? source : await readAsDataUrl(source);
  const res = await fetch('/api/events/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl, kind }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return data as { url: string; w: number; h: number };
}
