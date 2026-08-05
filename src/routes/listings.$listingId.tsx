import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, ShieldCheck, ShieldAlert, Star, ArrowLeft } from "lucide-react";
import { fetchListing } from "@/lib/db";
import { categoryLabel, conditionLabel, formatValue, timeAgo, SCAM_SIGNALS } from "@/lib/barter";
import { ProposeTradeDialog } from "@/components/propose-trade-dialog";
import { ReportDialog } from "@/components/report-dialog";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/listings/$listingId")({
  head: () => ({
    meta: [
      { title: "Listing — BarterGrid" },
      {
        name: "description",
        content:
          "View a barter listing: condition, estimated value, pickup area, trader reputation, and propose a swap.",
      },
      { property: "og:title", content: "Listing — BarterGrid" },
      {
        property: "og:description",
        content: "View listing details and propose a fair barter on BarterGrid.",
      },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  const { listingId } = Route.useParams();
  const { user } = useAuth();

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => fetchListing(listingId),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold">Listing not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been traded away or removed by a moderator.
        </p>
        <Button asChild className="mt-6">
          <Link to="/marketplace">Back to marketplace</Link>
        </Button>
      </div>
    );
  }

  const photos = (listing.listing_photos ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const owner = listing.owner;
  const isOwner = user?.id === listing.owner_id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/marketplace">
          <ArrowLeft className="size-4" /> Marketplace
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {photos.length ? (
            <div className="space-y-3">
              <img
                src={photos[0]!.url}
                alt={photos[0]!.caption ?? listing.title}
                className="aspect-4/3 w-full rounded-xl border border-border/70 object-cover"
              />
              {photos.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {photos.slice(1).map((p) => (
                    <img
                      key={p.id}
                      src={p.url}
                      alt={p.caption ?? listing.title}
                      loading="lazy"
                      className="aspect-square w-full rounded-md border border-border/70 object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid-texture flex aspect-4/3 w-full items-center justify-center rounded-xl border border-border/70 text-sm text-muted-foreground">
              No photos provided
            </div>
          )}

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{categoryLabel(listing.category)}</Badge>
              <Badge variant="outline" className="capitalize">
                {listing.offer_type === "both" ? "Open to both" : listing.offer_type}
              </Badge>
              {!listing.is_available && <Badge variant="outline">Paused</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-bold">{listing.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-display text-lg text-ember">
                {formatValue(listing.estimated_value)}
              </span>
              <span>· {conditionLabel(listing.condition)}</span>
              {listing.quantity && <span>· {listing.quantity}</span>}
              <span>· listed {timeAgo(listing.created_at)}</span>
            </p>

            <p className="mt-5 whitespace-pre-wrap text-muted-foreground">{listing.description}</p>

            {listing.wanted_in_return && (
              <Card className="surface-panel mt-5 border-border/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Wanted in return
                </p>
                <p className="mt-1 text-sm">{listing.wanted_in_return}</p>
              </Card>
            )}

            {listing.location && (
              <p className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" /> {listing.location}
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <Card className="surface-panel border-border/70 p-5">
            {owner ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar className="size-11">
                    {owner.avatar_url && <AvatarImage src={owner.avatar_url} alt="" />}
                    <AvatarFallback>
                      {owner.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{owner.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{owner.handle}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {owner.is_verified && (
                    <Badge variant="outline" className="border-success/40 text-success">
                      <ShieldCheck className="mr-1 size-3" /> Verified
                    </Badge>
                  )}
                  {owner.rating_count > 0 && (
                    <Badge variant="outline" className="border-warning/40 text-warning">
                      <Star className="mr-1 size-3 fill-current" />
                      {owner.rating_avg.toFixed(1)} ({owner.rating_count})
                    </Badge>
                  )}
                  <Badge variant="outline">{owner.trades_completed} trades</Badge>
                </div>
                {owner.bio && (
                  <p className="mt-4 text-sm text-muted-foreground">{owner.bio}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Trader details unavailable.</p>
            )}

            <Separator className="my-5" />

            {isOwner ? (
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">Manage your listing</Link>
              </Button>
            ) : user ? (
              <div className="space-y-2">
                <ProposeTradeDialog listing={listing} />
                <ReportDialog listingId={listing.id} reportedUserId={listing.owner_id} />
              </div>
            ) : (
              <Button asChild className="w-full">
                <Link to="/auth">Sign in to propose a trade</Link>
              </Button>
            )}
          </Card>

          <Card className="surface-panel border-warning/30 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="size-4 text-warning" /> Trade safely
            </p>
            <ul className="mt-3 space-y-2">
              {SCAM_SIGNALS.slice(0, 3).map((s) => (
                <li key={s} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warning" />
                  {s}
                </li>
              ))}
            </ul>
            <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
              <Link to="/safety">Full safety guide</Link>
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
