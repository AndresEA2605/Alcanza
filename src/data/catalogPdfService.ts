import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { BusinessItem, BusinessSellerProfile } from '../domain/business';
import {
  generateCatalogPdfHtml,
  generateProductPdfHtml,
} from '../domain/catalogPdf';
import { resolveProductImageSource } from './productImageStorage';

/**
 * Obtiene la representación Base64 de la imagen de un producto para incluirla en el PDF.
 */
async function getProductImageBase64(
  imageUri: string | null,
): Promise<string | null> {
  if (!imageUri) {
    return null;
  }

  if (imageUri.startsWith('data:')) {
    return imageUri;
  }

  try {
    return await resolveProductImageSource(imageUri);
  } catch {
    return null;
  }
}

/**
 * Genera el PDF de una ficha técnica de un producto individual.
 */
export async function generateProductPdf({
  item,
  seller,
}: {
  item: BusinessItem;
  seller?: Partial<BusinessSellerProfile>;
}): Promise<string> {
  const imageBase64 = await getProductImageBase64(item.imageUri);
  const html = generateProductPdfHtml({
    item,
    imageBase64,
    seller,
  });

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
}

/**
 * Genera el PDF del catálogo completo con todos los productos seleccionados.
 */
export async function generateCatalogPdf({
  items,
  seller,
}: {
  items: BusinessItem[];
  seller?: Partial<BusinessSellerProfile>;
}): Promise<string> {
  const itemsWithImages = await Promise.all(
    items.map(async (item) => ({
      item,
      imageBase64: await getProductImageBase64(item.imageUri),
    })),
  );

  const html = generateCatalogPdfHtml({
    items: itemsWithImages,
    seller,
  });

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  return uri;
}

/**
 * Comparte el archivo PDF generado mediante el diálogo nativo (WhatsApp, Telegram, etc.).
 */
export async function sharePdfFile(
  pdfUri: string,
  title: string,
): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      UTI: '.pdf',
      dialogTitle: title,
    });
  } else if (Platform.OS === 'web') {
    // En web, si no hay Web Share API para archivos, abrir en una nueva ventana para imprimir o guardar
    if (typeof window !== 'undefined') {
      window.open(pdfUri, '_blank');
    }
  } else {
    throw new Error('La función de compartir archivos no está disponible en este dispositivo.');
  }
}
