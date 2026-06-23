import { useState } from "react";
import { Star } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { rateTeacher } from "@/lib/hsk.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function RatingDialog({
  slotId,
  classId,
  sessionDate,
  teacherId,
}: {
  slotId: string;
  classId: string;
  sessionDate: string;
  teacherId: string;
}) {
  const qc = useQueryClient();
  const rate = useServerFn(rateTeacher);
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const m = useMutation({
    mutationFn: () => rate({ data: { slotId, classId, sessionDate, teacherId, stars, comment } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ratings"] });
      qc.invalidateQueries({ queryKey: ["student-dash"] });
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Star className="mr-1 h-3.5 w-3.5" /> Đánh giá
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đánh giá buổi học</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  n <= stars
                    ? "fill-warning text-warning"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Nhận xét buổi học (tuỳ chọn)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
        />
        {m.isError && (
          <p className="text-sm text-destructive">{(m.error as Error).message}</p>
        )}
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            Gửi đánh giá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
