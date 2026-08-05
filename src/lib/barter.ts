import type { Listing, ListingCategory, ListingCondition, OfferType } from "./db";

export const CATEGORIES: { value: ListingCategory; label: string; blurb: string }[] = [
  { value: "food", label: "Food & Seeds", blurb: "Preserves, staples, produce, seed stock" },
  { value: "water", label: "Water", blurb: "Filtration, storage, purification" },
  { value: "tools", label: "Tools", blurb: "Hand tools, power tools, hardware" },
  { value: "equipment", label: "Equipment", blurb: "Generators, machinery, gear" },
  { value: "skills", label: "Skills & Teaching", blurb: "Workshops, training, know-how" },
  { value: "services", label: "Services", blurb: "Repair, labor, trades work" },
  { value: "medical", label: "Medical & First Aid", blurb: "Supplies and lawful first-aid kit" },
  { value: "shelter", label: "Shelter", blurb: "Tarps, insulation, building material" },
  { value: "energy", label: "Power & Energy", blurb: "Solar, batteries, fuel systems" },
  { value: "transport", label: "Transport", blurb: "Hauling, rides, vehicle access" },
  { value: "clothing", label: "Clothing & Textiles", blurb: "Warm layers, boots, mending" },
  { value: "other", label: "Other", blurb: "Anything else lawful to barter" },
];

export const CONDITIONS: { value: ListingCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "worn", label: "Well worn" },
  { value: "na", label: "Not applicable" },
];

export const OFFER_TYPES: { value: OfferType; label: string; hint: string }[] = [
  { value: "offering", label: "Offering", hint: "I have this to trade away" },
  { value: "seeking", label: "Seeking", hint: "I need this from the network" },
  { value: "both", label: "Open to both", hint: "I'll trade either direction" },
];

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

export function conditionLabel(value: string): string {
  return CONDITIONS.find((c) => c.value === value)?.label ?? "—";
}

export function formatValue(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Great-circle distance in miles. */
export function distanceMiles(
  a: { latitude: number | null; longitude: number | null },
  b: { latitude: number | null; longitude: number | null },
): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return null;
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Categories that commonly trade well against each other. */
const AFFINITY: Partial<Record<ListingCategory, ListingCategory[]>> = {
  food: ["water", "services", "skills", "transport"],
  water: ["food", "energy", "tools"],
  tools: ["services", "equipment", "energy", "water"],
  equipment: ["tools", "services", "energy", "transport"],
  skills: ["food", "services", "medical", "clothing"],
  services: ["food", "tools", "energy", "transport"],
  medical: ["skills", "food", "water", "clothing"],
  shelter: ["tools", "clothing", "transport"],
  energy: ["tools", "equipment", "services", "water"],
  transport: ["food", "services", "equipment", "shelter"],
  clothing: ["food", "skills", "medical"],
  other: ["tools", "food", "services"],
};

export interface MatchSuggestion {
  mine: Listing;
  theirs: Listing;
  score: number;
  reasons: string[];
  valueGap: number;
  distance: number | null;
}

/**
 * Heuristic fair-trade matcher: pairs what a member is offering against what
 * other members are seeking (and vice versa), scoring on value parity,
 * category compatibility and proximity.
 */
export function suggestMatches(
  myListings: Listing[],
  networkListings: Listing[],
  options: { maxDistance?: number | null } = {},
): MatchSuggestion[] {
  const results: MatchSuggestion[] = [];

  for (const mine of myListings) {
    if (mine.status !== "active" || !mine.is_available) continue;

    for (const theirs of networkListings) {
      if (theirs.owner_id === mine.owner_id) continue;
      if (!theirs.is_available) continue;

      const mineGives = mine.offer_type !== "seeking";
      const mineWants = mine.offer_type !== "offering";
      const theyGive = theirs.offer_type !== "seeking";
      const theyWant = theirs.offer_type !== "offering";
      const directionOk = (mineGives && theyWant) || (mineWants && theyGive);
      if (!directionOk) continue;

      const reasons: string[] = [];
      let score = 0;

      const myValue = Number(mine.estimated_value) || 0;
      const theirValue = Number(theirs.estimated_value) || 0;
      const gap = Math.abs(myValue - theirValue);
      const larger = Math.max(myValue, theirValue, 1);
      const parity = 1 - Math.min(gap / larger, 1);
      score += parity * 50;
      if (parity > 0.85) reasons.push(`Values are within ${formatValue(gap)} — near-even swap`);
      else if (parity > 0.6) reasons.push(`Close on value, ${formatValue(gap)} to balance out`);
      else reasons.push(`Value gap of ${formatValue(gap)} — add a sweetener or hours of labor`);

      if (mine.category === theirs.category) {
        score += 14;
        reasons.push(`Same category (${categoryLabel(mine.category)})`);
      } else if (AFFINITY[mine.category]?.includes(theirs.category)) {
        score += 22;
        reasons.push(
          `${categoryLabel(mine.category)} trades well against ${categoryLabel(theirs.category)}`,
        );
      } else {
        score += 6;
      }

      const dist = distanceMiles(mine, theirs);
      if (dist != null) {
        if (options.maxDistance && dist > options.maxDistance) continue;
        const proximity = Math.max(0, 1 - dist / 60);
        score += proximity * 20;
        reasons.push(`${dist < 1 ? "Under a mile" : `${dist.toFixed(1)} miles`} away`);
      } else {
        score += 6;
      }

      const owner = theirs.owner;
      if (owner) {
        if (owner.is_verified) {
          score += 5;
          reasons.push("Verified trader");
        }
        if (owner.rating_avg >= 4.5 && owner.rating_count >= 3) {
          score += 5;
          reasons.push(`${owner.rating_avg.toFixed(1)}★ across ${owner.rating_count} trades`);
        }
        if (owner.rating_count >= 3 && owner.rating_avg < 3) {
          score -= 25;
          reasons.push("Low reputation — proceed carefully");
        }
      }

      const wanted = (mine.wanted_in_return ?? "").toLowerCase();
      if (wanted && theirs.title.toLowerCase().split(/\W+/).some((w) => w.length > 3 && wanted.includes(w))) {
        score += 10;
        reasons.push("Matches what you asked for in return");
      }

      results.push({
        mine,
        theirs,
        score: Math.max(0, Math.min(100, Math.round(score))),
        reasons: reasons.slice(0, 4),
        valueGap: gap,
        distance: dist,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export const PROHIBITED_ITEMS = [
  "Firearms, ammunition, and explosives",
  "Prescription or controlled substances",
  "Stolen, counterfeit, or recalled goods",
  "Live animals or regulated wildlife",
  "Hazardous or unlabeled chemicals",
  "Anything requiring a licence you do not hold",
];

export const SCAM_SIGNALS = [
  "Asks for a wire transfer, gift card, or crypto deposit before a meetup",
  "Refuses to meet in a public place or let you inspect the goods",
  "Pressures you to decide immediately or move off BarterGrid",
  "Brand-new account with no ratings offering unusually high value",
  "Price or value that is far too good for the item described",
];
