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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { "x-client-info": "supabase-edge-function" } },
      }
    );

    // Verify user's authentication
    const { data: { user: authUser } } = await supabaseClient.auth.getUser();

    if (!authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check if the authenticated user is an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      console.error("Profile error or not admin:", profileError);
      return new Response(JSON.stringify({ error: "Forbidden: Only administrators can perform this action." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Use the service role key for admin operations
    const supabaseAdminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: { headers: { "x-client-info": "supabase-edge-function" } },
      }
    );

    if (req.method === "GET") {
      // List all users with their profiles
      const { data: authUsers, error: authUsersError } = await supabaseAdminClient.auth.admin.listUsers();
      if (authUsersError) throw authUsersError;

      const { data: profiles, error: profilesDataError } = await supabaseAdminClient
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, role");
      if (profilesDataError) throw profilesDataError;

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
        console.error("Error deleting user:", deleteError);
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
    console.error("Unhandled error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});