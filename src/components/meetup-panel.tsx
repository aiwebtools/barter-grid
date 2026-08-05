import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, MapPin, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { db, fetchMeetups, type Meetup, type MeetupStatus } from "@/lib/db";

const STATUS_STYLE: Record<MeetupStatus, string> = {
  proposed: "border-warning/40 text-warning",
  confirmed: "border-success/40 text-success",
  completed: "border-success/40 text-success",
  declined: "border-destructive/40 text-destructive",
  cancelled: "border-border text-muted-foreground",
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function defaultLocalValue() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MeetupPanel({ proposalId, userId }: { proposalId: string; userId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState(defaultLocalValue);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const { data: meetups } = useQuery({
    queryKey: ["meetups", proposalId],
    queryFn: () => fetchMeetups(proposalId),
  });

  const propose = useMutation({
    mutationFn: async () => {
      const place = location.trim();
      if (place.length < 3) throw new Error("Add a public meeting place.");
      if (place.length > 200) throw new Error("Keep the location under 200 characters.");
      const at = new Date(when);
      if (Number.isNaN(at.getTime())) throw new Error("Pick a valid date and time.");
      if (at.getTime() < Date.now() - 60_000) throw new Error("Pick a time in the future.");
      const { error } = await db.from("meetups").insert({
        proposal_id: proposalId,
        created_by: userId,
        scheduled_at: at.toISOString(),
        location: place,
        notes: notes.trim() ? notes.trim().slice(0, 500) : null,
      });
      if (error) throw error;
      await db.from("messages").insert({
        proposal_id: proposalId,
        sender_id: userId,
        body: `📅 Meetup proposed: ${formatWhen(at.toISOString())} at ${place}`,
      });
    },
    onSuccess: () => {
      setOpen(false);
      setLocation("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["meetups", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["messages", proposalId] });
      toast.success("Meetup proposed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ meetup, status }: { meetup: Meetup; status: MeetupStatus }) => {
      const { error } = await db.from("meetups").update({ status }).eq("id", meetup.id);
      if (error) throw error;
      await db.from("messages").insert({
        proposal_id: proposalId,
        sender_id: userId,
        body: `📅 Meetup ${status}: ${formatWhen(meetup.scheduled_at)} at ${meetup.location}`,
      });
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["meetups", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["messages", proposalId] });
      toast.success(`Meetup ${status}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="surface-panel mt-6 border-border/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <CalendarClock className="size-4 text-primary" /> Meetup
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Agree a time and a public place. Daylight, busy spots, bring a friend.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Propose a time
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Propose a meetup</DialogTitle>
              <DialogDescription>
                The other trader can confirm or decline. Both of you see it here.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meet-when">Date &amp; time</Label>
                <Input
                  id="meet-when"
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meet-where">Public meeting place</Label>
                <Input
                  id="meet-where"
                  maxLength={200}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Riverside Library car park, north entrance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meet-notes">Notes (optional)</Label>
                <Textarea
                  id="meet-notes"
                  rows={3}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="I'll be in a grey pickup. Bring the spare chain."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => propose.mutate()} disabled={propose.isPending}>
                {propose.isPending ? "Sending…" : "Propose meetup"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-5 space-y-3">
        {meetups?.length ? (
          meetups.map((m) => {
            const mine = m.created_by === userId;
            return (
              <div key={m.id} className="rounded-lg border border-border/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{formatWhen(m.scheduled_at)}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" /> {m.location}
                    </p>
                    {m.notes && <p className="mt-2 text-sm text-muted-foreground">{m.notes}</p>}
                  </div>
                  <Badge variant="outline" className={`capitalize ${STATUS_STYLE[m.status]}`}>
                    {m.status}
                  </Badge>
                </div>
                {m.status === "proposed" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!mine && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setStatus.mutate({ meetup: m, status: "confirmed" })}
                          disabled={setStatus.isPending}
                        >
                          <Check className="size-4" /> Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus.mutate({ meetup: m, status: "declined" })}
                          disabled={setStatus.isPending}
                        >
                          <X className="size-4" /> Decline
                        </Button>
                      </>
                    )}
                    {mine && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatus.mutate({ meetup: m, status: "cancelled" })}
                        disabled={setStatus.isPending}
                      >
                        Cancel proposal
                      </Button>
                    )}
                  </div>
                )}
                {m.status === "confirmed" && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus.mutate({ meetup: m, status: "completed" })}
                      disabled={setStatus.isPending}
                    >
                      Mark met
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No meetup scheduled yet. Propose a time and a public place.
          </p>
        )}
      </div>
    </Card>
  );
}
