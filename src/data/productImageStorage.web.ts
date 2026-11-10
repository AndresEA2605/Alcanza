export async function persistProductImage(
  _uri: string | null,
): Promise<string | null> {
  throw new Error('El almacenamiento web no está habilitado para datos seguros.');
}

export async function resolveProductImageSource(_uri: string): Promise<string> {
  throw new Error('El almacenamiento web no está habilitado para datos seguros.');
}

export async function migrateProductImages(): Promise<void> {
  throw new Error('El almacenamiento web no está habilitado para datos seguros.');
}

export function deleteProductImages(_uris: readonly string[]): void {
  // Web product images are stored as data URIs in SQLite.
}

export function deleteAllProductImages(): void {
  // Web product images are stored as data URIs in SQLite.
}
