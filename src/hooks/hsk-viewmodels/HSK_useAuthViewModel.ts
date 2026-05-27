import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { HSKBaseProfile, HSKUserRole } from "@/types/hsk-models/hsk-user.types";

async function fetchHSKProfile(): Promise<HSKBaseProfile> {
  const { data, error } = await supabase
    .from("users")
    .select("id, specific_id, full_name, email, role")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function useAuthViewModel() {
  const { user, loading } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["hsk-user-profile", user?.id],
    queryFn: fetchHSKProfile,
    enabled: Boolean(user),
    staleTime: 1000 * 60 * 5,
  });

  const role = profileQuery.data?.role as HSKUserRole | undefined;
  const isAuthenticated = useMemo(() => Boolean(user && !loading), [user, loading]);

  return {
    user,
    loading,
    profile: profileQuery.data,
    role,
    isAuthenticated,
    profileLoading: profileQuery.isLoading,
  };
}
