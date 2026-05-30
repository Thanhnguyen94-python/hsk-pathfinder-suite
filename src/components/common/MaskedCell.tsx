import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Lock } from "lucide-react";
import { revealUserPii } from "@/lib/hsk.functions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function MaskedCell({
  specificId,
  field,
  masked,
  canReveal,
}: {
  specificId: string;
  field: "phone" | "birth_year";
  masked: string | null;
  canReveal: boolean;
}) {
  const reveal = useServerFn(revealUserPii);
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!masked) return <span className="text-muted-foreground">—</span>;

  if (!canReveal) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-not-allowed items-center gap-1 font-mono text-muted-foreground">
            <Lock className="h-3 w-3" /> {masked}
          </span>
        </TooltipTrigger>
        <TooltipContent>Chỉ Admin có quyền xem</TooltipContent>
      </Tooltip>
    );
  }

  if (value !== null) {
    return (
      <button
        type="button"
        onClick={() => setValue(null)}
        className="inline-flex items-center gap-1 font-mono text-foreground"
      >
        <EyeOff className="h-3 w-3" /> {value}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const r = await reveal({ data: { specificId, field } });
          setValue(r.value ?? "—");
          setTimeout(() => setValue(null), 10000);
        } catch (e: any) {
          setValue(`!${e.message}`);
        } finally {
          setLoading(false);
        }
      }}
      className="inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground"
    >
      <Eye className="h-3 w-3" /> {masked}
    </button>
  );
}
