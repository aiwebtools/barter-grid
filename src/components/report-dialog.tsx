import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag } from "lucide-react";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";

const REASONS = [
  "Suspected scam",
  "Prohibited item",
  "Stolen or counterfeit goods",
  "Harassment or abusive behaviour",
  "Misleading description",
  "Something else",
];

export function ReportDialog({
  listingId,
  reportedUserId,
}: {
  listingId?: string;
  reportedUserId?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("Suspected scam");
  const [details, setDetails] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to report a listing.");
      if (details.trim().length > 1000) throw new Error("Details must be under 1000 characters.");
      const { error } = await db.from("reports").insert({
        reporter_id: user.id,
        listing_id: listingId ?? null,
        reported_user_id: reportedUserId ?? null,
        reason,
        details: details.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report sent to moderators", {
        description: "Thank you — we review flags within 24 hours.",
      });
      setDetails("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag className="size-4" /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report to moderators</DialogTitle>
          <DialogDescription>
            Flag prohibited items, suspected scams, or unsafe behaviour. Reports are private.
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-details">What happened?</Label>
              <Textarea
                id="report-details"
                value={details}
                maxLength={1000}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Give moderators the detail they need to act."
                rows={4}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You need to be signed in to file a report.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!user || mutation.isPending}
            onClick={() => mutation.mutate()}
            variant="destructive"
          >
            {mutation.isPending ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
