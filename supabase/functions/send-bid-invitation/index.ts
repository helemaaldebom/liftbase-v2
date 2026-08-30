import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BidInvitationRequest {
  dealerEmail: string;
  dealerName: string;
  dossierTitle: string;
  dossierId: string;
  bidId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { dealerEmail, dealerName, dossierTitle, dossierId, bidId }: BidInvitationRequest = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const loginUrl = `${supabaseUrl}`;

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
            .credentials { background-color: #fff; border: 2px solid #e5e7eb; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Uitnodiging voor Bod</h1>
            </div>
            <div class="content">
              <p>Beste ${dealerName},</p>
              <p>U bent uitgenodigd om een bod uit te brengen op het volgende dossier:</p>
              <h2>${dossierTitle}</h2>
              <p>U kunt inloggen met uw email adres om de machine details te bekijken en een bod in te dienen.</p>
              <a href="${loginUrl}" class="button">Inloggen op Dealer Portal</a>
              <p style="margin-top: 20px;"><strong>Let op:</strong> Log in met het email adres waarmee u deze uitnodiging heeft ontvangen. Als u nog geen wachtwoord heeft ontvangen, neem dan contact op met uw contactpersoon.</p>
            </div>
            <div class="footer">
              <p>Deze email is automatisch gegenereerd. Reageer niet op deze email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Port Equipment Taxatie <onboarding@resend.dev>",
        to: [dealerEmail],
        subject: `Uitnodiging voor Bod: ${dossierTitle}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const emailResult = await emailResponse.json();

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending bid invitation:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});