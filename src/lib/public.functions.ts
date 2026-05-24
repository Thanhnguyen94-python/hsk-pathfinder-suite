import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getTopTeachers = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin.rpc("get_top_teachers", {
    p_limit: 3,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
});
