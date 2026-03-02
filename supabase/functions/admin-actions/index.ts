import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing environment variables." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header missing." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verificação de Admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: authUser }, error: getUserError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }).auth.getUser();

    if (getUserError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: callerProfile } = await supabaseAdminClient
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (req.method === "GET") {
      const { data: authUsers, error: authUsersError } = await supabaseAdminClient.auth.admin.listUsers();
      if (authUsersError) throw authUsersError;

      const { data: profiles, error: profilesDataError } = await supabaseAdminClient
        .from("profiles")
        .select("*");
      if (profilesDataError) throw profilesDataError;

      const usersWithProfiles = authUsers.users.map(user => {
        const userProfile = profiles.find(p => p.id === user.id);
        return {
          id: user.id,
          email: user.email,
          first_name: userProfile?.first_name || null,
          last_name: userProfile?.last_name || null,
          avatar_url: userProfile?.avatar_url || null,
          role: userProfile?.role || "user",
          is_dev: userProfile?.is_dev || false,
          created_at: user.created_at,
          email_confirmed_at: user.email_confirmed_at,
          last_sign_in_at: user.last_sign_in_at,
        };
      });

      return new Response(JSON.stringify(usersWithProfiles), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } 
    
    if (req.method === "POST") {
      const { email, first_name, last_name, password, action, userId, is_dev } = await req.json();

      if (action === "confirm" && userId) {
        const { error: confirmError } = await supabaseAdminClient.auth.admin.updateUserById(userId, {
          email_confirm: true
        });
        if (confirmError) throw confirmError;
        return new Response(JSON.stringify({ message: "User confirmed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      if (action === "create") {
        if (!email || !password) throw new Error("Email and password required");
        const { data: newUser, error: createError } = await supabaseAdminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { first_name, last_name, is_dev }
        });
        if (createError) throw createError;
        return new Response(JSON.stringify({ message: "User created", user: newUser.user }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Default: Invite
      const { data: invitedUser, error: inviteError } = await supabaseAdminClient.auth.admin.inviteUserByEmail(email, {
        data: { first_name, last_name, is_dev }
      });
      if (inviteError) throw inviteError;
      return new Response(JSON.stringify({ message: "Invitation sent", user: invitedUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (req.method === "DELETE") {
      const { userId } = await req.json();
      const { error: deleteError } = await supabaseAdminClient.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;
      return new Response(JSON.stringify({ message: "User deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (req.method === "PATCH") {
      const { userId, password, first_name, last_name, avatar_url, role, is_dev } = await req.json();
      if (password) {
        await supabaseAdminClient.auth.admin.updateUserById(userId, { password });
      }
      const { error: profileUpdateError } = await supabaseAdminClient
        .from("profiles")
        .update({ 
          first_name, 
          last_name, 
          avatar_url, 
          role, 
          is_dev,
          updated_at: new Date().toISOString() 
        })
        .eq("id", userId);
      if (profileUpdateError) throw profileUpdateError;
      return new Response(JSON.stringify({ message: "User updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});