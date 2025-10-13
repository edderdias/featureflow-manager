import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("Edge Function Error: Missing Supabase environment variables.");
      return new Response(JSON.stringify({ error: "Missing Supabase environment variables. Please ensure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are set." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Extract the user's JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Edge Function Error: Authorization header missing.");
      return new Response(JSON.stringify({ error: "Authorization header missing." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Create a Supabase client with the user's JWT for authentication
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            "x-client-info": "supabase-edge-function",
            "Authorization": `Bearer ${token}`, // Pass the user's JWT
          },
        },
      }
    );

    // Verify user's authentication
    const { data: { user: authUser }, error: getUserError } = await supabaseClient.auth.getUser();

    if (getUserError) {
      console.error("Edge Function Error: Failed to get authenticated user.", getUserError);
      return new Response(JSON.stringify({ error: `Authentication failed: ${getUserError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (!authUser) {
      console.error("Edge Function Error: Unauthorized - No authenticated user found.");
      return new Response(JSON.stringify({ error: "Unauthorized: No authenticated user found. Please log in." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { email, first_name, last_name } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Use the service role key for admin operations
    const supabaseAdminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        global: { headers: { "x-client-info": "supabase-edge-function" } },
      }
    );

    const { data, error } = await supabaseAdminClient.auth.admin.inviteUserByEmail(email, {
      data: { first_name, last_name }, // Pass first_name and last_name as user_metadata
    });

    if (error) {
      console.error("Edge Function Error: Error inviting user:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Unhandled error in Edge Function 'invite-user':", error);
    return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});