import { File, Paths } from 'expo-file-system';

export async function persistProductImage(
  uri: string | null,
): Promise<string | null> {
  if (!uri) {
    return null;
  }

  const extension =
    uri.match(/\.(png|webp|heic)$/i)?.[1]?.toLowerCase() ?? 'jpg';
  const destination = new File(
    Paths.document,
    `business-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`,
  );
  await new File(uri).copy(destination);
  return destination.uri;
}
