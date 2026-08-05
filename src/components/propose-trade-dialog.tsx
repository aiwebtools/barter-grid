import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight } from "lucide-react";
import { db, fetchMyListings, type Listing } from "@/lib/db";
import { formatValue } from "@/lib/barter";
import { useAuth } from "@/hooks/use-auth";

const NONE = "__none__";

export function ProposeTradeDialog({
  listing,
  defaultOfferedListingId,
  trigger,
}: {
  listing: Listing;
  defaultOfferedListingId?: string;
  trigger?: React.ReactNode;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [offeredId, setOfferedId] = useState<string>(defaultOfferedListingId ?? NONE);
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("");
  const [adjustment, setAdjustment] = useState("0");

  const { data: myListings } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: () => fetchMyListings(user!.id),
    enabled: !!user && open,
  });

  const offered = myListings?.find((l) => l.id === offeredId) ?? null;
  const gap =
    Number(listing.estimated_value) - (Number(offered?.estimated_value ?? 0) + Number(adjustment || 0));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to propose a trade.");
      if (offeredId === NONE && !summary.trim()) {
        throw new Error("Pick one of your listings or describe what you're offering.");
      }
      const { data, error } = await db
        .from("trade_proposals")
        .insert({
          proposer_id: user.id,
          recipient_id: listing.owner_id,
          requested_listing_id: listing.id,
          offered_listing_id: offeredId === NONE ? null : offeredId,
          offer_summary: summary.trim() || null,
          message: message.trim() || null,
          value_adjustment: Number(adjustment) || 0,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (message.trim()) {
        await db.from("messages").insert({
          proposal_id: (data as { id: string }).id,
          sender_id: user.id,
          body: message.trim(),
        });
      }
      return (data as { id: string }).id;
    },
    onSuccess: (id) => {
      toast.success("Proposal sent", { description: "You'll be notified when they respond." });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      navigate({ to: "/trades/$proposalId", params: { proposalId: id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!user) {
    return (
      <Button asChild size="lg" className="w-full">
        <a href="/auth">Sign in to propose a trade</a>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="w-full">
            <ArrowLeftRight className="size-4" /> Propose a trade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Propose a barter</DialogTitle>
          <DialogDescription>
            For <span className="font-medium text-foreground">{listing.title}</span> —{" "}
            {formatValue(listing.estimated_value)} estimated value.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>What you're putting up</Label>
            <Select value={offeredId} onValueChange={setOfferedId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose one of your listings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Describe it instead</SelectItem>
                {(myListings ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title} · {formatValue(l.estimated_value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!myListings?.length && (
              <p className="text-xs text-muted-foreground">
                You have no listings yet — describe your offer below instead.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Offer summary</Label>
            <Input
              id="summary"
              value={summary}
              maxLength={160}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. 6 hours of welding plus a half cord of oak"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment">Balancing value you'll add ($ equivalent)</Label>
            <Input
              id="adjustment"
              type="number"
              min={0}
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {gap > 0
                ? `Still ${formatValue(gap)} short of their estimate.`
                : `Your side is ${formatValue(Math.abs(gap))} ahead — a strong offer.`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg">Message</Label>
            <Textarea
              id="msg"
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself, suggest a public meeting place and time."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Sending…" : "Send proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
