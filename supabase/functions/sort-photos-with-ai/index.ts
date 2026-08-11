import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Photo {
  id: string;
  storage_path: string;
  filename: string;
  display_order: number;
}

const MAX_PHOTOS = 100;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const { dossierId } = await req.json();

    if (!dossierId) {
      return new Response(
        JSON.stringify({ error: 'dossierId is verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const photosResponse = await fetch(
      `${supabaseUrl}/rest/v1/photos?dossier_id=eq.${dossierId}&select=id,storage_path,filename,display_order&order=display_order.asc`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (!photosResponse.ok) {
      const errorText = await photosResponse.text();
      console.error('Failed to fetch photos:', photosResponse.status, errorText);
      throw new Error(`Foto's ophalen mislukt (${photosResponse.status})`);
    }

    const photos: Photo[] = await photosResponse.json();

    if (!photos || photos.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Geen foto\'s gevonden voor dit dossier' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (photos.length === 1) {
      return new Response(
        JSON.stringify({ success: true, message: '1 foto, niets te sorteren', order: [photos[0].id] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (photos.length > MAX_PHOTOS) {
      return new Response(
        JSON.stringify({ error: `Te veel foto's (${photos.length}); maximum is ${MAX_PHOTOS}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Signed URLs voor alle foto's
    const photoUrls = await Promise.all(photos.map(async (photo: Photo) => {
      const signedUrlResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/dossier-photos/${photo.storage_path}`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: 3600 }),
        }
      );

      if (!signedUrlResponse.ok) {
        throw new Error(`Signed URL aanmaken mislukt voor ${photo.filename}`);
      }

      const { signedURL } = await signedUrlResponse.json();
      return { id: photo.id, url: `${supabaseUrl}${signedURL}` };
    }));

    // De AI werkt met compacte fotonummers (1..N) i.p.v. UUID's.
    // Daardoor blijft het antwoord klein en kan het nooit afgekapt worden,
    // en kan de AI geen onbestaande ID's verzinnen.
    const imageContent = photoUrls.map((p, idx) => ([
      { type: 'text', text: `Foto ${idx + 1}:` },
      { type: 'image_url', image_url: { url: p.url, detail: 'low' } },
    ])).flat();

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Je bent een professionele equipment-fotograaf die foto's organiseert voor verkoopadvertenties van heftrucks en zwaar materieel.

Hieronder staan ${photos.length} genummerde foto's (Foto 1 t/m Foto ${photos.length}). Sorteer ze in deze professionele volgorde:
1. Hoofdfoto vooraanzicht (volledig voertuig)
2. Diagonaal voor-links
3. Diagonaal voor-rechts
4. Zijaanzicht links
5. Zijaanzicht rechts
6. Achteraanzicht
7. Cabine interieur
8. Controlepaneel/dashboard
9. Mast/hefmechanisme
10. Vorken/aanbouwdelen
11. Motorcompartiment
12. Banden/wielen
13. Detail close-ups (schade, slijtage, typeplaatjes, serienummers)
14. Overige foto's

Antwoord uitsluitend met een JSON-object in dit formaat, met elk fotonummer precies één keer:
{"order": [3, 1, 2, ...]}`
          },
          ...imageContent
        ]
      }
    ];

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`AI-service gaf een fout (${openaiResponse.status}). Probeer het later opnieuw.`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices?.[0]?.message?.content ?? '';
    console.log('Raw AI response:', aiResponse);

    let order: unknown;
    try {
      const parsed = JSON.parse(aiResponse);
      order = parsed.order;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      throw new Error('De AI gaf geen geldig JSON-antwoord. Probeer het opnieuw.');
    }

    if (!Array.isArray(order)) {
      throw new Error('De AI gaf geen geldige volgorde terug. Probeer het opnieuw.');
    }

    // Valideer: alleen geldige nummers 1..N, elk hooguit één keer.
    const seen = new Set<number>();
    const validIndexes: number[] = [];
    for (const value of order) {
      const n = typeof value === 'number' ? value : parseInt(String(value), 10);
      if (Number.isInteger(n) && n >= 1 && n <= photos.length && !seen.has(n)) {
        seen.add(n);
        validIndexes.push(n);
      }
    }

    // Ontbrekende foto's achteraan toevoegen in hun huidige volgorde,
    // zodat er nooit foto's "kwijtraken".
    for (let i = 1; i <= photos.length; i++) {
      if (!seen.has(i)) validIndexes.push(i);
    }

    const sortedIds = validIndexes.map((n) => photos[n - 1].id);
    console.log(`Sorted ${sortedIds.length} photos (${seen.size} door AI, ${photos.length - seen.size} aangevuld)`);

    // display_order bijwerken
    const updateResults = await Promise.all(sortedIds.map((photoId, i) =>
      fetch(`${supabaseUrl}/rest/v1/photos?id=eq.${photoId}&dossier_id=eq.${dossierId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ display_order: i }),
      })
    ));

    const failed = updateResults.filter((r) => !r.ok);
    if (failed.length > 0) {
      for (const r of failed) {
        console.error('Update failed:', r.status, await r.text());
      }
      throw new Error(`Opslaan van de nieuwe volgorde is voor ${failed.length} van de ${sortedIds.length} foto's mislukt`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${photos.length} foto's gesorteerd`,
        order: sortedIds,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in sort-photos-with-ai:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Er ging iets mis bij het sorteren' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
