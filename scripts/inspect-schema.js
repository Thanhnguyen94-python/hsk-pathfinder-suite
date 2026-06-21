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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: tables, error: tErr } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public")
    .in("table_name", ["users", "classes", "class_enrollments", "bookings", "student_progress"]);

  if (tErr) {
    console.error("tables error:", tErr.message || tErr);
    process.exit(1);
  }

  console.log("TABLES:", tables);

  const { data: cols, error: cErr } = await supabase
    .from("information_schema.columns")
    .select("table_name,column_name,data_type")
    .eq("table_schema", "public")
    .in("table_name", ["classes", "class_enrollments", "users"])
    .order("table_name", { ascending: true })
    .order("ordinal_position", { ascending: true });

  if (cErr) {
    console.error("columns error:", cErr.message || cErr);
    process.exit(1);
  }

  console.log("COLUMNS:", cols);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
