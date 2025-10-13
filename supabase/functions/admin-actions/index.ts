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

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: { headers: { "x-client-info": "supabase-edge-function" } },
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

    // Use the service role key for operations that require elevated privileges
    const supabaseAdminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        global: { headers: { "x-client-info": "supabase-edge-function" } },
      }
    );

    if (req.method === "GET") {
      // List all users with their profiles
      const { data: authUsers, error: authUsersError } = await supabaseAdminClient.auth.admin.listUsers();
      if (authUsersError) {
        console.error("Edge Function Error: Failed to list users.", authUsersError);
        throw authUsersError;
      }

      const { data: profiles, error: profilesDataError } = await supabaseAdminClient
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, role");
      if (profilesDataError) {
        console.error("Edge Function Error: Failed to fetch profiles.", profilesDataError);
        throw profilesDataError;
      }

      const usersWithProfiles = authUsers.users.map(user => {
        const userProfile = profiles.find(p => p.id === user.id);
        return {
          id: user.id,
          email: user.email,
          first_name: userProfile?.first_name || null,
          last_name: userProfile?.last_name || null,
          avatar_url: userProfile?.avatar_url || null,
          role: userProfile?.role || "user", // Default to 'user' if role not found
          created_at: user.created_at,
        };
      });

      return new Response(JSON.stringify(usersWithProfiles), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (req.method === "DELETE") {
      // Delete a user
      const { userId } = await req.json();

      if (!userId) {
        return new Response(JSON.stringify({ error: "User ID is required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const { error: deleteError } = await supabaseAdminClient.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error("Edge Function Error: Error deleting user:", deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ message: "User deleted successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  } catch (error) {
    console.error("Unhandled error in Edge Function 'admin-actions':", error);
    return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});