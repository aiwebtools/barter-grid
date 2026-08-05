import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Plus, X } from "lucide-react";
import { db, type ListingCategory, type ListingCondition, type OfferType } from "@/lib/db";
import { CATEGORIES, CONDITIONS, OFFER_TYPES, PROHIBITED_ITEMS } from "@/lib/barter";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/listings/new")({
  head: () => ({
    meta: [
      { title: "Post a Listing — Offer or Seek a Barter | BarterGrid" },
      {
        name: "description",
        content:
          "Create a barter listing: describe what you're offering or seeking, set condition, estimated value, location and photos.",
      },
      { property: "og:title", content: "Post a Listing — Offer or Seek a Barter | BarterGrid" },
      {
        property: "og:description",
        content: "Describe what you're offering or seeking and let the network find your match.",
      },
    ],
  }),
  component: NewListing,
});

const schema = z.object({
  title: z.string().trim().min(4, "Give it a clear title").max(120),
  description: z.string().trim().min(20, "Describe it in at least 20 characters").max(2000),
  category: z.string().min(1),
  condition: z.string().min(1),
  offer_type: z.string().min(1),
  estimated_value: z.coerce.number().min(0, "Value can't be negative").max(1_000_000),
  quantity: z.string().trim().max(80).optional(),
  wanted_in_return: z.string().trim().max(300).optional(),
  location: z.string().trim().max(120).optional(),
});

function NewListing() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ListingCategory>("tools");
  const [condition, setCondition] = useState<ListingCondition>("good");
  const [offerType, setOfferType] = useState<OfferType>("offering");
  const [value, setValue] = useState("");
  const [quantity, setQuantity] = useState("");
  const [wanted, setWanted] = useState("");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [available, setAvailable] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({
        title,
        description,
        category,
        condition,
        offer_type: offerType,
        estimated_value: value === "" ? 0 : value,
        quantity,
        wanted_in_return: wanted,
        location,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Check the form");
      }
      if (!user) throw new Error("Sign in first");

      const { data, error } = await db
        .from("listings")
        .insert({
          owner_id: user.id,
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          condition: parsed.data.condition,
          offer_type: parsed.data.offer_type,
          estimated_value: parsed.data.estimated_value,
          quantity: parsed.data.quantity || null,
          wanted_in_return: parsed.data.wanted_in_return || null,
          location: parsed.data.location || profile?.location || null,
          latitude: profile?.latitude ?? null,
          longitude: profile?.longitude ?? null,
          is_available: available,
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw error;

      const listingId = (data as { id: string }).id;
      if (photos.length) {
        const { error: photoError } = await db.from("listing_photos").insert(
          photos.map((url, i) => ({ listing_id: listingId, url, sort_order: i })),
        );
        if (photoError) throw photoError;
      }
      return listingId;
    },
    onSuccess: (listingId) => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      toast.success("Listing is live on the grid");
      navigate({ to: "/listings/$listingId", params: { listingId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addPhoto() {
    const url = photoInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Photo links must start with http:// or https://");
      return;
    }
    if (photos.length >= 6) {
      toast.error("Six photos is the limit.");
      return;
    }
    setPhotos((p) => [...p, url]);
    setPhotoInput("");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Post a listing</h1>
      <p className="mt-2 text-muted-foreground">
        Be specific and honest. Clear listings with a real value estimate get matched fastest.
      </p>

      <Alert className="mt-6 border-warning/40 bg-warning/10">
        <ShieldAlert className="size-4" />
        <AlertTitle>Lawful barter only</AlertTitle>
        <AlertDescription>
          Do not list {PROHIBITED_ITEMS[0]?.toLowerCase()}, controlled substances, or anything
          requiring a licence you don't hold.{" "}
          <Link to="/safety" className="underline underline-offset-2">
            Read the full rules
          </Link>
          .
        </AlertDescription>
      </Alert>

      <form
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Card className="surface-panel space-y-5 border-border/70 p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Honda EU2200i inverter generator"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              maxLength={2000}
              rows={5}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What it is, how it's been used, what's included, any faults."
              required
            />
            <p className="text-xs text-muted-foreground">{description.length}/2000</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ListingCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as ListingCondition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {OFFER_TYPES.map((o) => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => setOfferType(o.value)}
                  aria-pressed={offerType === o.value}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    offerType === o.value
                      ? "border-primary bg-primary/10"
                      : "border-border/70 hover:border-primary/40"
                  }`}
                >
                  <p className="text-sm font-medium">{o.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{o.hint}</p>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="surface-panel space-y-5 border-border/70 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="value">Estimated value (USD)</Label>
              <Input
                id="value"
                type="number"
                min={0}
                step={5}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="450"
                required
              />
              <p className="text-xs text-muted-foreground">
                A guide for fair swaps — no money changes hands.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity / units</Label>
              <Input
                id="quantity"
                value={quantity}
                maxLength={80}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1 unit · 12 jars · 4 hours"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wanted">What you want in return</Label>
            <Input
              id="wanted"
              value={wanted}
              maxLength={300}
              onChange={(e) => setWanted(e.target.value)}
              placeholder="Canned protein, chainsaw work, or a water filter"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Pickup area</Label>
            <Input
              id="location"
              value={location}
              maxLength={120}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="West Asheville, NC"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="available">Available now</Label>
              <p className="text-xs text-muted-foreground">
                Turn off to keep the listing up but pause matching.
              </p>
            </div>
            <Switch id="available" checked={available} onCheckedChange={setAvailable} />
          </div>
        </Card>

        <Card className="surface-panel space-y-4 border-border/70 p-6">
          <div className="space-y-2">
            <Label htmlFor="photo">Photos</Label>
            <div className="flex gap-2">
              <Input
                id="photo"
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
                placeholder="https://…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPhoto();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addPhoto}>
                <Plus className="size-4" /> Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste image links — up to six. Listings with photos get roughly twice the proposals.
            </p>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((url, i) => (
                <div key={url + i} className="relative overflow-hidden rounded-md border border-border/70">
                  <img src={url} alt={`Listing photo ${i + 1}`} className="h-24 w-full object-cover" loading="lazy" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded bg-background/80 p-1"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={mutation.isPending}>
            {mutation.isPending ? "Publishing…" : "Publish listing"}
          </Button>
          <Button type="button" size="lg" variant="outline" asChild>
            <Link to="/dashboard">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
