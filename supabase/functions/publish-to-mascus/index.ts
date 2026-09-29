import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  mascusEndpoint, soapCall, soapResult, openSession, closeSession,
  buildProductXML, buildDeleteXML, wrapProducts, importData, importImages,
  fetchMachineData, updateMascusPublicationStatus, DETAILS_TABLE, PRODUCTDEF_MAP,
  photoFingerprint,
} from "../_shared/mascus.ts";

// Publiceren/offline halen op Mascus (alleen managers).
// body: { dossierIds: string[], action?: 'publish'|'unpublish',
//         testMode?: boolean, discovery?: boolean }
// - discovery: haalt organisaties + relevante categorieën op (eenmalige setup)
// - testMode: toont de XML die verstuurd zou worden, verstuurt niets
// Mascus werkt per product (geen totaalvervanger).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Geen autorisatie-header');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Niet geautoriseerd');
    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'manager') throw new Error('Alleen managers kunnen publiceren');

    const { dossierIds, action = 'publish', testMode, discovery } = await req.json();

    // ---------------- eenmalige setup: organisaties + categorieën ----------
    if (discovery) {
      const sessionId = await openSession();
      try {
        if (discovery === 'cats') {
          // Alleen verifiëren of onze verwachte productdefinitions bestaan:
          // goedkope indexOf-checks i.p.v. regex op de (enorme) categorieën-XML
          const catXml = soapResult(await soapCall('GetImportCategoriesAndProperties', { sessionId, language: 'EN' }), 'GetImportCategoriesAndProperties');
          const kandidaten = ['reachstackers', 'terminaltractors', 'containerhandlers',
            'dieseltrucks', 'emptycontainerhandlers', 'reachstacker', 'terminaltractor',
            'heavydutyforklifts', 'forklifttrucks', 'electricforklifttrucks', 'forklifttruckothers'];
          const gevonden: Record<string, boolean> = {};
          for (const k of kandidaten) gevonden[k] = catXml.toLowerCase().includes(k);
          // stukje context rond de eerste hit voor de zekerheid
          const i = catXml.toLowerCase().indexOf('reachstacker');
          return json({
            success: true, discovery: 'cats', catXmlLengte: catXml.length,
            productdefGevonden: gevonden, verwachteMapping: PRODUCTDEF_MAP,
            fragment: i >= 0 ? catXml.slice(Math.max(0, i - 200), i + 300) : null,
          });
        }
        const orgXml = soapResult(await soapCall('GetImportOrganizations', { sessionId }), 'GetImportOrganizations');
        return json({
          success: true, discovery: 'orgs', endpoint: mascusEndpoint(),
          organizations: orgXml.slice(0, 3000),
        });
      } finally { await closeSession(sessionId); }
    }

    if (!dossierIds?.length) throw new Error('Geen dossier-IDs opgegeven');
    const orgId = Deno.env.get('MASCUS_ORG_ID');

    const { data: dossiers, error } = await supabase
      .from('dossiers').select('*').in('id', dossierIds);
    if (error) throw new Error(`Dossiers ophalen mislukt: ${error.message}`);
    const geldige = (dossiers ?? []).filter((d: any) => DETAILS_TABLE[d.equipment_type]);
    if (!geldige.length) throw new Error('Geen geldige dossiers gevonden');

    const machines = await fetchMachineData(supabase, geldige);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    if (action === 'unpublish') {
      const xmlData = buildDeleteXML(orgId ?? 'ONTBREEKT', geldige.map((d: any) => d.dossier_number));
      if (testMode) return json({ success: true, testMode: true, action, xmlData });
      if (!orgId) throw new Error('MASCUS_ORG_ID ontbreekt (draai eerst discovery)');
      const sessionId = await openSession();
      let meldingen: string[] = [];
      try { meldingen = await importData(sessionId, xmlData); }
      finally { await closeSession(sessionId); }
      const ok = !meldingen.some((m) => /error|fail/i.test(m));
      for (const d of geldige) {
        await updateMascusPublicationStatus(supabase, d.id, ok ? 'deleted' : 'failed',
          ok ? null : meldingen.join(' | ').slice(0, 300), { action: 'delete', response: meldingen.slice(0, 5) });
      }
      return json({ success: ok, action, aantal: geldige.length, meldingen });
    }

    // publish
    const productXmls = machines.map((m) => buildProductXML(orgId ?? 'ONTBREEKT', m.dossier, m.details));
    const xmlData = wrapProducts(productXmls);
    if (testMode) {
      return json({
        success: true, testMode: true, action, endpoint: mascusEndpoint(),
        machineCount: machines.length, xmlData,
        fotoAantallen: Object.fromEntries(machines.map((m) => [m.dossier.dossier_number, m.photos.length])),
        secretsAanwezig: { MASCUS_ORG_ID: !!orgId, MASCUS_USERNAME: !!Deno.env.get('MASCUS_USERNAME'), MASCUS_PASSWORD: !!Deno.env.get('MASCUS_PASSWORD') },
      });
    }
    if (!orgId) throw new Error('MASCUS_ORG_ID ontbreekt (draai eerst discovery)');

    // vingerafdrukken van eerder gepubliceerde fotosets (foto's overslaan
    // als er niets veranderd is — Mascus hoeft ze dan niet opnieuw op te halen)
    const { data: bestaandePubs } = await supabase
      .from('advertisement_publications')
      .select('dossier_id, status, metadata')
      .eq('platform', 'mascus')
      .in('dossier_id', geldige.map((d: any) => d.id));
    const vorigeFp = new Map((bestaandePubs ?? [])
      .filter((p: any) => p.status === 'published')
      .map((p: any) => [p.dossier_id, p.metadata?.photo_fingerprint]));

    const sessionId = await openSession();
    const resultaten: any[] = [];
    try {
      const meldingen = await importData(sessionId, xmlData);
      const dataOk = !meldingen.some((m) => /error|fail/i.test(m));
      for (const m of machines) {
        const fp = photoFingerprint(m.photos);
        const fotosOngewijzigd = vorigeFp.get(m.dossier.id) === fp;
        let fotoMelding: string | null = null;
        if (dataOk && m.photos.length && !fotosOngewijzigd) {
          const urls = m.photos.map((p: any) => `${supabaseUrl}/storage/v1/object/public/dossier-photos/${p.storage_path}`);
          try { fotoMelding = await importImages(sessionId, orgId, m.dossier.dossier_number, urls); }
          catch (e: any) { fotoMelding = `FOUT: ${e.message}`; }
        }
        const fotoOk = !fotoMelding || /imported/i.test(fotoMelding);
        const ok = dataOk && fotoOk;
        await updateMascusPublicationStatus(supabase, m.dossier.id, ok ? 'published' : 'failed',
          ok ? null : [meldingen.join(' | '), fotoMelding].filter(Boolean).join(' | ').slice(0, 300),
          { action: 'publish', photo_count: m.photos.length, foto_melding: fotosOngewijzigd ? 'overgeslagen (ongewijzigd)' : fotoMelding, response: meldingen.slice(0, 5),
            photo_fingerprint: ok ? fp : vorigeFp.get(m.dossier.id) ?? null });
        resultaten.push({ dossier: m.dossier.dossier_number, success: ok, fotos: m.photos.length, fotosOvergeslagen: fotosOngewijzigd, fotoMelding });
      }
      return json({ success: resultaten.every((r) => r.success), action, meldingen, resultaten });
    } finally { await closeSession(sessionId); }

  } catch (error: any) {
    console.error('Fout in publish-to-mascus:', error);
    return json({ error: error.message || 'Onbekende fout' }, 400);
  }
});
