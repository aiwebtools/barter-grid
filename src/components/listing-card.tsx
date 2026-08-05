import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Star, BadgeCheck, ArrowLeftRight, Search } from "lucide-react";
import { categoryLabel, conditionLabel, formatValue, timeAgo } from "@/lib/barter";
import type { Listing } from "@/lib/db";

function OfferBadge({ type }: { type: Listing["offer_type"] }) {
  if (type === "seeking") {
    return (
      <Badge variant="outline" className="border-accent/50 text-accent">
        <Search className="mr-1 size-3" /> Seeking
      </Badge>
    );
  }
  if (type === "both") {
    return (
      <Badge variant="outline" className="border-warning/50 text-warning">
        <ArrowLeftRight className="mr-1 size-3" /> Open both ways
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-success/50 text-success">
      Offering
    </Badge>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  const photo = listing.listing_photos?.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
  const owner = listing.owner;

  return (
    <Link to="/listings/$listingId" params={{ listingId: listing.id }} className="group block">
      <Card className="surface-panel h-full overflow-hidden border-border/70 p-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/50">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {photo ? (
            <img
              src={photo.url}
              alt={photo.caption ?? listing.title}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid-texture flex size-full items-center justify-center text-xs text-muted-foreground">
              No photo provided
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <OfferBadge type={listing.offer_type} />
          </div>
          {!listing.is_available && (
            <div className="absolute right-3 top-3">
              <Badge variant="secondary">On hold</Badge>
            </div>
          )}
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug">{listing.title}</h3>
            <span className="shrink-0 font-mono text-sm font-semibold text-primary">
              {formatValue(listing.estimated_value)}
            </span>
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">{listing.description}</p>

          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge variant="secondary">{categoryLabel(listing.category)}</Badge>
            {listing.condition !== "na" && (
              <Badge variant="secondary">{conditionLabel(listing.condition)}</Badge>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="size-6">
                <AvatarImage src={owner?.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-[10px]">
                  {owner?.display_name?.slice(0, 2).toUpperCase() ?? "??"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-xs text-muted-foreground">
                {owner?.display_name ?? "Member"}
              </span>
              {owner?.is_verified && <BadgeCheck className="size-3.5 shrink-0 text-accent" />}
              {!!owner?.rating_count && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Star className="size-3 fill-warning text-warning" />
                  {Number(owner.rating_avg).toFixed(1)}
                </span>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(listing.created_at)}</span>
          </div>

          {listing.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {listing.location}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <Card className="surface-panel h-full overflow-hidden border-border/70 p-0">
      <div className="aspect-[16/10] animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
      </div>
    </Card>
  );
}
