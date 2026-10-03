import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Expense Prediction Service — Moving Average
 * Predicts next month's expense using simple moving average of last N months.
 * No ML libraries. Pure math only.
 */

interface MonthlyTotal {
  month: string; // YYYY-MM
  total: number;
}

function calculateMovingAverage(data: number[], window: number): number {
  if (data.length === 0) return 0;
  const slice = data.slice(-window);
  return slice.reduce((sum, v) => sum + v, 0) / slice.length;
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

    const { windowSize = 3, userId } = await req.json();

    // Fetch approved expenses
    let query = supabase
      .from("expenses")
      .select("amount, created_at")
      .in("status", ["APPROVED", "LOGGED"])
      .order("created_at", { ascending: true });

    if (userId) {
      query = query.eq("created_by", userId);
    }

    const { data: expenses, error } = await query;
    if (error) throw error;

    // Group by month
    const monthlyMap = new Map<string, number>();
    for (const exp of expenses || []) {
      const month = exp.created_at.substring(0, 7); // YYYY-MM
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + Number(exp.amount));
    }

    const monthlyTotals: MonthlyTotal[] = Array.from(monthlyMap.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const amounts = monthlyTotals.map(m => m.total);
    const predictedAmount = Math.round(calculateMovingAverage(amounts, windowSize) * 100) / 100;

    // Calculate next month label
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthLabel = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    return new Response(
      JSON.stringify({
        predictedAmount,
        predictedMonth: nextMonthLabel,
        method: "moving_average",
        windowSize,
        historicalMonths: monthlyTotals,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
