import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

async function loadEnv() {
  try {
    const raw = await readFile(new URL("../.env", import.meta.url), "utf8");
    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const [key, ...rest] = line.split("=");
          const value = rest.join("=").trim();
          const unquoted = value.startsWith('"') && value.endsWith('"')
            ? value.slice(1, -1)
            : value.startsWith("'") && value.endsWith("'")
              ? value.slice(1, -1)
              : value;
          return [key, unquoted];
        }),
    );
  } catch {
    return {};
  }
}

async function main() {
  const env = await loadEnv();
  const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.argv[2] || "hvt4@gmail.com";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: me, error: meErr } = await supabase
    .from("users")
    .select("id, specific_id, staff_code, full_name, email, role, student_account_type")
    .eq("email", email)
    .maybeSingle();

  if (meErr) {
    console.error("users error:", meErr.message || meErr);
    process.exit(1);
  }
  if (!me) {
    console.log("No public.users row for", email);
    process.exit(0);
  }

  const [progressRes, bookingsRes, enrollRes] = await Promise.all([
    supabase.from("student_progress").select("*").eq("student_id", me.specific_id),
    supabase.from("bookings").select("*").eq("student_id", me.specific_id).order("session_date", { ascending: true }),
    supabase
      .from("class_enrollments")
      .select("class_id, enrolled_at, classes ( class_name, course_id, type, teacher_id, start_date, end_date, start_time, end_time, schedule_days )")
      .eq("student_id", me.specific_id),
  ]);

  console.log("ME:", me);
  console.log("PROGRESS_COUNT:", progressRes.data?.length ?? 0, progressRes.error ? `ERROR: ${progressRes.error.message}` : "");
  console.log("BOOKINGS_COUNT:", bookingsRes.data?.length ?? 0, bookingsRes.error ? `ERROR: ${bookingsRes.error.message}` : "");
  console.log("ENROLLMENTS_COUNT:", enrollRes.data?.length ?? 0, enrollRes.error ? `ERROR: ${enrollRes.error.message}` : "");

  if ((progressRes.data?.length ?? 0) > 0) console.log("PROGRESS_SAMPLE:", progressRes.data?.slice(0, 3));
  if ((bookingsRes.data?.length ?? 0) > 0) console.log("BOOKINGS_SAMPLE:", bookingsRes.data?.slice(0, 3));
  if ((enrollRes.data?.length ?? 0) > 0) console.log("ENROLLMENTS_SAMPLE:", enrollRes.data?.slice(0, 3));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
