import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import type { Database } from './migrations';

const IMAGE_KEY_STORAGE = 'me-alcanza-image-encryption-key';
const IMAGE_EXTENSION = '(?:jpg|png|webp|heic)';
const LEGACY_IMAGE_PATTERN = new RegExp(
  `^business-\\d+-[a-z0-9]{1,6}\\.${IMAGE_EXTENSION}$`,
  'i',
);
const ENCRYPTED_IMAGE_PATTERN = new RegExp(
  `^business-\\d+-[a-f0-9]{16}\\.${IMAGE_EXTENSION}\\.enc$`,
  'i',
);
const PRODUCT_IMAGE_PATTERN = new RegExp(
  `^(?:business-\\d+-[a-z0-9]{1,6}\\.${IMAGE_EXTENSION}|business-\\d+-[a-f0-9]{16}\\.${IMAGE_EXTENSION}\\.enc)$`,
  'i',
);

export async function persistProductImage(
  uri: string | null,
): Promise<string | null> {
  if (!uri) {
    return null;
  }

  const extension = getImageExtension(uri);
  const sourceBytes = await new File(uri).bytes();
  const key = await getImageKey();
  const sealed = await Crypto.aesEncryptAsync(sourceBytes, key);
  const randomSuffix = Array.from(await Crypto.getRandomBytesAsync(8), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const destination = new File(
    Paths.document,
    `business-${Date.now()}-${randomSuffix}.${extension}.enc`,
  );
  destination.create();
  await destination.write(await sealed.combined());
  return destination.uri;
}

export async function resolveProductImageSource(uri: string): Promise<string> {
  const name = getOwnedImageName(uri);
  if (!name || !ENCRYPTED_IMAGE_PATTERN.test(name)) {
    throw new Error('La imagen local del producto no está cifrada.');
  }

  const key = await getImageKey();
  const encryptedBytes = await new File(Paths.document, name).bytes();
  const sealed = Crypto.AESSealedData.fromCombined(encryptedBytes);
  const clearBase64 = await Crypto.aesDecryptAsync(sealed, key, {
    output: 'base64',
  });
  const extension = getImageExtension(name);
  const mimeType = extension === 'jpg' ? 'jpeg' : extension;

  return `data:image/${mimeType};base64,${clearBase64}`;
}

export async function migrateProductImages(db: Database): Promise<void> {
  const rows = await db.getAllAsync<{
    id: string;
    image_uri: string | null;
  }>('SELECT id, image_uri FROM business_item WHERE image_uri IS NOT NULL');
  const legacyUris = new Set(
    rows
      .map((row) => row.image_uri)
      .filter((uri): uri is string => uri !== null)
      .filter((uri) => {
        const name = getOwnedImageName(uri);
        return name !== null && LEGACY_IMAGE_PATTERN.test(name);
      }),
  );
  if (
    rows.some((row) => {
      const name = row.image_uri ? getOwnedImageName(row.image_uri) : null;
      return name !== null && ENCRYPTED_IMAGE_PATTERN.test(name);
    })
  ) {
    await getImageKey();
  }
  const replacements = new Map<string, string | null>();

  for (const uri of legacyUris) {
    const name = getOwnedImageName(uri);
    if (!name) {
      continue;
    }

    const source = new File(Paths.document, name);
    if (!source.exists) {
      replacements.set(uri, null);
      continue;
    }

    replacements.set(uri, await persistProductImage(uri));
  }

  for (const row of rows) {
    const oldUri = row.image_uri;
    if (oldUri && replacements.has(oldUri)) {
      await db.runAsync(
        'UPDATE business_item SET image_uri = ? WHERE id = ?',
        replacements.get(oldUri) ?? null,
        row.id,
      );
    }
  }

  deleteProductImages([...legacyUris]);
  await removeOrphanedProductImages(db);
}

export function deleteProductImages(uris: readonly string[]): void {
  for (const uri of uris) {
    const name = getOwnedImageName(uri);
    if (!name || !PRODUCT_IMAGE_PATTERN.test(name)) {
      continue;
    }

    const file = new File(Paths.document, name);
    if (file.exists) {
      file.delete();
    }
  }
}

export function deleteAllProductImages(): void {
  for (const entry of Paths.document.list()) {
    if (
      entry instanceof File &&
      PRODUCT_IMAGE_PATTERN.test(entry.name) &&
      entry.exists
    ) {
      entry.delete();
    }
  }
}

async function removeOrphanedProductImages(db: Database): Promise<void> {
  const rows = await db.getAllAsync<{ image_uri: string | null }>(
    'SELECT image_uri FROM business_item WHERE image_uri IS NOT NULL',
  );
  const referencedUris = new Set(rows.map(({ image_uri }) => image_uri));

  for (const entry of Paths.document.list()) {
    if (
      entry instanceof File &&
      PRODUCT_IMAGE_PATTERN.test(entry.name) &&
      !referencedUris.has(entry.uri)
    ) {
      entry.delete();
    }
  }
}

async function getImageKey(): Promise<Crypto.AESEncryptionKey> {
  const storedKey = await SecureStore.getItemAsync(IMAGE_KEY_STORAGE);
  if (storedKey) {
    if (!/^[\da-f]{64}$/i.test(storedKey)) {
      throw new Error('La llave de cifrado de imágenes no tiene un formato válido.');
    }
    return Crypto.AESEncryptionKey.import(storedKey, 'hex');
  }

  const hasEncryptedImages = Paths.document.list().some(
    (entry) =>
      entry instanceof File && ENCRYPTED_IMAGE_PATTERN.test(entry.name),
  );
  if (hasEncryptedImages) {
    throw new Error(
      'No se encontró la llave para descifrar las imágenes de tus productos.',
    );
  }

  const key = await Crypto.AESEncryptionKey.generate(256);
  const encodedKey = await key.encoded('hex');
  await SecureStore.setItemAsync(IMAGE_KEY_STORAGE, encodedKey, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

function getOwnedImageName(uri: string): string | null {
  const documentUri = Paths.document.uri.endsWith('/')
    ? Paths.document.uri
    : `${Paths.document.uri}/`;

  if (!uri.startsWith(documentUri)) {
    return null;
  }

  const name = uri.slice(documentUri.length);
  return name.includes('/') ? null : name;
}

function getImageExtension(uri: string): string {
  return (
    uri
      .replace(/\.enc$/i, '')
      .match(/\.(png|webp|heic)$/i)?.[1]
      ?.toLowerCase() ?? 'jpg'
  );
}
