import { useMutation } from "@tanstack/react-query";
import { useAuthViewModel } from "@/hooks/hsk-viewmodels/HSK_useAuthViewModel";
import { supabase } from "@/integrations/supabase/client";

export function useHSKProfileViewModel() {
  const { profile, profileLoading } = useAuthViewModel();

  const passwordMutation = useMutation({
    mutationFn: async ({ password }: { password: string }) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { passwordChanged: true };
    },
  });

  return {
    profile,
    profileLoading,
    changePassword: passwordMutation.mutate,
    passwordState: passwordMutation,
  };
}
