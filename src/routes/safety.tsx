import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, ShieldCheck, Ban, Scale } from "lucide-react";
import { PROHIBITED_ITEMS, SCAM_SIGNALS } from "@/lib/barter";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety, Scam Warnings & Trading Rules | BarterGrid" },
      {
        name: "description",
        content:
          "How to barter safely: scam warning signs, prohibited items, meeting guidance, reporting, and the lawful-exchange rules every BarterGrid member agrees to.",
      },
      { property: "og:title", content: "Safety, Scam Warnings & Trading Rules | BarterGrid" },
      {
        property: "og:description",
        content:
          "Scam warning signs, prohibited items, safe meeting guidance and reporting on BarterGrid.",
      },
    ],
  }),
  component: Safety,
});

const MEETING_RULES = [
  "Meet in a public, well-lit place — many police stations offer exchange zones.",
  "Bring a second person, and tell someone else where you are going and when.",
  "Inspect and test goods before you hand over your side of the trade.",
  "Keep the negotiation inside BarterGrid so moderators can see the record.",
  "Trade at the same time — never ship first on the promise of a return.",
];

function Safety() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Badge variant="outline" className="border-accent/40 text-accent">
        <ShieldCheck className="mr-1 size-3" /> Trust & safety
      </Badge>
      <h1 className="mt-4 text-3xl font-bold md:text-4xl">Trade safely, trade lawfully</h1>
      <p className="mt-3 text-muted-foreground">
        BarterGrid works because members can trust each other. These are the rules and the habits
        that keep the network usable when things get difficult.
      </p>

      <Alert className="mt-8 border-destructive/40 bg-destructive/10">
        <ShieldAlert className="size-4" />
        <AlertTitle>Lawful barter and community exchange only</AlertTitle>
        <AlertDescription>
          BarterGrid is not a payments platform, a lender, or an emergency service. Members are
          responsible for complying with local law, licensing, and any tax obligations on the value
          of what they trade. In a life-threatening emergency, contact your local emergency number
          first.
        </AlertDescription>
      </Alert>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ShieldAlert className="size-5 text-warning" /> Scam warning signs
        </h2>
        <Card className="surface-panel mt-4 border-border/70 p-6">
          <ul className="space-y-3">
            {SCAM_SIGNALS.map((s) => (
              <li key={s} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Ban className="size-5 text-destructive" /> Prohibited items
        </h2>
        <Card className="surface-panel mt-4 border-border/70 p-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {PROHIBITED_ITEMS.map((item) => (
              <li key={item} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-destructive" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-muted-foreground">
            Found one on the grid? Use the report button on the listing — flagged listings are
            pulled from search while moderators review them.
          </p>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ShieldCheck className="size-5 text-success" /> Meeting and handover
        </h2>
        <Card className="surface-panel mt-4 border-border/70 p-6">
          <ol className="space-y-3">
            {MEETING_RULES.map((rule, i) => (
              <li key={rule} className="flex gap-3 text-sm">
                <span className="font-mono text-xs text-primary">0{i + 1}</span>
                <span className="text-muted-foreground">{rule}</span>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Scale className="size-5 text-accent" /> What counts as a fair trade
        </h2>
        <Card className="surface-panel mt-4 border-border/70 p-6 text-sm text-muted-foreground">
          <p>
            Estimated values exist to keep swaps honest, not to set a price. A trade is fair when
            both sides say it is. If one side is short, close the gap with hours of labour, a
            second item, or an agreed follow-up — and write it into the proposal so the record is
            clear.
          </p>
        </Card>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/marketplace">Browse the marketplace</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/listings/new">Post a listing</Link>
        </Button>
      </div>
    </div>
  );
}
