// Gedeelde Mascus-logica (SOAP Webservice, zie MascusWSI_2026_March.pdf)
// Gebruikt door publish-to-mascus en daily-mascus-sync.
// Secrets: MASCUS_USERNAME, MASCUS_PASSWORD, MASCUS_ORG_ID, MASCUS_ENV
//
// Anders dan F.I. werkt Mascus PER PRODUCT (create/update/delete) — geen
// totaalvervanger. Offline halen kan met visibilitybyte=0 of met delete.

import { externeTekst, photoFingerprint } from "./extern.ts";
export { photoFingerprint };

export const MASCUS_ENDPOINTS: Record<string, string> = {
  test: 'https://mascustest.mascus.com/api/mascusapi.asmx',
  uat: 'https://mascusuat.mascus.com/api/mascusapi.asmx',
  prod: 'https://services.mascus.com/api/mascusapi.asmx',
};

export function mascusEndpoint(): string {
  const env = (Deno.env.get('MASCUS_ENV') ?? 'test').toLowerCase();
  return MASCUS_ENDPOINTS[env] ?? MASCUS_ENDPOINTS.test;
}

export const DETAILS_TABLE: Record<string, string> = {
  forklift: 'forklift_details',
  heavy_duty_forklift: 'forklift_details',
  reachstacker: 'reachstacker_details',
  terminal_tractor: 'terminal_tractor_details',
  empty_container_handler: 'empty_container_handler_details',
};

// productdefinition per apparatuurtype. Waarden verifiëren via de
// discovery-actie (GetImportCategoriesAndProperties); dit zijn de
// verwachte codes o.b.v. het IMS-sjabloon en de Mascus-categorieboom.
export const PRODUCTDEF_MAP: Record<string, string> = {
  reachstacker: 'reachstackers',
  terminal_tractor: 'terminaltractors',
  empty_container_handler: 'containerhandlers',
  forklift: 'dieseltrucks',
  heavy_duty_forklift: 'dieseltrucks',
};

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// ---------------------------------------------------------------- SOAP ----

/** Kale SOAP 1.1-call naar de .asmx (namespace uit de WSDL). */
const SOAP_NS = 'http://services.mascus.com/api';
export async function soapCall(method: string, params: Record<string, string>): Promise<string> {
  const body = Object.entries(params)
    .map(([k, v]) => `<${k}>${esc(v)}</${k}>`).join('');
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="${SOAP_NS}">${body}</${method}>
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(mascusEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `"${SOAP_NS}/${method}"`,
    },
    body: envelope,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Mascus SOAP ${method} -> ${response.status}: ${text.slice(0, 400)}`);
  }
  return text;
}

/** Haalt de inhoud van <MethodResult> uit een SOAP-antwoord (ontdaan van XML-escaping). */
export function soapResult(xml: string, method: string): string {
  const m = xml.match(new RegExp(`<${method}Result>([\\s\\S]*?)</${method}Result>`));
  const raw = m?.[1] ?? '';
  return raw
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

export async function openSession(): Promise<string> {
  const username = Deno.env.get('MASCUS_USERNAME');
  const password = Deno.env.get('MASCUS_PASSWORD');
  if (!username || !password) throw new Error('Mascus-secrets ontbreken (MASCUS_USERNAME, MASCUS_PASSWORD)');
  const xml = await soapCall('OpenSession', { username, password });
  const sessionId = soapResult(xml, 'OpenSession').trim();
  if (!sessionId || /error|invalid/i.test(sessionId)) {
    throw new Error(`Mascus OpenSession mislukt: ${sessionId.slice(0, 200) || 'geen sessionId'}`);
  }
  return sessionId;
}

export async function closeSession(sessionId: string): Promise<void> {
  try { await soapCall('CloseSession', { sessionId }); } catch { /* best effort */ }
}

// ------------------------------------------------------------- product ----

/**
 * Product-XML voor ImportData (create/update).
 * UITSLUITREGEL 16-09 (zie extern.ts): geen prijzen (geen priceoriginal =
 * "prijs op aanvraag"), geen serienummer, geen adres/plaats (location leeg,
 * alleen country), geen interne opmerkingen — tekst alleen via externeTekst.
 */
export function buildProductXML(orgId: string, dossier: any, details: any, opts: { visible?: boolean } = {}): string {
  const props: [string, string][] = [
    ['country', 'NL'],
    ['brand', dossier.brand || dossier.merk || ''],
    ['model', dossier.model || dossier.type || ''],
  ];
  const jaar = Number(dossier.year || dossier.bouwjaar);
  if (jaar > 0) props.push(['yearofmanufacture', String(jaar)]);
  const uren = Number(dossier.hours || dossier.uren || details?.hours_on_clock);
  if (uren > 0) props.push(['meterreadouthours', String(Math.round(uren))]);
  const tekst = externeTekst(dossier, details);
  const propXml = props
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `   <property name="${k}">${esc(v)}</property>`)
    .join('\n');
  const infoXml = tekst ? `\n   <property name="otherinformation" language="EN">${esc(tekst)}</property>` : '';

  // Verplichte verkoper: userid uit GetImportOrganizations (Tigran)
  const sellerId = Deno.env.get('MASCUS_SELLER_ID') ?? '';
  const sellerXml = sellerId ? `\n   <seller number="1">${esc(sellerId)}</seller>` : '';

  return ` <product>
   <productdefinition>${esc(PRODUCTDEF_MAP[dossier.equipment_type] ?? 'dieseltrucks')}</productdefinition>
   <organizationid>${esc(orgId)}</organizationid>
   <dealerproductid>${esc(dossier.dossier_number)}</dealerproductid>
${propXml}${infoXml}
   <property name="visibilitybyte">${opts.visible === false ? 0 : 1}</property>${sellerXml}
 </product>`;
}

export function buildDeleteXML(orgId: string, dossierNumbers: string[]): string {
  const products = dossierNumbers.map((nr) => ` <product>
   <organizationid>${esc(orgId)}</organizationid>
   <dealerproductid>${esc(nr)}</dealerproductid>
   <delete>true</delete>
 </product>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<products>\n${products}\n</products>`;
}

export function wrapProducts(productXmls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<products>\n${productXmls.join('\n')}\n</products>`;
}

