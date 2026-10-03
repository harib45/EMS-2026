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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const password = "123456";

    const users = [
      { email: "admin@test.com", name: "Admin User", role: "ADMIN", department: null },
      { email: "payroll@test.com", name: "Payroll Manager", role: "PAYROLL", department: null },
      { email: "hod.cse@test.com", name: "HOD CSE", role: "HOD", department: "CSE" },
      { email: "hod.aids@test.com", name: "HOD AI&DS", role: "HOD", department: "AI&DS" },
      { email: "mentor.cse@test.com", name: "Mentor CSE", role: "MENTOR", department: "CSE" },
      { email: "mentor.aids@test.com", name: "Mentor AI&DS", role: "MENTOR", department: "AI&DS" },
      { email: "mentor.cyber@test.com", name: "Mentor Cyber", role: "MENTOR", department: "Cyber Security" },
      { email: "student1.cse@test.com", name: "Student 1 CSE", role: "STUDENT", department: "CSE" },
      { email: "student2.cse@test.com", name: "Student 2 CSE", role: "STUDENT", department: "CSE" },
      { email: "student1.aids@test.com", name: "Student 1 AI&DS", role: "STUDENT", department: "AI&DS" },
      { email: "student2.aids@test.com", name: "Student 2 AI&DS", role: "STUDENT", department: "AI&DS" },
      { email: "student1.cyber@test.com", name: "Student 1 Cyber", role: "STUDENT", department: "Cyber Security" },
      { email: "student2.cyber@test.com", name: "Student 2 Cyber", role: "STUDENT", department: "Cyber Security" },
    ];

    const createdUsers: Record<string, { userId: string; profileId: string }> = {};

    for (const u of users) {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: u.email,
        password,
        email_confirm: true,
        user_metadata: { name: u.name },
      });

      if (authError) {
        console.log(`Skipping ${u.email}: ${authError.message}`);
        // Try to find existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);
        if (existing) {
          const { data: profileData } = await supabase.from("profiles").select("id").eq("user_id", existing.id).single();
          if (profileData) {
            createdUsers[u.email] = { userId: existing.id, profileId: profileData.id };
          }
        }
        continue;
      }

      const userId = authData.user.id;

      // Update profile department
      if (u.department) {
        await supabase.from("profiles").update({ department: u.department }).eq("user_id", userId);
      }

      // Update role (handle_new_user trigger creates STUDENT by default)
      if (u.role !== "STUDENT") {
        // Get role_id from roles table
        const { data: roleRow } = await supabase.from("roles").select("id").eq("name", u.role).single();
        const updateData: any = { role: u.role };
        if (roleRow) updateData.role_id = roleRow.id;
        await supabase.from("user_roles").update(updateData).eq("user_id", userId);
      }

      const { data: profileData } = await supabase.from("profiles").select("id").eq("user_id", userId).single();
      createdUsers[u.email] = { userId, profileId: profileData?.id || "" };
    }

    // Set up reporting hierarchy
    const hierarchy: Record<string, string> = {
      "payroll@test.com": "admin@test.com",
      "hod.cse@test.com": "payroll@test.com",
      "hod.aids@test.com": "payroll@test.com",
      "mentor.cse@test.com": "hod.cse@test.com",
      "mentor.aids@test.com": "hod.aids@test.com",
      "mentor.cyber@test.com": "payroll@test.com",
      "student1.cse@test.com": "mentor.cse@test.com",
      "student2.cse@test.com": "mentor.cse@test.com",
      "student1.aids@test.com": "mentor.aids@test.com",
      "student2.aids@test.com": "mentor.aids@test.com",
      "student1.cyber@test.com": "mentor.cyber@test.com",
      "student2.cyber@test.com": "mentor.cyber@test.com",
    };

    for (const [subordinate, manager] of Object.entries(hierarchy)) {
      const sub = createdUsers[subordinate];
      const mgr = createdUsers[manager];
      if (sub && mgr) {
        await supabase
          .from("profiles")
          .update({ reporting_manager_id: mgr.profileId })
          .eq("id", sub.profileId);
      }
    }

    // Create departments
    const departments = [
      { name: "CSE", hodEmail: "hod.cse@test.com" },
      { name: "AI&DS", hodEmail: "hod.aids@test.com" },
      { name: "Cyber Security", hodEmail: null },
    ];

    for (const dept of departments) {
      const hodUserId = dept.hodEmail ? createdUsers[dept.hodEmail]?.userId : null;
      await supabase.from("departments").upsert(
        { name: dept.name, hod_user_id: hodUserId },
        { onConflict: "name" }
      );
    }

    return new Response(
      JSON.stringify({ success: true, usersCreated: Object.keys(createdUsers).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
