import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OWNER = "alfacompofficial@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Get the caller's profile to check if they have permissions
    const { data: callerProfile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isOwner = user.email?.toLowerCase() === OWNER.toLowerCase();
    const role = callerProfile?.role || 'student';
    const isAuthorized = isOwner || role === 'admin' || role === 'teacher';

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden - Teachers/Admins Only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Parse body for actions
    let body = null;
    try {
      body = await req.clone().json();
    } catch (e) {}

    if (body && body.action === "delete" && body.userId) {
      if (!isOwner && role !== "admin") {
        return new Response(JSON.stringify({ error: "Только админы и владелец могут удалять пользователей" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const targetUserResp = await supabaseClient.auth.admin.getUserById(body.userId);
      const targetUser = targetUserResp.data?.user;
      
      if (targetUser && targetUser.email?.toLowerCase() === OWNER.toLowerCase()) {
         return new Response(JSON.stringify({ error: "Нельзя удалить Владельца" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete from profiles and sites first, then auth
      await supabaseClient.from("sites").delete().eq("user_id", body.userId);
      await supabaseClient.from("profiles").delete().eq("user_id", body.userId);
      const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(body.userId);
      
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users from auth.users via admin API
    const { data: { users }, error } = await supabaseClient.auth.admin.listUsers();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles for all users
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("*");

    const userData = users.map((u: any) => {
      const profile = profiles?.find((p: any) => p.user_id === u.id) || {};
      let calculatedRole = profile.role || 'student';
      if (u.email?.toLowerCase() === OWNER.toLowerCase()) calculatedRole = 'owner';

      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        role: calculatedRole,
        last_sign_in_at: u.last_sign_in_at
      };
    });

    return new Response(JSON.stringify({ users: userData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
