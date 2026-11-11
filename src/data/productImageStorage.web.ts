/**
 * Almacenamiento de imágenes de productos para web.
 *
 * Las imágenes se guardan como data URIs en localStorage. No hay cifrado en
 * web (localStorage no es seguro para datos sensibles), por lo que se aclara
 * en la interfaz de la app si es necesario.
 */

const IMAGE_STORAGE_PREFIX = 'me-alcanza-web-image:';

function imageKey(name: string): string {
  return `${IMAGE_STORAGE_PREFIX}${name}`;
}

export function getOwnedImageName(uri: string): string | null {
  // En web las URIs son claves locales o data URIs.
  if (uri.startsWith('data:')) {
    return null;
  }
  if (uri.startsWith(`${IMAGE_STORAGE_PREFIX}`)) {
    return uri.slice(IMAGE_STORAGE_PREFIX.length);
  }
  return null;
}

export async function persistProductImage(
  uri: string | null,
): Promise<string | null> {
  if (!uri) {
    return null;
  }

  // Si ya es una data URI, la guardamos directamente con una clave única.
  if (uri.startsWith('data:')) {
    const randomSuffix = Math.random().toString(36).slice(2, 12);
    const name = `business-${Date.now()}-${randomSuffix}.jpg`;
    try {
      localStorage.setItem(imageKey(name), uri);
      return `${IMAGE_STORAGE_PREFIX}${name}`;
    } catch {
      return null;
    }
  }

  // Si es un blob URI (file picker en web), intentamos leerlo como datos.
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const extension = uri.match(/\.(png|webp|heic|jpg|jpeg)$/i)?.[1] ?? 'jpg';
    const randomSuffix = Math.random().toString(36).slice(2, 12);
    const name = `business-${Date.now()}-${randomSuffix}.${extension}`;
    localStorage.setItem(imageKey(name), base64);
    return `${IMAGE_STORAGE_PREFIX}${name}`;
  } catch {
    return null;
  }
}

export async function resolveProductImageSource(uri: string): Promise<string> {
  const name = getOwnedImageName(uri);
  if (!name) {
    // Si ya es una data URI, la devolvemos tal cual.
    if (uri.startsWith('data:')) {
      return uri;
    }
    throw new Error('La imagen local del producto no está cifrada.');
  }

  const stored = localStorage.getItem(imageKey(name));
  if (!stored) {
    throw new Error('No se encontró la imagen del producto.');
  }
  return stored;
}

export async function migrateProductImages(): Promise<void> {
  // En web no hay imágenes legacy cifradas en el sistema de archivos.
  return;
}

export function deleteProductImages(uris: readonly string[]): void {
  for (const uri of uris) {
    const name = getOwnedImageName(uri);
    if (!name) continue;
    localStorage.removeItem(imageKey(name));
  }
}

export function deleteAllProductImages(): void {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(IMAGE_STORAGE_PREFIX)) {
      localStorage.removeItem(key);
      i--;
    }
  }
}