export async function importData(sessionId: string, xmlData: string): Promise<string[]> {
  const xml = await soapCall('ImportData', { sessionId, xmlData });
  // ImportData geeft een string-array terug: <string>..</string> per melding
  const items = [...xml.matchAll(/<string>([\s\S]*?)<\/string>/g)].map((m) => m[1]);
  return items.length ? items : [soapResult(xml, 'ImportData')];
}

/** Foto's als URL's (sectie 6) — Supabase public URLs kunnen direct. */
export async function importImages(sessionId: string, orgId: string, dealerProductId: string, photoUrls: string[]): Promise<string> {
  const xmlData = `<?xml version="1.0" encoding="UTF-8"?>\n<images>\n${photoUrls.map((u) => ` <image>${esc(u)}</image>`).join('\n')}\n</images>`;
  const xml = await soapCall('ImportProductImages', {
    sessionId, organizationId: orgId, dealerproductId: dealerProductId, xmlData,
  });
  return soapResult(xml, 'ImportProductImages').trim();
}

// ------------------------------------------------------------ data/status --

export async function fetchMachineData(supabase: any, dossiers: any[]) {
  const result: { dossier: any; details: any; photos: any[] }[] = [];
  for (const dossier of dossiers) {
    const table = DETAILS_TABLE[dossier.equipment_type];
    const { data: details } = table
      ? await supabase.from(table).select('*').eq('dossier_id', dossier.id).maybeSingle()
      : { data: null };
    const { data: photos } = await supabase
      .from('photos').select('*')
      .eq('dossier_id', dossier.id)
      .eq('visible_online', true)
      .order('display_order', { ascending: true });
    result.push({ dossier, details, photos: photos ?? [] });
  }
  return result;
}

export async function updateMascusPublicationStatus(
  supabase: any, dossierId: string, status: 'published' | 'failed' | 'deleted',
  errorMessage: string | null, metadata: Record<string, unknown>
) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('advertisement_publications')
    .select('id')
    .eq('dossier_id', dossierId)
    .eq('platform', 'mascus')
    .maybeSingle();

  const record = { status, last_synced_at: now, sync_error_message: errorMessage, metadata };
  if (existing) {
    await supabase.from('advertisement_publications').update(record).eq('id', existing.id);
  } else {
    await supabase.from('advertisement_publications').insert({
      dossier_id: dossierId, platform: 'mascus',
      published_at: status === 'published' ? now : null,
      ...record,
    });
  }
}
