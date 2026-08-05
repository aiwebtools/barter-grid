import { Link } from "@tanstack/react-router";
import { Grid2x2Check } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
                <Grid2x2Check className="size-4" />
              </span>
              <span className="font-display text-base font-bold">BarterGrid</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A neighbourhood barter and mutual-aid exchange built for disruption: goods, tools,
              food, skills and services moving between people who need them.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-10 gap-y-3 text-sm">
            <Link to="/marketplace" className="text-muted-foreground hover:text-foreground">
              Marketplace
            </Link>
            <Link to="/matches" className="text-muted-foreground hover:text-foreground">
              AI Matches
            </Link>
            <Link to="/trades" className="text-muted-foreground hover:text-foreground">
              Trades
            </Link>
            <Link to="/safety" className="text-muted-foreground hover:text-foreground">
              Safety & rules
            </Link>
          </nav>
        </div>

        <p className="mt-8 border-t border-border/60 pt-6 text-xs leading-relaxed text-muted-foreground">
          BarterGrid supports lawful barter and community exchange only. It is not a payments
          platform, a lender, or an emergency service. Members are responsible for complying with
          local law, licensing, and tax obligations on the value of what they trade. In a
          life-threatening emergency, contact your local emergency number first.
        </p>
      </div>
    </footer>
  );
}
