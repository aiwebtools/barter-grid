import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowLeftRight, MapPin } from "lucide-react";
import { fetchListings, fetchMyListings } from "@/lib/db";
import { formatValue, suggestMatches } from "@/lib/barter";
import { ProposeTradeDialog } from "@/components/propose-trade-dialog";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/matches")({
  head: () => ({
    meta: [
      { title: "AI Match Panel — Suggested Fair Trades | BarterGrid" },
      {
        name: "description",
        content:
          "Suggested barters scored on value parity, category compatibility and distance, drawn from everything you have listed.",
      },
      { property: "og:title", content: "AI Match Panel — Suggested Fair Trades | BarterGrid" },
      {
        property: "og:description",
        content: "Fair-trade suggestions scored on value, category fit and proximity.",
      },
    ],
  }),
  component: Matches,
});

function Matches() {
  const { user } = useAuth();
  const [maxDistance, setMaxDistance] = useState(60);

  const { data: mine, isLoading: loadingMine } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: () => fetchMyListings(user!.id),
    enabled: !!user,
  });
  const { data: network, isLoading: loadingNetwork } = useQuery({
    queryKey: ["listings", "network"],
    queryFn: () => fetchListings({ availableOnly: true }),
  });

  const matches = useMemo(() => {
    if (!mine?.length || !network?.length) return [];
    return suggestMatches(mine, network, {
      maxDistance: maxDistance >= 100 ? null : maxDistance,
    }).slice(0, 24);
  }, [mine, network, maxDistance]);

  const loading = loadingMine || loadingNetwork;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header>
        <Badge variant="outline" className="border-primary/40 text-primary">
          <Sparkles className="mr-1 size-3" /> Match panel
        </Badge>
        <h1 className="mt-4 text-3xl font-bold">Suggested fair trades</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every one of your listings is scored against everything available on the grid — value
          parity, category compatibility, distance and the trader's reputation.
        </p>
      </header>

      <Card className="surface-panel mt-6 flex flex-wrap items-center gap-6 border-border/70 p-5">
        <div className="min-w-56 flex-1">
          <div className="flex items-center justify-between">
            <Label>Search radius</Label>
            <span className="font-mono text-xs text-muted-foreground">
              {maxDistance >= 100 ? "Anywhere" : `${maxDistance} mi`}
            </span>
          </div>
          <Slider
            className="mt-3"
            value={[maxDistance]}
            min={5}
            max={100}
            step={5}
            onValueChange={([v]) => setMaxDistance(v ?? 60)}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {matches.length} suggestion{matches.length === 1 ? "" : "s"}
        </div>
      </Card>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : !mine?.length ? (
        <Card className="surface-panel mt-6 flex flex-col items-center gap-3 border-border/70 p-12 text-center">
          <Sparkles className="size-8 text-muted-foreground" />
          <p className="font-semibold">The matcher needs something to work with</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Post at least one listing — what you're offering or what you're seeking — and we'll
            score it against every available trade on the grid.
          </p>
          <Button asChild className="mt-2">
            <Link to="/listings/new">Post a listing</Link>
          </Button>
        </Card>
      ) : matches.length ? (
        <div className="mt-6 space-y-4">
          {matches.map((m) => (
            <Card
              key={`${m.mine.id}-${m.theirs.id}`}
              className="surface-panel border-border/70 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="min-w-40">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Yours</p>
                    <p className="font-medium">{m.mine.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatValue(m.mine.estimated_value)}
                    </p>
                  </div>
                  <ArrowLeftRight className="size-4 shrink-0 text-primary" />
                  <div className="min-w-40">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Theirs</p>
                    <Link
                      to="/listings/$listingId"
                      params={{ listingId: m.theirs.id }}
                      className="font-medium hover:text-primary"
                    >
                      {m.theirs.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatValue(m.theirs.estimated_value)}
                      {m.theirs.owner?.display_name ? ` · ${m.theirs.owner.display_name}` : ""}
                    </p>
                  </div>
                </div>

                <div className="w-40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Match</span>
                    <span className="font-mono text-foreground">{m.score}%</span>
                  </div>
                  <Progress value={m.score} className="mt-1.5 h-1.5" />
                </div>
              </div>

              <ul className="mt-4 flex flex-wrap gap-2">
                {m.reasons.map((r) => (
                  <li key={r}>
                    <Badge variant="secondary" className="font-normal">
                      {r}
                    </Badge>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ProposeTradeDialog
                  listing={m.theirs}
                  defaultOfferedListingId={m.mine.id}
                  trigger={<Button size="sm">Propose this trade</Button>}
                />
                <Button asChild size="sm" variant="outline">
                  <Link to="/listings/$listingId" params={{ listingId: m.theirs.id }}>
                    View listing
                  </Link>
                </Button>
                {m.theirs.location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {m.theirs.location}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="surface-panel mt-6 flex flex-col items-center gap-3 border-border/70 p-12 text-center">
          <Sparkles className="size-8 text-muted-foreground" />
          <p className="font-semibold">No strong matches inside {maxDistance} miles</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Widen the radius, or add what you're seeking so members further out can find you.
          </p>
          <Button variant="outline" className="mt-2" onClick={() => setMaxDistance(100)}>
            Search anywhere
          </Button>
        </Card>
      )}
    </div>
  );
}
