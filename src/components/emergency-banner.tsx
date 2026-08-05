import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="border-b border-warning/30 bg-warning/10">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
        <p className="text-foreground/90">
          <span className="font-semibold text-warning">Emergency mode active.</span> Regional
          supply disruption reported. Water, food, medical and energy listings are prioritised in
          search.{" "}
          <Link to="/safety" className="font-medium underline underline-offset-2">
            Read the safe-trading guidance
          </Link>
          .
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-7 shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss emergency notice"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
