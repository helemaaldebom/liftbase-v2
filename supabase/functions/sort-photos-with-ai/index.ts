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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const { dossierId } = await req.json();

    if (!dossierId) {
      return new Response(
        JSON.stringify({ error: 'dossierId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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
      console.error('Failed to fetch photos:', {
        status: photosResponse.status,
        statusText: photosResponse.statusText,
        body: errorText
      });
      throw new Error(`Failed to fetch photos: ${photosResponse.status} - ${errorText}`);
    }

    const photos: Photo[] = await photosResponse.json();

    if (!photos || photos.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No photos found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
        throw new Error(`Failed to create signed URL for ${photo.filename}`);
      }

      const { signedURL } = await signedUrlResponse.json();

      return {
        id: photo.id,
        url: `${supabaseUrl}${signedURL}`,
        filename: photo.filename,
      };
    }));

    const photoDescriptions = photoUrls.map((p, idx) =>
      `Photo ${idx + 1} (ID: ${p.id}): ${p.filename}`
    ).join('\n');

    const imageContent = photoUrls.map(p => ({
      type: 'image_url',
      image_url: { url: p.url }
    }));

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Je bent een professionele equipment fotograaf die foto's organiseert voor verkoop advertenties van heftrucks/zwaar materieel.

Ik heb ${photos.length} foto's die gesorteerd moeten worden in een professionele volgorde. De ideale volgorde voor equipment foto's is:
1. Hoofdfoto vooraanzicht (volledig voertuig)
2. Diagonaal voor-links
3. Diagonaal voor-rechts
4. Zijaanzicht links
5. Zijaanzicht rechts
6. Achteraanzicht
7. Cabine interieur
8. Controlepaneel/dashboard
9. Mast/hefmechanisme (bij heftruck)
10. Vorken/aanbouwdelen (bij heftruck)
11. Motorcompartiment
12. Banden/wielen
13. Detail close-ups (schade, slijtage, typeplaatjes, serienummers)
14. Overige foto's

BELANGRIJK: Geef ALLEEN een JSON array terug met de foto IDs in de optimale volgorde. Geen extra tekst, geen uitleg, geen markdown formatting.

Foto's om te sorteren:
${photoDescriptions}

Geef exact dit formaat terug (zonder backticks of andere formatting):
["foto-id-1", "foto-id-2", "foto-id-3"]`
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
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;

    console.log('Raw AI response:', aiResponse);

    let jsonString = aiResponse.trim();

    jsonString = jsonString.replace(/```json\n?/g, '');
    jsonString = jsonString.replace(/```javascript\n?/g, '');
    jsonString = jsonString.replace(/```\n?/g, '');
    jsonString = jsonString.trim();

    if (jsonString.startsWith('return ')) {
      jsonString = jsonString.substring(7);
    }
    if (jsonString.endsWith(';')) {
      jsonString = jsonString.slice(0, -1);
    }

    const jsonMatch = jsonString.match(/\[[^\]]*\]/);
    if (!jsonMatch) {
      console.error('Failed to find JSON array in response');
      console.error('Cleaned response:', jsonString);
      console.error('Original response:', aiResponse);
      throw new Error('Could not parse AI response - no JSON array found. De AI gaf geen geldige JSON array terug.');
    }

    let sortedIds: string[];
    try {
      const jsonToParse = jsonMatch[0];
      console.log('Attempting to parse:', jsonToParse);

      sortedIds = JSON.parse(jsonToParse);

      if (!Array.isArray(sortedIds)) {
        throw new Error('Parsed result is not an array');
      }

      if (sortedIds.some(id => typeof id !== 'string')) {
        throw new Error('Array contains non-string values');
      }
    } catch (parseError: any) {
      console.error('Failed to parse JSON:', parseError);
      console.error('JSON string:', jsonMatch[0]);
      console.error('Original AI response:', aiResponse);
      throw new Error(`JSON parsing mislukt: ${parseError.message}. De AI response was niet in het juiste formaat.`);
    }

    if (!Array.isArray(sortedIds)) {
      throw new Error('AI response is not an array');
    }

    if (sortedIds.length === 0) {
      throw new Error('AI response is empty');
    }

    console.log('Successfully parsed', sortedIds.length, 'photo IDs');

    const updatePromises: Promise<any>[] = [];
    for (let i = 0; i < sortedIds.length; i = i + 1) {
      const photoId: string = sortedIds[i];
      const promise = fetch(
        `${supabaseUrl}/rest/v1/photos?id=eq.${photoId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ display_order: i }),
        }
      );
      updatePromises.push(promise);
    }

    const results = await Promise.all(updatePromises);
    const errors = results.filter(function(r) { return !r.ok; });

    if (errors.length > 0) {
      console.error('Errors updating photos:', errors.length, 'failed out of', results.length);

      for (let i = 0; i < errors.length; i = i + 1) {
        const errorResponse = errors[i];
        const errorText = await errorResponse.text();
        console.error(`Error ${i + 1}:`, {
          status: errorResponse.status,
          statusText: errorResponse.statusText,
          body: errorText
        });
      }

      throw new Error(`Failed to update ${errors.length} out of ${results.length} photos`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${photos.length} photos sorted successfully`,
        order: sortedIds
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in sort-photos-with-ai:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
