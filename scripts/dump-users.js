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
          const unquoted = value.startsWith("\"") && value.endsWith("\"")
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
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env'); process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.from('users').select('id,email,role');
  if (error) { console.error('err', error); process.exit(1); }
  console.log(JSON.stringify(data, null, 2));
}

main();
