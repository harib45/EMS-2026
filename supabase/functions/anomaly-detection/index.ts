import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Anomaly Detection Service — Rule-Based
 * Flags suspicious expenses using configurable rules:
 * 1. Amount > department average * threshold
 * 2. Duplicate bill URL or same amount + same date
 * 3. Burst: more than X expenses in a short period
 */

interface AnomalyResult {
  isAnomaly: boolean;
  reasons: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      expenseId,
      amountThreshold = 1.8,
      burstLimit = 5,
      burstWindowDays = 7,
    } = await req.json();

    if (!expenseId) {
      return new Response(JSON.stringify({ error: "expenseId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the expense in question
    const { data: expense, error: expError } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", expenseId)
      .single();

    if (expError || !expense) {
      return new Response(JSON.stringify({ error: "Expense not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reasons: string[] = [];

    // --- Rule 1: High amount vs department average ---
    // Get creator's department
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("department")
      .eq("user_id", expense.created_by)
      .single();

    if (creatorProfile?.department) {
      // Get all user_ids in same department
      const { data: deptProfiles } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("department", creatorProfile.department);

      const deptUserIds = deptProfiles?.map(p => p.user_id) || [];

      if (deptUserIds.length > 0) {
        const { data: deptExpenses } = await supabase
          .from("expenses")
          .select("amount")
          .in("created_by", deptUserIds);

        if (deptExpenses && deptExpenses.length > 1) {
          const avg = deptExpenses.reduce((s, e) => s + Number(e.amount), 0) / deptExpenses.length;
          if (Number(expense.amount) > avg * amountThreshold) {
            reasons.push(
              `Amount ₹${expense.amount} exceeds department average ₹${Math.round(avg)} by ${amountThreshold}x threshold`
            );
          }
        }
      }
    }

    // --- Rule 2: Duplicate bill URL or same amount + date ---
    if (expense.bill_url) {
      const { data: dupes } = await supabase
        .from("expenses")
        .select("id")
        .eq("bill_url", expense.bill_url)
        .neq("id", expenseId);

      if (dupes && dupes.length > 0) {
        reasons.push(`Duplicate bill URL detected (${dupes.length} other expense(s) share the same bill)`);
      }
    }

    // Same amount + same date (by same user)
    const expDate = expense.created_at.substring(0, 10);
    const { data: sameDayAmount } = await supabase
      .from("expenses")
      .select("id")
      .eq("created_by", expense.created_by)
      .eq("amount", expense.amount)
      .neq("id", expenseId)
      .gte("created_at", `${expDate}T00:00:00`)
      .lte("created_at", `${expDate}T23:59:59`);

    if (sameDayAmount && sameDayAmount.length > 0) {
      reasons.push(`Same amount (₹${expense.amount}) submitted on the same date by the same user`);
    }

    // --- Rule 3: Burst detection ---
    const windowStart = new Date(new Date(expense.created_at).getTime() - burstWindowDays * 86400000).toISOString();
    const { data: recentExpenses } = await supabase
      .from("expenses")
      .select("id")
      .eq("created_by", expense.created_by)
      .gte("created_at", windowStart)
      .lte("created_at", expense.created_at);

    if (recentExpenses && recentExpenses.length > burstLimit) {
      reasons.push(
        `${recentExpenses.length} expenses submitted in ${burstWindowDays} days (limit: ${burstLimit})`
      );
    }

    const result: AnomalyResult = {
      isAnomaly: reasons.length > 0,
      reasons,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
