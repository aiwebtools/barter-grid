import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, ArrowLeftRight, Send, Star, ShieldAlert } from "lucide-react";
import { db, fetchMessages, fetchProposal, type ProposalStatus } from "@/lib/db";
import { formatValue, timeAgo } from "@/lib/barter";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { MeetupPanel } from "@/components/meetup-panel";
import { CryptoSettlementPanel } from "@/components/crypto-settlement-panel";


export const Route = createFileRoute("/_authenticated/trades/$proposalId")({
  head: () => ({
    meta: [
      { title: "Trade Negotiation — BarterGrid" },
      {
        name: "description",
        content:
          "Negotiate a barter: counteroffer, accept, reject or mark the trade completed, and message the other trader privately.",
      },
      { property: "og:title", content: "Trade Negotiation — BarterGrid" },
      {
        property: "og:description",
        content: "Counteroffer, accept, reject or complete your barter and message privately.",
      },
    ],
  }),
  component: TradeThread,
});

const STATUS_STYLE: Record<ProposalStatus, string> = {
  pending: "border-warning/40 text-warning",
  countered: "border-accent/40 text-accent",
  accepted: "border-success/40 text-success",
  completed: "border-success/40 text-success",
  rejected: "border-destructive/40 text-destructive",
  cancelled: "border-border text-muted-foreground",
};

