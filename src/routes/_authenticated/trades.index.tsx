import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, Inbox } from "lucide-react";
import { fetchProposals, type ProposalStatus, type TradeProposal } from "@/lib/db";
import { formatValue, timeAgo } from "@/lib/barter";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/trades/")({
  head: () => ({
    meta: [
      { title: "Your Trades — Proposals & Negotiations | BarterGrid" },
      {
        name: "description",
        content:
          "Track every barter proposal you've sent and received: pending, countered, accepted and completed trades.",
      },
      { property: "og:title", content: "Your Trades — Proposals & Negotiations | BarterGrid" },
      {
        property: "og:description",
        content: "Track barter proposals you've sent and received on BarterGrid.",
      },
    ],
  }),
  component: Trades,
});

const STATUS_STYLE: Record<ProposalStatus, string> = {
  pending: "border-warning/40 text-warning",
  countered: "border-accent/40 text-accent",
  accepted: "border-success/40 text-success",
  completed: "border-success/40 text-success",
  rejected: "border-destructive/40 text-destructive",
  cancelled: "border-border text-muted-foreground",
};

function ProposalRow({ p, meId }: { p: TradeProposal; meId: string }) {
  const outgoing = p.proposer_id === meId;
  const counterpart = outgoing ? p.recipient : p.proposer;

  return (
    <Link to="/trades/$proposalId" params={{ proposalId: p.id }} className="block">
      <Card className="surface-panel border-border/70 p-4 transition-colors hover:border-primary/50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ArrowLeftRight className="mt-1 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{p.requested_listing?.title ?? "Listing removed"}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {outgoing ? "You offered" : "They offered"}:{" "}
                {p.offered_listing?.title ?? p.offer_summary ?? "an open offer"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {outgoing ? "To" : "From"} {counterpart?.display_name ?? "a trader"} ·{" "}
                {timeAgo(p.created_at)}
                {Number(p.value_adjustment) !== 0 &&
                  ` · ${formatValue(Number(p.value_adjustment))} adjustment`}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`capitalize ${STATUS_STYLE[p.status]}`}>
            {p.status}
          </Badge>
        </div>
      </Card>
    </Link>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="surface-panel flex flex-col items-center gap-2 border-border/70 p-12 text-center">
      <Inbox className="size-7 text-muted-foreground" />
      <p className="font-semibold">{label}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        When a swap is proposed it lands here with a private negotiation thread.
      </p>
      <Button asChild variant="outline" className="mt-2">
        <Link to="/marketplace">Browse the marketplace</Link>
      </Button>
    </Card>
  );
}

function Trades() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["proposals", user?.id],
    queryFn: () => fetchProposals(user!.id),
    enabled: !!user,
  });

  const proposals = data ?? [];
  const active = proposals.filter((p) => ["pending", "countered", "accepted"].includes(p.status));
  const incoming = active.filter((p) => p.recipient_id === user?.id);
  const outgoing = active.filter((p) => p.proposer_id === user?.id);
  const closed = proposals.filter((p) =>
    ["completed", "rejected", "cancelled"].includes(p.status),
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 px-4 py-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold">Your trades</h1>
      <p className="mt-2 text-muted-foreground">
        Every proposal, counteroffer and completed swap.
      </p>

      <Tabs defaultValue="incoming" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="incoming">Incoming ({incoming.length})</TabsTrigger>
          <TabsTrigger value="outgoing">Sent ({outgoing.length})</TabsTrigger>
          <TabsTrigger value="closed">History ({closed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-4 space-y-3">
          {incoming.length ? (
            incoming.map((p) => <ProposalRow key={p.id} p={p} meId={user!.id} />)
          ) : (
            <EmptyState label="No incoming proposals" />
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4 space-y-3">
          {outgoing.length ? (
            outgoing.map((p) => <ProposalRow key={p.id} p={p} meId={user!.id} />)
          ) : (
            <EmptyState label="You haven't proposed a trade yet" />
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-4 space-y-3">
          {closed.length ? (
            closed.map((p) => <ProposalRow key={p.id} p={p} meId={user!.id} />)
          ) : (
            <EmptyState label="No completed trades yet" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
