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
  const email = process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || "nguyenvanthanh110394@gmail.com";
  const password = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD || "Admin1234!";
  const fullName = process.env.ADMIN_NAME || env.ADMIN_NAME || "Admin User";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment or .env");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "admin",
    },
  });

  if (error) {
    console.error("Failed to create admin user:", error.message);
    process.exit(1);
  }

  console.log("Created admin user:", {
    email,
    password,
    id: data.user?.id,
    role: "admin",
  });
  console.log("You can now log in at /auth with this account.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
