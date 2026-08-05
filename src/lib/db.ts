import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * The generated Database types are regenerated asynchronously after migrations.
 * We use an untyped view of the client so app code stays stable, and keep our
 * own hand-written row types below as the source of truth for the UI.
 */
export const db = supabase as unknown as SupabaseClient;

export type ListingCategory =
  | "food"
  | "water"
  | "tools"
  | "equipment"
  | "skills"
  | "services"
  | "medical"
  | "shelter"
  | "energy"
  | "transport"
  | "clothing"
  | "other";

export type ListingCondition = "new" | "like_new" | "good" | "fair" | "worn" | "na";
export type OfferType = "offering" | "seeking" | "both";
export type ListingStatus = "active" | "pending" | "traded" | "archived";
export type ProposalStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  trades_completed: number;
  rating_avg: number;
  rating_count: number;
  emergency_mode: boolean;
  is_suspended: boolean;
  created_at: string;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
}

export interface Listing {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: ListingCategory;
  condition: ListingCondition;
  offer_type: OfferType;
  estimated_value: number;
  quantity: string | null;
  wanted_in_return: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  is_available: boolean;
  status: ListingStatus;
  is_flagged: boolean;
  created_at: string;
  owner?: Profile | null;
  listing_photos?: ListingPhoto[];
}

export interface TradeProposal {
  id: string;
  proposer_id: string;
  recipient_id: string;
  requested_listing_id: string;
  offered_listing_id: string | null;
  offer_summary: string | null;
  message: string | null;
  value_adjustment: number;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  requested_listing?: Listing | null;
  offered_listing?: Listing | null;
  proposer?: Profile | null;
  recipient?: Profile | null;
}

export interface TradeMessage {
  id: string;
  proposal_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: Profile | null;
}

export interface Rating {
  id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  comment: string | null;
  was_reliable: boolean;
  created_at: string;
  rater?: Profile | null;
}

export interface Report {
  id: string;
  reporter_id: string | null;
  listing_id: string | null;
  reported_user_id: string | null;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  listing?: Listing | null;
  reporter?: Profile | null;
}

export const LISTING_SELECT =
  "*, owner:profiles!listings_owner_id_fkey(*), listing_photos(*)";

export async function fetchListings(options: {
  category?: ListingCategory | "all";
  condition?: ListingCondition | "all";
  offerType?: OfferType | "all";
  availableOnly?: boolean;
  search?: string;
  ownerId?: string;
  limit?: number;
}): Promise<Listing[]> {
  let query = db
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .eq("is_flagged", false)
    .order("created_at", { ascending: false });

  if (options.category && options.category !== "all") query = query.eq("category", options.category);
  if (options.condition && options.condition !== "all")
    query = query.eq("condition", options.condition);
  if (options.offerType && options.offerType !== "all") {
    query = query.in("offer_type", [options.offerType, "both"]);
  }
  if (options.availableOnly) query = query.eq("is_available", true);
  if (options.ownerId) query = query.eq("owner_id", options.ownerId);
  if (options.search && options.search.trim()) {
    const term = options.search.trim().replace(/[%,()]/g, " ");
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Listing[];
}

export async function fetchListing(id: string): Promise<Listing | null> {
  const { data, error } = await db.from("listings").select(LISTING_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Listing) ?? null;
}

export async function fetchMyListings(userId: string): Promise<Listing[]> {
  const { data, error } = await db
    .from("listings")
    .select(LISTING_SELECT)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Listing[];
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function fetchRatings(userId: string): Promise<Rating[]> {
  const { data, error } = await db
    .from("ratings")
    .select("*, rater:profiles!ratings_rater_id_fkey(*)")
    .eq("ratee_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Rating[];
}

const PROPOSAL_SELECT = `*,
  requested_listing:listings!trade_proposals_requested_listing_id_fkey(${LISTING_SELECT}),
  offered_listing:listings!trade_proposals_offered_listing_id_fkey(${LISTING_SELECT}),
  proposer:profiles!trade_proposals_proposer_id_fkey(*),
  recipient:profiles!trade_proposals_recipient_id_fkey(*)`;

export async function fetchProposals(userId: string): Promise<TradeProposal[]> {
  const { data, error } = await db
    .from("trade_proposals")
    .select(PROPOSAL_SELECT)
    .or(`proposer_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TradeProposal[];
}

export async function fetchProposal(id: string): Promise<TradeProposal | null> {
  const { data, error } = await db
    .from("trade_proposals")
    .select(PROPOSAL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as TradeProposal) ?? null;
}

export async function fetchMessages(proposalId: string): Promise<TradeMessage[]> {
  const { data, error } = await db
    .from("messages")
    .select("*, sender:profiles!messages_sender_id_fkey(*)")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TradeMessage[];
}

/* ---------- Meetups ---------- */

export type MeetupStatus = "proposed" | "confirmed" | "declined" | "cancelled" | "completed";

export interface Meetup {
  id: string;
  proposal_id: string;
  created_by: string;
  scheduled_at: string;
  location: string;
  notes: string | null;
  status: MeetupStatus;
  created_at: string;
  updated_at: string;
}

export async function fetchMeetups(proposalId: string): Promise<Meetup[]> {
  const { data, error } = await db
    .from("meetups")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Meetup[];
}

/* ---------- Crypto settlements ---------- */

export type CryptoPaymentStatus = "requested" | "sent" | "confirmed" | "cancelled";

export interface CryptoPayment {
  id: string;
  proposal_id: string;
  requested_by: string;
  payer_id: string;
  payee_id: string;
  chain: string;
  asset: string;
  amount: number;
  wallet_address: string;
  memo: string | null;
  tx_hash: string | null;
  status: CryptoPaymentStatus;
  created_at: string;
  updated_at: string;
}

export async function fetchCryptoPayments(proposalId: string): Promise<CryptoPayment[]> {
  const { data, error } = await db
    .from("crypto_payments")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CryptoPayment[];
}
