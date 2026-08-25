import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured ? createClient(url, key) : null;

export async function fetchResults() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("quiz_results")
    .select("name, score, time_ms, created_at")
    .order("score", { ascending: false })
    .order("time_ms", { ascending: true });
  if (error) throw error;
  return data.map((item) => ({
    name: item.name,
    score: item.score,
    time: item.time_ms,
    createdAt: item.created_at,
  }));
}

export async function insertResult(entry) {
  if (!supabase) return;
  const { error } = await supabase.from("quiz_results").insert({
    name: entry.name,
    score: entry.score,
    time_ms: Math.round(entry.time),
  });
  if (error) throw error;
}
