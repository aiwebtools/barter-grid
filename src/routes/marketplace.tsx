import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, PackageOpen } from "lucide-react";
import { fetchListings, type ListingCategory, type ListingCondition, type OfferType } from "@/lib/db";
import { CATEGORIES, CONDITIONS, OFFER_TYPES, distanceMiles } from "@/lib/barter";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";
import { useAuth } from "@/hooks/use-auth";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/marketplace")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Marketplace — Browse Barter Listings | BarterGrid" },
      {
        name: "description",
        content:
          "Search barter listings by category, condition, distance and availability. Tools, food, water, energy, medical supplies, skills and services.",
      },
      { property: "og:title", content: "Marketplace — Browse Barter Listings | BarterGrid" },
      {
        property: "og:description",
        content:
          "Search barter listings by category, condition, distance and availability across your local exchange network.",
      },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  const { category: initialCategory } = Route.useSearch();
  const { profile } = useAuth();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ListingCategory | "all">(
    (initialCategory as ListingCategory) ?? "all",
  );
  const [condition, setCondition] = useState<ListingCondition | "all">("all");
  const [offerType, setOfferType] = useState<OfferType | "all">("all");
  const [availableOnly, setAvailableOnly] = useState(true);
  const [maxDistance, setMaxDistance] = useState(100);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["listings", { category, condition, offerType, availableOnly, search }],
    queryFn: () =>
      fetchListings({ category, condition, offerType, availableOnly, search }),
  });

  const origin = profile ?? { latitude: 35.5951, longitude: -82.5515 };

  const listings = useMemo(() => {
    if (!data) return [];
    if (maxDistance >= 100) return data;
    return data.filter((l) => {
      const d = distanceMiles(origin, l);
      return d == null || d <= maxDistance;
    });
  }, [data, maxDistance, origin]);

  function resetFilters() {
    setSearch("");
    setCategory("all");
    setCondition("all");
    setOfferType("all");
    setAvailableOnly(true);
    setMaxDistance(100);
  }

  const filterPanel = (
    <Card className="surface-panel space-y-5 border-border/70 p-5">
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as ListingCategory | "all")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Direction</Label>
        <Select value={offerType} onValueChange={(v) => setOfferType(v as OfferType | "all")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everything</SelectItem>
            {OFFER_TYPES.filter((o) => o.value !== "both").map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Condition</Label>
        <Select
          value={condition}
          onValueChange={(v) => setCondition(v as ListingCondition | "all")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any condition</SelectItem>
            {CONDITIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Distance</Label>
          <span className="font-mono text-xs text-muted-foreground">
            {maxDistance >= 100 ? "Any" : `${maxDistance} mi`}
          </span>
        </div>
        <Slider
          value={[maxDistance]}
          min={5}
          max={100}
          step={5}
          onValueChange={([v]) => setMaxDistance(v ?? 100)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="available">Available only</Label>
        <Switch id="available" checked={availableOnly} onCheckedChange={setAvailableOnly} />
      </div>

      <Button variant="ghost" className="w-full" onClick={resetFilters}>
        Reset filters
      </Button>
    </Card>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="mt-2 text-muted-foreground">
          Everything the network is offering and seeking right now.
        </p>
      </header>

      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools, seeds, solar, mechanics…"
            className="pl-9"
            aria-label="Search listings"
          />
        </div>
        <Button
          variant="outline"
          className="lg:hidden"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="size-4" /> Filters
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className={showFilters ? "block" : "hidden lg:block"}>{filterPanel}</aside>

        <section>
          {isError && (
            <Card className="border-destructive/40 p-8 text-center">
              <p className="font-medium">We couldn't load listings.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check your connection and try again.
              </p>
            </Card>
          )}

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          ) : listings.length ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {listings.length} listing{listings.length === 1 ? "" : "s"}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            </>
          ) : (
            <Card className="surface-panel flex flex-col items-center gap-3 border-border/70 p-12 text-center">
              <PackageOpen className="size-8 text-muted-foreground" />
              <p className="font-semibold">Nothing matches those filters yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Widen your distance, clear a filter, or post what you're seeking so the network can
                come to you.
              </p>
              <Button variant="outline" onClick={resetFilters}>
                Reset filters
              </Button>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
