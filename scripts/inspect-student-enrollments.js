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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: me } = await supabase
    .from("users")
    .select("id,specific_id,staff_code,full_name,email")
    .eq("email", email)
    .maybeSingle();

  if (!me) {
    console.log("No user");
    return;
  }

  const e1 = await supabase.from("class_enrollments").select("*").eq("student_id", me.specific_id);
  const e2 = await supabase.from("class_enrollments").select("class_id, enrolled_at, classes(*)").eq("student_id", me.specific_id);

  console.log("ME", me);
  console.log("ENROLLMENTS_RAW_COUNT", e1.data?.length ?? 0, e1.error?.message ?? "");
  if (e1.data?.length) console.log("ENROLLMENTS_RAW_SAMPLE", e1.data.slice(0, 5));
  console.log("ENROLLMENTS_JOIN_COUNT", e2.data?.length ?? 0, e2.error?.message ?? "");
  if (e2.data?.length) console.log("ENROLLMENTS_JOIN_SAMPLE", e2.data.slice(0, 5));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
