import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ShieldCheck, Plus, PackageOpen, ArrowLeftRight, Sparkles } from "lucide-react";
import { fetchMyListings, fetchProposals, fetchRatings } from "@/lib/db";
import { formatValue, timeAgo } from "@/lib/barter";
import { ListingCard } from "@/components/listing-card";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Grid — Dashboard | BarterGrid" },
      {
        name: "description",
        content:
          "Your listings, open trade proposals, reputation and trust badges in one place on BarterGrid.",
      },
      { property: "og:title", content: "Your Grid — Dashboard | BarterGrid" },
      {
        property: "og:description",
        content: "Manage your barter listings, proposals and reputation.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile } = useAuth();

  const { data: listings, isLoading: loadingListings } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: () => fetchMyListings(user!.id),
    enabled: !!user,
  });
  const { data: proposals } = useQuery({
    queryKey: ["proposals", user?.id],
    queryFn: () => fetchProposals(user!.id),
    enabled: !!user,
  });
  const { data: ratings } = useQuery({
    queryKey: ["ratings", user?.id],
    queryFn: () => fetchRatings(user!.id),
    enabled: !!user,
  });

  const openProposals = (proposals ?? []).filter((p) =>
    ["pending", "countered", "accepted"].includes(p.status),
  );

  const stats = [
    { label: "Active listings", value: (listings ?? []).filter((l) => l.status === "active").length },
    { label: "Open proposals", value: openProposals.length },
    { label: "Trades completed", value: profile?.trades_completed ?? 0 },
    {
      label: "Reputation",
      value: profile?.rating_count ? `${profile.rating_avg.toFixed(1)}★` : "—",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {profile?.display_name ? `Welcome back, ${profile.display_name}` : "Your grid"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {profile?.location && <span>{profile.location}</span>}
            {profile?.is_verified && (
              <Badge variant="outline" className="border-success/40 text-success">
                <ShieldCheck className="mr-1 size-3" /> Verified trader
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/matches">
              <Sparkles className="size-4" /> Matches
            </Link>
          </Button>
          <Button asChild>
            <Link to="/listings/new">
              <Plus className="size-4" /> New listing
            </Link>
          </Button>
        </div>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="surface-panel border-border/70 p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Open proposals</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/trades">View all</Link>
          </Button>
        </div>
        {openProposals.length ? (
          <div className="mt-4 space-y-3">
            {openProposals.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to="/trades/$proposalId"
                params={{ proposalId: p.id }}
                className="block"
              >
                <Card className="surface-panel flex flex-wrap items-center justify-between gap-3 border-border/70 p-4 transition-colors hover:border-primary/50">
                  <div className="flex items-center gap-3">
                    <ArrowLeftRight className="size-4 text-primary" />
                    <div>
                      <p className="font-medium">
                        {p.requested_listing?.title ?? "Listing removed"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.proposer_id === user?.id ? "You proposed" : "Proposed to you"} ·{" "}
                        {timeAgo(p.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {p.status}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="surface-panel mt-4 flex flex-col items-center gap-2 border-border/70 p-10 text-center">
            <ArrowLeftRight className="size-7 text-muted-foreground" />
            <p className="font-semibold">No open proposals</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Find something you need and propose a swap — the matcher can do the searching for you.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/matches">See suggested trades</Link>
            </Button>
          </Card>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Your listings</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/listings/new">Add another</Link>
          </Button>
        </div>
        {loadingListings ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : listings?.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <Card className="surface-panel mt-4 flex flex-col items-center gap-2 border-border/70 p-10 text-center">
            <PackageOpen className="size-7 text-muted-foreground" />
            <p className="font-semibold">You haven't listed anything yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              List what you can spare or what you need. Listings with a photo and an honest value
              get matched fastest.
            </p>
            <Button asChild className="mt-2">
              <Link to="/listings/new">Post your first listing</Link>
            </Button>
          </Card>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Reputation</h2>
        {ratings?.length ? (
          <div className="mt-4 space-y-3">
            {ratings.map((r) => (
              <Card key={r.id} className="surface-panel border-border/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{r.rater?.display_name ?? "A trader"}</p>
                  <span className="flex items-center gap-1 text-sm text-warning">
                    {r.stars.toFixed(1)} <Star className="size-3.5 fill-current" />
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="surface-panel mt-4 border-border/70 p-8 text-center text-sm text-muted-foreground">
            No ratings yet. Complete a trade and both sides can rate each other — that's how trust
            gets built here.
          </Card>
        )}
      </section>

      {profile && (
        <p className="mt-10 text-xs text-muted-foreground">
          Estimated values shown across your listings total{" "}
          {formatValue(
            (listings ?? []).reduce((sum, l) => sum + Number(l.estimated_value || 0), 0),
          )}
          . Values are guides for fair swaps, not prices.
        </p>
      )}
    </div>
  );
}
