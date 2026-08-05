import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Flag, EyeOff, Eye, CheckCircle2 } from "lucide-react";
import { db, type Report, type Listing } from "@/lib/db";
import { categoryLabel, formatValue, timeAgo } from "@/lib/barter";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Moderation — Flagged Listings & Reports | BarterGrid" },
      {
        name: "description",
        content:
          "Moderator dashboard for BarterGrid: review user reports, flagged listings and prohibited-item escalations.",
      },
      { property: "og:title", content: "Moderation — Flagged Listings & Reports | BarterGrid" },
      {
        property: "og:description",
        content: "Review reports and flagged listings across the exchange network.",
      },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isStaff, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: async () => {
      const { data, error } = await db
        .from("reports")
        .select(
          "*, listing:listings(*), reporter:profiles!reports_reporter_id_fkey(*)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Report[];
    },
    enabled: isStaff,
  });

  const { data: flagged } = useQuery({
    queryKey: ["admin", "flagged"],
    queryFn: async () => {
      const { data, error } = await db
        .from("listings")
        .select("*, owner:profiles!listings_owner_id_fkey(*)")
        .eq("is_flagged", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Listing[];
    },
    enabled: isStaff,
  });

  const setReportStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Report["status"] }) => {
      const { error } = await db.from("reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Report updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setFlag = useMutation({
    mutationFn: async ({ id, is_flagged }: { id: string; is_flagged: boolean }) => {
      const { error } = await db.from("listings").update({ is_flagged }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Listing updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-8">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-bold">Moderators only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is restricted to BarterGrid moderators and admins.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/dashboard">Back to your grid</Link>
        </Button>
      </div>
    );
  }

  const open = (reports ?? []).filter((r) => r.status === "open" || r.status === "reviewing");
  const resolved = (reports ?? []).filter(
    (r) => r.status === "resolved" || r.status === "dismissed",
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Badge variant="outline" className="border-accent/40 text-accent">
        <ShieldCheck className="mr-1 size-3" /> Moderation
      </Badge>
      <h1 className="mt-4 text-3xl font-bold">Trust & safety queue</h1>
      <p className="mt-2 text-muted-foreground">
        Reports and flagged listings across the network. Flagged listings are hidden from search
        until cleared.
      </p>

      <Tabs defaultValue="open" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="open">Open reports ({open.length})</TabsTrigger>
          <TabsTrigger value="flagged">Flagged listings ({flagged?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4 space-y-3">
          {loadingReports ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : open.length ? (
            open.map((r) => (
              <Card key={r.id} className="surface-panel border-border/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Flag className="size-4 text-destructive" />
                      <p className="font-medium">{r.reason}</p>
                      <Badge variant="outline" className="capitalize">
                        {r.status}
                      </Badge>
                    </div>
                    {r.details && (
                      <p className="mt-2 text-sm text-muted-foreground">{r.details}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.reporter?.display_name ?? "A member"} · {timeAgo(r.created_at)}
                      {r.listing?.title ? ` · on "${r.listing.title}"` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.listing_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setFlag.mutate({ id: r.listing_id!, is_flagged: true })
                        }
                      >
                        <EyeOff className="size-4" /> Hide listing
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => setReportStatus.mutate({ id: r.id, status: "resolved" })}
                    >
                      <CheckCircle2 className="size-4" /> Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setReportStatus.mutate({ id: r.id, status: "dismissed" })}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="surface-panel border-border/70 p-12 text-center">
              <ShieldCheck className="mx-auto size-7 text-success" />
              <p className="mt-3 font-semibold">Queue is clear</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No open reports right now. Nice grid.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="flagged" className="mt-4 space-y-3">
          {flagged?.length ? (
            flagged.map((l) => (
              <Card key={l.id} className="surface-panel border-border/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      to="/listings/$listingId"
                      params={{ listingId: l.id }}
                      className="font-medium hover:text-primary"
                    >
                      {l.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {categoryLabel(l.category)} · {formatValue(l.estimated_value)} ·{" "}
                      {l.owner?.display_name ?? "unknown owner"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFlag.mutate({ id: l.id, is_flagged: false })}
                  >
                    <Eye className="size-4" /> Restore to search
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="surface-panel border-border/70 p-12 text-center text-sm text-muted-foreground">
              No listings are currently hidden.
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4 space-y-3">
          {resolved.length ? (
            resolved.map((r) => (
              <Card key={r.id} className="surface-panel border-border/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm">{r.reason}</p>
                  <Badge variant="outline" className="capitalize">
                    {r.status}
                  </Badge>
                </div>
              </Card>
            ))
          ) : (
            <Card className="surface-panel border-border/70 p-12 text-center text-sm text-muted-foreground">
              Nothing resolved yet.
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
