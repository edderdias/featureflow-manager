import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Mapeamento de status para rótulos amigáveis (copiado de src/lib/demandUtils.ts)
const statusLabels = {
  todo: "A Fazer",
  "in-progress": "Em Andamento",
  testing: "Em Teste",
  done: "Concluído",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // O trigger do banco de dados envia o payload diretamente
    const { demandId, title, description, oldStatus, newStatus, responsible, clientEmail, creatorName } = await req.json();

    if (!clientEmail || !title || !newStatus) {
      console.error("Edge Function Error: Missing required email data in payload.", { clientEmail, title, newStatus });
      return new Response(JSON.stringify({ error: 'Missing required email data.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // IMPORTANTE: Esta Edge Function é projetada para ser chamada por um Trigger de Banco de Dados Supabase
    // usando `net.http_post` com a Chave de Função de Serviço.
    // Portanto, ela NÃO realiza verificação de JWT do lado do cliente.
    // Certifique-se de que seu trigger de banco de dados esteja configurado para passar a Chave de Função de Serviço no cabeçalho Authorization.

    const EMAIL_SERVICE_API_KEY = Deno.env.get("RESEND_API_KEY"); // Chave da API do seu serviço de e-mail (ex: Resend)
    if (!EMAIL_SERVICE_API_KEY) {
      console.error("RESEND_API_KEY is not set in Edge Function environment variables.");
      return new Response(JSON.stringify({ error: "Email service API key not configured. Please set RESEND_API_KEY." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const emailSubject = `Atualização da Demanda: ${title}`;
    let emailBody = `Olá,\n\nA demanda "${title}" (ID: ${demandId}) foi atualizada.\n\n`;

    if (oldStatus && newStatus && oldStatus !== newStatus) {
      emailBody += `Status alterado de "${statusLabels[oldStatus as keyof typeof statusLabels]}" para "${statusLabels[newStatus as keyof typeof statusLabels]}".\n`;
    } else {
      emailBody += `Detalhes da demanda foram atualizados.\n`;
    }

    emailBody += `\nDescrição: ${description}\n`;
    emailBody += `Responsável: ${responsible}\n`;
    if (creatorName) {
      emailBody += `Criado por: ${creatorName}\n`;
    }
    emailBody += `\nAtenciosamente,\nSua Equipe de Suporte`;

    console.log(`Attempting to send email to: ${clientEmail}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`Body: ${emailBody}`);

    // Exemplo de como enviar com um serviço real (Resend)
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMAIL_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // Substitua pelo seu e-mail de remetente verificado no Resend
        to: clientEmail,
        subject: emailSubject,
        text: emailBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Error sending email via Resend:", errorData);
      return new Response(JSON.stringify({ error: `Failed to send email: ${errorData.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Email notification sent successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Unhandled error in Edge Function 'send-demand-update-email':", error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});