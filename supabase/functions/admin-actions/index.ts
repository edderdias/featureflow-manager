import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
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

    // Use the service role key for operations that require elevated privileges
    const supabaseAdminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        global: { headers: { "x-client-info": "supabase-edge-function" } },
      }
    );

    // --- START: Admin role check ---
    const { data: callerProfile, error: callerProfileError } = await supabaseAdminClient
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .single();

    if (callerProfileError || callerProfile?.role !== "admin") {
      console.error("Edge Function Error: Unauthorized - User is not an admin.", callerProfileError);
      return new Response(JSON.stringify({ error: "Unauthorized: Only administrators can perform this action." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403, // Forbidden
      });
    }
    // --- END: Admin role check ---

    if (req.method === "GET") {
      // List all users with their profiles
      const { data: authUsers, error: authUsersError } = await supabaseAdminClient.auth.admin.listUsers();
      if (authUsersError) {
        console.error("Edge Function Error: Failed to list users from auth.admin:", authUsersError);
        throw authUsersError;
      }

      const { data: profiles, error: profilesDataError } = await supabaseAdminClient
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, role");
      if (profilesDataError) {
        console.error("Edge Function Error: Failed to fetch profiles from public.profiles:", profilesDataError);
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
    } else if (req.method === "PATCH") { // Novo método PATCH para atualização
      const { userId, password, first_name, last_name, avatar_url, role } = await req.json();

      if (!userId) {
        return new Response(JSON.stringify({ error: "User ID is required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Update auth.users table (for password)
      if (password) {
        const { error: authUpdateError } = await supabaseAdminClient.auth.admin.updateUserById(
          userId,
          { password: password }
        );
        if (authUpdateError) {
          console.error("Edge Function Error: Error updating user password:", authUpdateError);
          return new Response(JSON.stringify({ error: `Failed to update user password: ${authUpdateError.message}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          });
        }
      }

      // Update public.profiles table (for first_name, last_name, avatar_url, role)
      const profileUpdates: { first_name?: string; last_name?: string; avatar_url?: string; role?: string; updated_at: string } = {
        updated_at: new Date().toISOString(),
      };
      if (first_name !== undefined) profileUpdates.first_name = first_name;
      if (last_name !== undefined) profileUpdates.last_name = last_name;
      if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url;
      if (role !== undefined) profileUpdates.role = role;

      const { error: profileUpdateError } = await supabaseAdminClient
        .from("profiles")
        .update(profileUpdates)
        .eq("id", userId);

      if (profileUpdateError) {
        console.error("Edge Function Error: Error updating user profile:", profileUpdateError);
        return new Response(JSON.stringify({ error: `Failed to update user profile: ${profileUpdateError.message}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ message: "User updated successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (req.method === "POST") { // Novo método POST para convidar usuários
      const { email, first_name, last_name } = await req.json();

      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required for invitation" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const { data: invitedUser, error: inviteError } = await supabaseAdminClient.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            first_name: first_name || null,
            last_name: last_name || null,
          },
        }
      );

      if (inviteError) {
        console.error("Edge Function Error: Error inviting user:", inviteError);
        let statusCode = 500;
        let errorMessage = `Erro ao enviar convite: ${inviteError.message}`;

        // Check for specific error message indicating user already exists
        if (inviteError.message.includes("User already registered")) {
          statusCode = 409; // Conflict
          errorMessage = "Erro: Já existe um usuário registrado com este e-mail.";
        }

        return new Response(JSON.stringify({ error: errorMessage }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: statusCode,
        });
      }

      return new Response(JSON.stringify({ message: "Invitation sent successfully", user: invitedUser.user }), {
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