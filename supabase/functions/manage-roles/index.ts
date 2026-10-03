import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabase.rpc("has_role", {
      p_user_id: user.id,
      p_role: "ADMIN",
    });

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    // GET /manage-roles — list all roles with permissions
    if (method === "GET") {
      const { data: roles, error } = await supabase
        .from("roles")
        .select("*, role_permissions(*)")
        .order("created_at");

      if (error) throw error;
      return new Response(JSON.stringify(roles), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /manage-roles — create new role with permissions
    if (method === "POST") {
      const body = await req.json();
      const { name, description, permissions } = body;

      if (!name) {
        return new Response(JSON.stringify({ error: "Role name is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create role
      const { data: role, error: roleError } = await supabase
        .from("roles")
        .insert({ name: name.toUpperCase(), description, is_system_role: false })
        .select()
        .single();

      if (roleError) throw roleError;

      // Create permissions
      const { error: permError } = await supabase
        .from("role_permissions")
        .insert({
          role_id: role.id,
          can_raise_expense: permissions?.can_raise_expense ?? true,
          can_approve_expense: permissions?.can_approve_expense ?? false,
          can_view_analytics: permissions?.can_view_analytics ?? false,
          can_manage_users: permissions?.can_manage_users ?? false,
        });

      if (permError) throw permError;

      // Return role with permissions
      const { data: fullRole } = await supabase
        .from("roles")
        .select("*, role_permissions(*)")
        .eq("id", role.id)
        .single();

      return new Response(JSON.stringify(fullRole), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT /manage-roles — update role permissions (body must include role_id)
    if (method === "PUT") {
      const body = await req.json();
      const { role_id, permissions } = body;

      if (!role_id || !permissions) {
        return new Response(JSON.stringify({ error: "role_id and permissions required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("role_permissions")
        .update({
          can_raise_expense: permissions.can_raise_expense,
          can_approve_expense: permissions.can_approve_expense,
          can_view_analytics: permissions.can_view_analytics,
          can_manage_users: permissions.can_manage_users,
        })
        .eq("role_id", role_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /manage-roles — delete non-system role (body must include role_id)
    if (method === "DELETE") {
      const body = await req.json();
      const { role_id } = body;

      // Check if system role
      const { data: role } = await supabase
        .from("roles")
        .select("is_system_role, name")
        .eq("id", role_id)
        .single();

      if (role?.is_system_role) {
        return new Response(JSON.stringify({ error: "Cannot delete system roles" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("roles").delete().eq("id", role_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
