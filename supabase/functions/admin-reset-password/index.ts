import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is authenticated and has permission
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller has canManageUsers permission
    const { data: permissions } = await callerClient.rpc("get_user_permissions", {
      p_user_id: caller.id,
    });

    if (!permissions?.[0]?.can_manage_users) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { target_user_id } = await req.json();
    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "target_user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent admin from resetting their own password this way
    if (target_user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot reset your own password via admin reset" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to reset the user's password
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const defaultPassword = "123456";

    const { error: updateError } = await adminClient.auth.admin.updateUserById(target_user_id, {
      password: defaultPassword,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set must_change_password flag and update timestamp
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        must_change_password: true,
        password_updated_at: new Date().toISOString(),
      })
      .eq("user_id", target_user_id);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Create in-app notification
    await adminClient.from("notifications").insert({
      user_id: target_user_id,
      message: "Your password has been reset by administrator. Please change it immediately.",
      type: "INFO",
    });

    // Audit log
    await adminClient.rpc("log_audit", {
      p_action: "ADMIN_PASSWORD_RESET",
      p_entity: "user",
      p_entity_id: target_user_id,
      p_details: { reset_by: caller.id },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successfully. Default password: 123456" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
