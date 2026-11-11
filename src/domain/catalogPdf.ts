import { formatCOP } from './money';
import type { BusinessItem, BusinessSellerProfile } from './business';

/**
 * Genera el documento HTML para la ficha en PDF de un producto individual,
 * combinando el diseño visual de una publicación de Instagram con el orden
 * y estructura formal de una factura comercial.
 */
export function generateProductPdfHtml({
  item,
  imageBase64,
  seller,
}: {
  item: BusinessItem;
  imageBase64?: string | null;
  seller?: Partial<BusinessSellerProfile>;
}): string {
  const isProduct = item.type === 'product';
  const typeLabel = isProduct ? 'Producto' : 'Servicio';
  const priceFormatted = formatCOP(item.pricePerUnit);
  const storeName = seller?.storeName?.trim() || 'Mi Tienda';
  const handleName = storeName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'tienda_oficial';
  const dateStr = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(item.name)} - Ficha Comercial</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #F3F4F6;
      padding: 24px;
      line-height: 1.5;
    }

    .sheet {
      max-width: 780px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
      border: 1px solid #E5E7EB;
    }

    /* ENCABEZADO TIPO FACTURA COMERCIAL */
    .invoice-top {
      background: #0F172A;
      color: #FFFFFF;
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-avatar {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: linear-gradient(135deg, #F59E0B, #EC4899, #8B5CF6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .verified-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: #38BDF8;
      color: #0F172A;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 900;
    }
    .brand-handle {
      font-size: 13px;
      color: #94A3B8;
      font-weight: 500;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-tag {
      display: inline-block;
      background: #1E293B;
      border: 1px solid #334155;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #38BDF8;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .invoice-date {
      font-size: 12px;
      color: #94A3B8;
    }

    /* CUERPO PRINCIPAL */
    .body-content {
      padding: 28px;
    }

    /* CARD ESTILO PUBLICACIÓN DE INSTAGRAM */
    .insta-card {
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      background: #FFFFFF;
      overflow: hidden;
      margin-bottom: 24px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.03);
    }
    .insta-header {
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #F1F5F9;
    }
    .insta-user {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .insta-avatar-small {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #EEF2F6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .insta-user-text {
      line-height: 1.2;
    }
    .insta-username {
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
    }
    .insta-location {
      font-size: 11px;
      color: #64748B;
    }
    .insta-badge-id {
      background: #EFF6FF;
      color: #1D4ED8;
      border: 1px solid #BFDBFE;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
    }

    /* FOTO DEL PRODUCTO */
    .insta-media-container {
      width: 100%;
      background: #0F172A;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      max-height: 420px;
      overflow: hidden;
    }
    .insta-img {
      width: 100%;
      max-height: 420px;
      object-fit: cover;
      display: block;
    }
    .insta-placeholder {
      padding: 50px 20px;
      color: #94A3B8;
      text-align: center;
      background: linear-gradient(135deg, #1E293B, #0F172A);
      width: 100%;
    }
    .insta-placeholder-icon {
      font-size: 52px;
      margin-bottom: 8px;
    }
    .insta-placeholder-title {
      font-size: 18px;
      font-weight: 700;
      color: #F8FAFC;
    }

    /* BARRA DE ACCIONES INSTAGRAM */
    .insta-actions-bar {
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #F8FAFC;
    }
    .insta-icons {
      display: flex;
      gap: 12px;
      font-size: 18px;
      color: #334155;
    }
    .insta-price-pill {
      background: #ECFDF5;
      color: #059669;
      border: 1.5px solid #A7F3D0;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }

    /* PIE DE PUBLICACIÓN / CAPTION */
    .insta-caption {
      padding: 12px 16px 16px;
      font-size: 13.5px;
      color: #334155;
      line-height: 1.6;
    }
    .caption-title {
      font-size: 17px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 6px;
    }
    .caption-desc {
      color: #475569;
      margin-bottom: 10px;
      white-space: pre-wrap;
    }
    .insta-tags {
      color: #2563EB;
      font-size: 12.5px;
      font-weight: 500;
    }

    /* TABLA TIPO FACTURA FORMAL */
    .invoice-table-section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #475569;
      margin-bottom: 10px;
    }
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      overflow: hidden;
      font-size: 13px;
    }
    .invoice-table th {
      background: #F8FAFC;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      border-bottom: 1px solid #E2E8F0;
      text-align: left;
    }
    .invoice-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #F1F5F9;
      color: #1E293B;
      vertical-align: middle;
    }
    .col-right {
      text-align: right;
    }
    .total-banner {
      background: #0F172A;
      color: #FFFFFF;
      padding: 16px 20px;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
    }
    .total-label {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #94A3B8;
    }
    .total-amount {
      font-size: 26px;
      font-weight: 800;
      color: #34D399;
    }

    /* BLOQUE DE CONTACTO Y PAGO */
    .payment-contact-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 20px;
    }
    .info-box {
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px 16px;
      background: #F8FAFC;
    }
    .info-box-title {
      font-size: 11.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-bottom: 6px;
    }
    .info-box-content {
      font-size: 13.5px;
      color: #0F172A;
      font-weight: 600;
      line-height: 1.4;
    }
    .whatsapp-highlight {
      color: #047857;
      font-weight: 800;
      font-size: 15px;
    }

    /* FOOTER */
    .invoice-footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 16px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      color: #94A3B8;
    }

    @media print {
      body {
        background: #FFFFFF;
        padding: 0;
      }
      .sheet {
        box-shadow: none;
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- ENCABEZADO TIPO FACTURA -->
    <div class="invoice-top">
      <div class="brand-title-wrap">
        <div class="brand-avatar">🛍️</div>
        <div>
          <div class="brand-title">
            <span>${escapeHtml(storeName)}</span>
            <span class="verified-badge">✓</span>
          </div>
          <div class="brand-handle">@${escapeHtml(handleName)} ${seller?.sellerCity ? `&bull; 📍 ${escapeHtml(seller.sellerCity)}` : ''}</div>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-tag">Cotización / Ficha Comercial</div>
        <div class="invoice-date">${dateStr}</div>
      </div>
    </div>

    <div class="body-content">
      <!-- POST ESTILO INSTAGRAM -->
      <div class="insta-card">
        <div class="insta-header">
          <div class="insta-user">
            <div class="insta-avatar-small">🏪</div>
            <div class="insta-user-text">
              <div class="insta-username">${escapeHtml(storeName)}</div>
              <div class="insta-location">${seller?.sellerCity ? `📍 ${escapeHtml(seller.sellerCity)}` : 'Catálogo Digital'}</div>
            </div>
          </div>
          <span class="insta-badge-id">ID: ${escapeHtml(item.id)}</span>
        </div>

        <div class="insta-media-container">
          ${
            imageBase64
              ? `<img class="insta-img" src="${imageBase64}" alt="${escapeHtml(item.name)}" />`
              : `<div class="insta-placeholder">
                   <div class="insta-placeholder-icon">${isProduct ? '📦' : '🚗'}</div>
                   <div class="insta-placeholder-title">${escapeHtml(item.name)}</div>
                 </div>`
          }
        </div>

        <div class="insta-actions-bar">
          <div class="insta-icons">
            <span>❤️</span>
            <span>💬</span>
            <span>✈️</span>
          </div>
          <div class="insta-price-pill">${priceFormatted} COP</div>
        </div>

        <div class="insta-caption">
          <div class="caption-title">${escapeHtml(item.name)}</div>
          ${
            item.description
              ? `<div class="caption-desc">${escapeHtml(item.description)}</div>`
              : ''
          }
          <div class="insta-tags">
            #${escapeHtml(handleName)} #${isProduct ? 'Producto' : 'Servicio'} #Disponible #Ref_${escapeHtml(item.id.replace(/[^a-zA-Z0-9]/g, ''))}
          </div>
        </div>
      </div>

      <!-- DESGLOSE TIPO FACTURA -->
      <div class="invoice-table-section">
        <div class="section-title">Detalle de la Ficha Comercial</div>
        <table class="invoice-table">
          <thead>
            <tr>
              <th style="width: 25%;">Ref / ID</th>
              <th style="width: 45%;">Descripción del Ítem</th>
              <th style="width: 15%;">Tipo</th>
              <th style="width: 15%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${escapeHtml(item.id)}</strong></td>
              <td>
                <strong>${escapeHtml(item.name)}</strong>
                ${item.description ? `<div style="font-size: 11.5px; color: #64748B; margin-top: 2px;">${escapeHtml(item.description)}</div>` : ''}
              </td>
              <td>${typeLabel}</td>
              <td class="col-right"><strong>${priceFormatted}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="total-banner">
          <div>
            <div class="total-label">Total a pagar / Precio de venta</div>
            <div style="font-size: 11px; color: #94A3B8;">Precios en pesos colombianos (COP)</div>
          </div>
          <div class="total-amount">${priceFormatted}</div>
        </div>
      </div>

      <!-- DATOS DE CONTACTO Y MÉTODOS DE PAGO -->
      <div class="payment-contact-grid">
        <div class="info-box">
          <div class="info-box-title">📲 Contacto para Pedidos</div>
          <div class="info-box-content">
            ${
              seller?.sellerPhone
                ? `<div>WhatsApp: <span class="whatsapp-highlight">${escapeHtml(seller.sellerPhone)}</span></div>`
                : '<div>Directo con el vendedor</div>'
            }
            ${seller?.sellerName ? `<div style="font-size: 12px; color: #64748B; margin-top: 2px;">Atendido por: ${escapeHtml(seller.sellerName)}</div>` : ''}
          </div>
        </div>

        <div class="info-box">
          <div class="info-box-title">💳 Métodos de Pago y Entregas</div>
          <div class="info-box-content">
            ${
              seller?.sellerNotes
                ? `<div>${escapeHtml(seller.sellerNotes)}</div>`
                : '<div>Nequi, Daviplata, Transferencia bancaria o efectivo.</div>'
            }
            <div style="font-size: 11.5px; color: #64748B; margin-top: 2px;">
              ${seller?.sellerCity ? `Ubicación: ${escapeHtml(seller.sellerCity)}` : 'Envíos y entregas acordadas'}
            </div>
          </div>
        </div>
      </div>

      <div class="invoice-footer">
        <div>Comprobante digital comercial &bull; Ref #${escapeHtml(item.id)}</div>
        <div>Generado con ¿Me alcanza?</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Genera el documento HTML para el catálogo completo de productos en PDF,
 * con portada estilo Instagram feed + tabla formal de cotización comercial.
 */
export function generateCatalogPdfHtml({
  items,
  seller,
}: {
  items: { item: BusinessItem; imageBase64?: string | null }[];
  seller?: Partial<BusinessSellerProfile>;
}): string {
  const storeName = seller?.storeName?.trim() || 'Mi Tienda Digital';
  const handleName = storeName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'tienda_oficial';
  const dateStr = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const cardsHtml = items
    .map(({ item, imageBase64 }) => {
      const priceFormatted = formatCOP(item.pricePerUnit);
      const isProduct = item.type === 'product';

      return `
      <div class="grid-card">
        <div class="grid-card-top">
          <div class="grid-card-handle">@${escapeHtml(handleName)}</div>
          <span class="grid-badge-id">ID: ${escapeHtml(item.id)}</span>
        </div>

        <div class="grid-card-img-wrap">
          ${
            imageBase64
              ? `<img class="grid-card-img" src="${imageBase64}" alt="${escapeHtml(item.name)}" />`
              : `<div class="grid-card-placeholder">${isProduct ? '📦' : '🚗'}</div>`
          }
          <div class="grid-price-badge">${priceFormatted}</div>
        </div>

        <div class="grid-card-body">
          <div class="grid-card-name">${escapeHtml(item.name)}</div>
          <div class="grid-card-type">${isProduct ? 'Producto' : 'Servicio'}</div>
          ${
            item.description
              ? `<div class="grid-card-desc">${escapeHtml(item.description)}</div>`
              : ''
          }
        </div>
      </div>`;
    })
    .join('\n');

  const rowsHtml = items
    .map(({ item }, index) => {
      const priceFormatted = formatCOP(item.pricePerUnit);
      return `
      <tr>
        <td style="color: #64748B;">${index + 1}</td>
        <td><strong>${escapeHtml(item.id)}</strong></td>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${item.type === 'product' ? 'Producto' : 'Servicio'}</td>
        <td style="text-align: right; font-weight: 700; color: #047857;">${priceFormatted}</td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Catálogo Oficial - ${escapeHtml(storeName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #FFFFFF;
      padding: 24px;
      line-height: 1.5;
    }

    /* ENCABEZADO DE TIENDA / FACTURA */
    .catalog-header {
      background: #0F172A;
      color: #FFFFFF;
      padding: 24px;
      border-radius: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .store-profile {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .store-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #F59E0B, #EC4899, #8B5CF6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
    }
    .store-name {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .verified {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: #38BDF8;
      color: #0F172A;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 900;
    }
    .store-sub {
      font-size: 13px;
      color: #94A3B8;
    }
    .header-badge-box {
      text-align: right;
    }
    .catalog-pill {
      display: inline-block;
      background: #38BDF8;
      color: #0F172A;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .catalog-date {
      font-size: 12px;
      color: #94A3B8;
    }

    /* BARRA DE CONTACTO */
    .contact-banner {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      border-radius: 12px;
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      font-size: 13px;
      color: #065F46;
    }
    .contact-phone-badge {
      font-size: 15px;
      font-weight: 800;
      color: #047857;
    }

    /* GRID ESTILO FEED DE INSTAGRAM */
    .feed-title {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0F172A;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .feed-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    .grid-card {
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      background: #FFFFFF;
      overflow: hidden;
      page-break-inside: avoid;
      box-shadow: 0 4px 10px rgba(0,0,0,0.03);
    }
    .grid-card-top {
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #F8FAFC;
      border-bottom: 1px solid #F1F5F9;
    }
    .grid-card-handle {
      font-size: 11.5px;
      font-weight: 700;
      color: #475569;
    }
    .grid-badge-id {
      font-size: 10.5px;
      font-weight: 700;
      color: #1D4ED8;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .grid-card-img-wrap {
      position: relative;
      width: 100%;
      height: 190px;
      background: #0F172A;
    }
    .grid-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .grid-card-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      background: linear-gradient(135deg, #1E293B, #0F172A);
      color: #94A3B8;
    }
    .grid-price-badge {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(4px);
      color: #34D399;
      border: 1px solid #059669;
      font-size: 14px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .grid-card-body {
      padding: 12px;
    }
    .grid-card-name {
      font-size: 16px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 2px;
    }
    .grid-card-type {
      font-size: 11px;
      color: #64748B;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 6px;
    }
    .grid-card-desc {
      font-size: 12px;
      color: #475569;
      line-height: 1.4;
    }

    /* TABLA RESUMEN DE FACTURACIÓN / COTIZACIÓN */
    .summary-section {
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      overflow: hidden;
      font-size: 12.5px;
      margin-top: 8px;
    }
    .summary-table th {
      background: #F8FAFC;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      padding: 10px 12px;
      border-bottom: 1px solid #E2E8F0;
      text-align: left;
    }
    .summary-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #F1F5F9;
      color: #1E293B;
    }

    /* FOOTER */
    .catalog-footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 14px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      color: #94A3B8;
    }

    @media print {
      body { padding: 10mm; }
      .grid-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="catalog-header">
    <div class="store-profile">
      <div class="store-avatar">🛍️</div>
      <div>
        <div class="store-name">
          <span>${escapeHtml(storeName)}</span>
          <span class="verified">✓</span>
        </div>
        <div class="store-sub">
          <span>@${escapeHtml(handleName)}</span>
          ${seller?.sellerName ? ` &bull; <span>👤 ${escapeHtml(seller.sellerName)}</span>` : ''}
          ${seller?.sellerCity ? ` &bull; <span>📍 ${escapeHtml(seller.sellerCity)}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="header-badge-box">
      <div class="catalog-pill">${items.length} ${items.length === 1 ? 'producto' : 'productos'}</div>
      <div class="catalog-date">${dateStr}</div>
    </div>
  </div>

  ${
    seller?.sellerPhone
      ? `<div class="contact-banner">
           <div>Para pedidos o apartados, escribe indicando el <strong>código ID</strong> de cada publicación.</div>
           <div class="contact-phone-badge">📱 WhatsApp: ${escapeHtml(seller.sellerPhone)}</div>
         </div>`
      : ''
  }

  <!-- FEED DE PRODUCTOS -->
  <div class="feed-title">📸 Publicaciones del Catálogo</div>
  <div class="feed-grid">
    ${cardsHtml}
  </div>

  <!-- TABLA RESUMEN TIPO FACTURA -->
  <div class="summary-section">
    <div class="feed-title">📋 Lista de Precios y Referencias</div>
    <table class="summary-table">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 25%;">Código ID</th>
          <th style="width: 45%;">Nombre del Ítem</th>
          <th style="width: 10%;">Tipo</th>
          <th style="width: 15%; text-align: right;">Precio</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>

  <div class="catalog-footer">
    <div>Catálogo Oficial &bull; ${escapeHtml(storeName)} (@${escapeHtml(handleName)})</div>
    <div>Página generada con ¿Me alcanza?</div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