function TradeThread() {
  const { proposalId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [counter, setCounter] = useState("");
  const [adjustment, setAdjustment] = useState("0");
  const [stars, setStars] = useState("5");
  const [ratingComment, setRatingComment] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => fetchProposal(proposalId),
  });
  const { data: messages } = useQuery({
    queryKey: ["messages", proposalId],
    queryFn: () => fetchMessages(proposalId),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`trade-${proposalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `proposal_id=eq.${proposalId}` },
        () => queryClient.invalidateQueries({ queryKey: ["messages", proposalId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetups", filter: `proposal_id=eq.${proposalId}` },
        () => queryClient.invalidateQueries({ queryKey: ["meetups", proposalId] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crypto_payments",
          filter: `proposal_id=eq.${proposalId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["crypto-payments", proposalId] }),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trade_proposals", filter: `id=eq.${proposalId}` },
        () => queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [proposalId, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages?.length]);


  const sendMessage = useMutation({
    mutationFn: async () => {
      const text = body.trim();
      if (!text) throw new Error("Write something first.");
      if (text.length > 2000) throw new Error("Keep messages under 2000 characters.");
      const { error } = await db
        .from("messages")
        .insert({ proposal_id: proposalId, sender_id: user!.id, body: text });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["messages", proposalId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: ProposalStatus) => {
      const { error } = await db
        .from("trade_proposals")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", proposalId);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success(`Trade marked ${status}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendCounter = useMutation({
    mutationFn: async () => {
      const text = counter.trim();
      if (text.length < 4) throw new Error("Describe your counteroffer.");
      const { error } = await db
        .from("trade_proposals")
        .update({
          status: "countered",
          offer_summary: text,
          value_adjustment: Number(adjustment || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", proposalId);
      if (error) throw error;
      await db.from("messages").insert({
        proposal_id: proposalId,
        sender_id: user!.id,
        body: `Counteroffer: ${text}${Number(adjustment) ? ` (${formatValue(Number(adjustment))} adjustment)` : ""}`,
      });
    },
    onSuccess: () => {
      setCounter("");
      queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["messages", proposalId] });
      toast.success("Counteroffer sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rate = useMutation({
    mutationFn: async () => {
      const other =
        proposal!.proposer_id === user!.id ? proposal!.recipient_id : proposal!.proposer_id;
      const { error } = await db.from("ratings").insert({
        rater_id: user!.id,
        ratee_id: other,
        proposal_id: proposalId,
        stars: Number(stars),
        comment: ratingComment.trim() || null,
        was_reliable: Number(stars) >= 4,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setRatingComment("");
      queryClient.invalidateQueries({ queryKey: ["ratings"] });
      toast.success("Rating recorded — thanks for keeping the grid honest");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!proposal || !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Trade not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been withdrawn, or you don't have access to it.
        </p>
        <Button className="mt-6" onClick={() => navigate({ to: "/trades" })}>
          Back to trades
        </Button>
      </div>
    );
  }

  const isRecipient = proposal.recipient_id === user.id;
  const counterpart = isRecipient ? proposal.proposer : proposal.recipient;
  const open = ["pending", "countered"].includes(proposal.status);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/trades">
          <ArrowLeft className="size-4" /> All trades
        </Link>
      </Button>

      <Card className="surface-panel border-border/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Trade with {counterpart?.display_name ?? "a trader"}
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              {proposal.requested_listing?.title ?? "Listing removed"}
            </h1>
          </div>
          <Badge variant="outline" className={`capitalize ${STATUS_STYLE[proposal.status]}`}>
            {proposal.status}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="rounded-lg border border-border/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Requested</p>
            <p className="mt-1 font-medium">{proposal.requested_listing?.title ?? "—"}</p>
            <p className="text-sm text-muted-foreground">
              {formatValue(proposal.requested_listing?.estimated_value ?? 0)}
            </p>
          </div>
          <ArrowLeftRight className="mx-auto size-4 text-primary" />
          <div className="rounded-lg border border-border/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Offered</p>
            <p className="mt-1 font-medium">
              {proposal.offered_listing?.title ?? proposal.offer_summary ?? "Open offer"}
            </p>
            <p className="text-sm text-muted-foreground">
              {proposal.offered_listing
                ? formatValue(proposal.offered_listing.estimated_value)
                : "Described in the thread"}
              {Number(proposal.value_adjustment) !== 0 &&
                ` · ${formatValue(Number(proposal.value_adjustment))} adjustment`}
            </p>
          </div>
        </div>

        {proposal.message && (
          <p className="mt-4 rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
            "{proposal.message}"
          </p>
        )}

        <Separator className="my-5" />

        <div className="flex flex-wrap gap-2">
          {open && isRecipient && (
            <>
              <Button size="sm" onClick={() => setStatus.mutate("accepted")}>
                Accept trade
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus.mutate("rejected")}
              >
                Reject
              </Button>
            </>
          )}
          {open && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Counteroffer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Make a counteroffer</DialogTitle>
                  <DialogDescription>
                    Describe the swap you'd actually do. Both sides see this in the thread.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="counter">Your counteroffer</Label>
                    <Textarea
                      id="counter"
                      rows={4}
                      maxLength={600}
                      value={counter}
                      onChange={(e) => setCounter(e.target.value)}
                      placeholder="I'll add 6 jars of preserves and two hours of chainsaw work."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adj">Value adjustment (USD)</Label>
                    <Input
                      id="adj"
                      type="number"
                      step={5}
                      value={adjustment}
                      onChange={(e) => setAdjustment(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => sendCounter.mutate()} disabled={sendCounter.isPending}>
                    Send counteroffer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {proposal.status === "accepted" && (
            <Button size="sm" onClick={() => setStatus.mutate("completed")}>
              Mark completed
            </Button>
          )}
          {open && !isRecipient && (
            <Button size="sm" variant="ghost" onClick={() => setStatus.mutate("cancelled")}>
              Withdraw
            </Button>
          )}
          {proposal.status === "completed" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Star className="size-4" /> Rate this trader
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rate {counterpart?.display_name ?? "this trader"}</DialogTitle>
                  <DialogDescription>
                    Honest ratings are what make the grid safe to use.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="stars">Stars (1–5)</Label>
                    <Input
                      id="stars"
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={stars}
                      onChange={(e) => setStars(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comment">Comment</Label>
                    <Textarea
                      id="comment"
                      rows={3}
                      maxLength={500}
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Showed up on time, gear was exactly as described."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => rate.mutate()} disabled={rate.isPending}>
                    Submit rating
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </Card>

      <Card className="surface-panel mt-6 border-border/70 p-6">
        <h2 className="text-lg font-bold">Negotiation thread</h2>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldAlert className="size-3.5 text-warning" />
          Keep it on BarterGrid. Never send money, gift cards or crypto ahead of a meetup.
        </p>

        <div className="mt-5 max-h-96 space-y-4 overflow-y-auto pr-1">
          {messages?.length ? (
            messages.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="text-xs">
                      {(m.sender?.display_name ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm ${
                      mine ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p
                      className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {timeAgo(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet. Open with when and where you could meet.
            </p>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage.mutate();
          }}
        >
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            placeholder="Write a message…"
            aria-label="Message"
          />
          <Button type="submit" disabled={sendMessage.isPending}>
            <Send className="size-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}
