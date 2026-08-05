import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  HandHeart,
  Wrench,
  Droplets,
  Sprout,
  BatteryCharging,
} from "lucide-react";
import { fetchListings } from "@/lib/db";
import { CATEGORIES } from "@/lib/barter";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BarterGrid — Barter & Mutual Aid Exchange for Resilient Communities" },
      {
        name: "description",
        content:
          "Swap tools, food, water, energy gear, skills and services with neighbours. AI-matched fair trades, reputation you can trust, no cash required.",
      },
      {
        property: "og:title",
        content: "BarterGrid — Barter & Mutual Aid Exchange for Resilient Communities",
      },
      {
        property: "og:description",
        content:
          "Swap tools, food, water, energy gear, skills and services with neighbours. AI-matched fair trades and a reputation system you can trust.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: Sprout,
    title: "List what you have and what you need",
    body: "Items, tools, food stores, equipment, skills or hours of labour. Set an honest estimated value so trades stay fair.",
  },
  {
    icon: Sparkles,
    title: "Let the matcher find the fair swap",
    body: "BarterGrid scores every possible pairing on value parity, category compatibility and how close you actually are.",
  },
  {
    icon: HandHeart,
    title: "Negotiate, meet, and rate",
    body: "Counteroffer in a private thread, agree in the open, then mark the trade complete and build verified reputation.",
  },
];

const PILLARS = [
  { icon: Droplets, label: "Water & filtration" },
  { icon: Sprout, label: "Food & seed stock" },
  { icon: Wrench, label: "Tools & repair" },
  { icon: BatteryCharging, label: "Power & energy" },
];

function Landing() {
  const { data: listings, isLoading } = useQuery({
    queryKey: ["listings", "featured"],
    queryFn: () => fetchListings({ limit: 6 }),
  });

  return (
    <div>
      {/* Hero */}
      <section className="grid-texture relative overflow-hidden border-b border-border/70">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.735_0.163_55/0.16),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <Badge variant="outline" className="border-primary/40 text-primary">
              Built for disruption, useful every day
            </Badge>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] md:text-6xl">
              When money gets scarce,{" "}
              <span className="text-ember">what you have still has value.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              BarterGrid is a barter and mutual-aid exchange network for neighbourhoods. Trade
              items, tools, food, water, skills, services and equipment directly — matched by fair
              value, verified by reputation, and kept lawful by design.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/marketplace">
                  Browse the grid <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Join the network</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
              {PILLARS.map((p) => (
                <div key={p.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <p.icon className="size-4 text-accent" />
                  {p.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <h2 className="text-2xl font-bold md:text-3xl">Three steps to a fair swap</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="surface-panel border-border/70 p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-md bg-primary/15 text-primary">
                  <step.icon className="size-4" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Live listings */}
      <section className="border-y border-border/70 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Moving on the grid right now</h2>
              <p className="mt-2 text-muted-foreground">
                Real offers from members within trading distance.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/marketplace">See everything</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)
              : (listings ?? []).map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-aut mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold md:text-3xl">What the network trades</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.value}
              to="/marketplace"
              search={{ category: c.value }}
              className="rounded-lg border border-border/70 bg-card/50 p-4 transition-colors hover:border-primary/50 hover:bg-card"
            >
              <p className="font-semibold">{c.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-border/70 bg-card/30">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <Badge variant="outline" className="border-accent/40 text-accent">
              <ShieldCheck className="mr-1 size-3" /> Trust and safety
            </Badge>
            <h2 className="mt-4 text-2xl font-bold md:text-3xl">
              Reputation is the currency here
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every completed trade can be rated. Verified traders earn badges, scam patterns get
              flagged fast, and moderators review every report. Prohibited items are refused
              outright — BarterGrid supports lawful barter and community exchange only.
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link to="/safety">Read the safety guide</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Verified traders", "Identity and trade history checked before the badge appears."],
              ["Scam warnings", "Advance-payment and off-platform patterns are called out inline."],
              ["Report in one tap", "Flag prohibited items or bad actors from any listing."],
              ["Moderated queue", "Flagged listings are pulled from search pending review."],
            ].map(([title, body]) => (
              <Card key={title} className="surface-panel border-border/70 p-5">
                <p className="font-semibold">{title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
