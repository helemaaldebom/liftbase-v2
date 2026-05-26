import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BulkOfferRequest {
  dossierIds: string[];
  dealerIds: string[];
  message?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !['verkoper', 'manager'].includes(profile.role)) {
      throw new Error('Insufficient permissions');
    }

    const { dossierIds, dealerIds, message }: BulkOfferRequest = await req.json();

    if (!dossierIds || dossierIds.length === 0) {
      throw new Error('No dossiers selected');
    }

    if (!dealerIds || dealerIds.length === 0) {
      throw new Error('No dealers selected');
    }

    console.log(`Creating bulk offer: ${dossierIds.length} dossiers to ${dealerIds.length} dealers`);

    const { data: dossiers, error: dossiersError } = await supabase
      .from('dossiers')
      .select('id, dossier_number, title, equipment_type, brand, model, year')
      .in('id', dossierIds);

    if (dossiersError) {
      throw new Error(`Failed to fetch dossiers: ${dossiersError.message}`);
    }

    if (!dossiers || dossiers.length === 0) {
      throw new Error('No dossiers found');
    }

    const { data: dealers, error: dealersError } = await supabase
      .from('dealers')
      .select('id, name, email, auth_user_id, opt_in_email')
      .in('id', dealerIds)
      .eq('active', true);

    if (dealersError) {
      throw new Error(`Failed to fetch dealers: ${dealersError.message}`);
    }

    if (!dealers || dealers.length === 0) {
      throw new Error('No active dealers found');
    }

    const bidsToCreate = [];
    const emailsToSend = [];

    for (const dossier of dossiers) {
      for (const dealer of dealers) {
        const { data: existingBid } = await supabase
          .from('bids')
          .select('id')
          .eq('dossier_id', dossier.id)
          .eq('dealer_id', dealer.id)
          .maybeSingle();

        if (!existingBid) {
          bidsToCreate.push({
            dossier_id: dossier.id,
            dealer_id: dealer.id,
            status: 'invited',
            notities: message || 'Uitgenodigd via bulk aanbod',
            created_by: user.id,
          });

          if (dealer.opt_in_email && dealer.email) {
            emailsToSend.push({
              dealerEmail: dealer.email,
              dealerName: dealer.name,
              dossierTitle: `${dossier.brand || ''} ${dossier.model || ''} ${dossier.year || ''}`.trim() || dossier.title,
              dossierId: dossier.id,
            });
          }
        }
      }
    }

    if (bidsToCreate.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All dealers were already invited to all selected dossiers',
          bidsCreated: 0,
          emailsSent: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { data: createdBids, error: bidsError } = await supabase
      .from('bids')
      .insert(bidsToCreate)
      .select();

    if (bidsError) {
      throw new Error(`Failed to create bids: ${bidsError.message}`);
    }

    console.log(`Created ${createdBids?.length || 0} bids`);

    let emailsSent = 0;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (resendApiKey && emailsToSend.length > 0) {
      for (const emailData of emailsToSend) {
        try {
          const emailHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
                  .content { background-color: #f9fafb; padding: 30px; }
                  .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                  .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                  .dossier-list { background-color: #fff; border: 2px solid #e5e7eb; padding: 15px; border-radius: 5px; margin: 15px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Uitnodiging voor Bod</h1>
                  </div>
                  <div class="content">
                    <p>Beste ${emailData.dealerName},</p>
                    <p>U bent uitgenodigd om een bod uit te brengen op de volgende machine:</p>
                    <div class="dossier-list">
                      <h3>${emailData.dossierTitle}</h3>
                    </div>
                    ${message ? `<p><strong>Bericht:</strong> ${message}</p>` : ''}
                    <p>U kunt inloggen om de machine details te bekijken en een bod in te dienen.</p>
                    <a href="${supabaseUrl}" class="button">Inloggen op Dealer Portal</a>
                  </div>
                  <div class="footer">
                    <p>Deze email is automatisch gegenereerd.</p>
                  </div>
                </div>
              </body>
            </html>
          `;

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: 'Port Equipment Taxatie <onboarding@resend.dev>',
              to: [emailData.dealerEmail],
              subject: `Uitnodiging voor Bod: ${emailData.dossierTitle}`,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            emailsSent++;
          } else {
            console.error(`Failed to send email to ${emailData.dealerEmail}`);
          }
        } catch (emailError) {
          console.error(`Error sending email:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        bidsCreated: createdBids?.length || 0,
        emailsSent,
        dossiers: dossiers.length,
        dealers: dealers.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in bulk-offer-to-dealers:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
