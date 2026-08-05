
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','moderator','member');
CREATE TYPE public.listing_category AS ENUM ('food','water','tools','equipment','skills','services','medical','shelter','energy','transport','clothing','other');
CREATE TYPE public.listing_condition AS ENUM ('new','like_new','good','fair','worn','na');
CREATE TYPE public.offer_type AS ENUM ('offering','seeking','both');
CREATE TYPE public.listing_status AS ENUM ('active','pending','traded','archived');
CREATE TYPE public.proposal_status AS ENUM ('pending','countered','accepted','rejected','completed','cancelled');
CREATE TYPE public.report_status AS ENUM ('open','reviewing','resolved','dismissed');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  trades_completed INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  emergency_mode BOOLEAN NOT NULL DEFAULT false,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','moderator'));
$$;

CREATE POLICY "Profiles are publicly viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_staff(auth.uid())) WITH CHECK (auth.uid() = id OR public.is_staff(auth.uid()));

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- LISTINGS
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category public.listing_category NOT NULL DEFAULT 'other',
  condition public.listing_condition NOT NULL DEFAULT 'good',
  offer_type public.offer_type NOT NULL DEFAULT 'offering',
  estimated_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity TEXT,
  wanted_in_return TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_available BOOLEAN NOT NULL DEFAULT true,
  status public.listing_status NOT NULL DEFAULT 'active',
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active listings are public" ON public.listings FOR SELECT USING (status = 'active' AND is_flagged = false);
CREATE POLICY "Owners and staff read all listings" ON public.listings FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Owners create listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update listings" ON public.listings FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.is_staff(auth.uid())) WITH CHECK (owner_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Owners delete listings" ON public.listings FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.is_staff(auth.uid()));

-- LISTING PHOTOS
CREATE TABLE public.listing_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listing_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_photos TO authenticated;
GRANT ALL ON public.listing_photos TO service_role;
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photos public" ON public.listing_photos FOR SELECT USING (true);
CREATE POLICY "Owners manage photos" ON public.listing_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (l.owner_id = auth.uid() OR public.is_staff(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.owner_id = auth.uid()));

-- TRADE PROPOSALS
CREATE TABLE public.trade_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  offered_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  offer_summary TEXT,
  message TEXT,
  value_adjustment NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.proposal_status NOT NULL DEFAULT 'pending',
  parent_proposal_id UUID REFERENCES public.trade_proposals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_proposals TO authenticated;
GRANT ALL ON public.trade_proposals TO service_role;
ALTER TABLE public.trade_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read proposals" ON public.trade_proposals FOR SELECT TO authenticated USING (proposer_id = auth.uid() OR recipient_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Users create proposals" ON public.trade_proposals FOR INSERT TO authenticated WITH CHECK (proposer_id = auth.uid());
CREATE POLICY "Participants update proposals" ON public.trade_proposals FOR UPDATE TO authenticated USING (proposer_id = auth.uid() OR recipient_id = auth.uid()) WITH CHECK (proposer_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Proposer deletes proposals" ON public.trade_proposals FOR DELETE TO authenticated USING (proposer_id = auth.uid());

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.trade_proposals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.trade_proposals p WHERE p.id = proposal_id AND (p.proposer_id = auth.uid() OR p.recipient_id = auth.uid() OR public.is_staff(auth.uid())))
);
CREATE POLICY "Participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.trade_proposals p WHERE p.id = proposal_id AND (p.proposer_id = auth.uid() OR p.recipient_id = auth.uid()))
);

-- RATINGS
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.trade_proposals(id) ON DELETE SET NULL,
  rater_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  was_reliable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ratings TO anon;
GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ratings public" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Traders rate" ON public.ratings FOR INSERT TO authenticated WITH CHECK (rater_id = auth.uid());

-- REPORTS
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status public.report_status NOT NULL DEFAULT 'open',
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporter and staff read reports" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Users file reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Staff update reports" ON public.reports FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- SAVED MATCHES
CREATE TABLE public.saved_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  my_listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  their_listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  reasoning TEXT,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, my_listing_id, their_listing_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_matches TO authenticated;
GRANT ALL ON public.saved_matches TO service_role;
ALTER TABLE public.saved_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own matches" ON public.saved_matches FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER t_profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_listings_touch BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_proposals_touch BEFORE UPDATE ON public.trade_proposals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_reports_touch BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- AUTO PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, handle, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'handle', split_part(NEW.email,'@',1)) || '_' || substr(NEW.id::text,1,4),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- INDEXES
CREATE INDEX idx_listings_category ON public.listings(category);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_owner ON public.listings(owner_id);
CREATE INDEX idx_photos_listing ON public.listing_photos(listing_id);
CREATE INDEX idx_messages_proposal ON public.messages(proposal_id);

-- DEMO DATA
INSERT INTO public.profiles (id, handle, display_name, bio, avatar_url, location, latitude, longitude, is_verified, trades_completed, rating_avg, rating_count) VALUES
('11111111-1111-4111-8111-111111111101','maya_ridge','Maya Ridgeway','Homesteader and water systems tinkerer. I trade fair and fast.','https://i.pravatar.cc/240?img=47','Asheville, NC',35.5951,-82.5515,true,34,4.90,29),
('11111111-1111-4111-8111-111111111102','deltaworks','Andre Costa','Diesel mechanic. Tools, welding, and engine repair for barter.','https://i.pravatar.cc/240?img=12','Asheville, NC',35.6012,-82.5601,true,21,4.70,18),
('11111111-1111-4111-8111-111111111103','seedsaver_jo','Jo Halloran','Seed library steward. Heirloom seeds, canning, food preservation.','https://i.pravatar.cc/240?img=32','Weaverville, NC',35.6971,-82.5610,true,47,5.00,41),
('11111111-1111-4111-8111-111111111104','wattsmith','Priya Nair','Off-grid solar installer. I build battery banks from salvage.','https://i.pravatar.cc/240?img=27','Black Mountain, NC',35.6182,-82.3210,true,12,4.60,9),
('11111111-1111-4111-8111-111111111105','clinic_hands','Dr. Sam Okoye','Retired paramedic. First-aid training and supplies for the network.','https://i.pravatar.cc/240?img=15','Asheville, NC',35.5810,-82.5540,true,19,4.80,16),
('11111111-1111-4111-8111-111111111106','hauling_hank','Hank Delgado','Truck, trailer, and a strong back. Moving help for goods.','https://i.pravatar.cc/240?img=51','Candler, NC',35.5378,-82.6968,false,6,4.20,5),
('11111111-1111-4111-8111-111111111107','loomandthread','Beatriz Sol','Sewing, mending, boot repair. Bring me your torn gear.','https://i.pravatar.cc/240?img=45','Swannanoa, NC',35.5968,-82.4001,true,28,4.90,24),
('11111111-1111-4111-8111-111111111108','quickflip_deals','V. Marsh','Bulk deals. Message fast.',NULL,'Unknown',35.6000,-82.5000,false,0,2.10,3);

INSERT INTO public.listings (id, owner_id, title, description, category, condition, offer_type, estimated_value, quantity, wanted_in_return, location, latitude, longitude, status, is_flagged, created_at) VALUES
('22222222-2222-4222-8222-222222222201','11111111-1111-4111-8111-111111111101','Berkey-style gravity water filter + 2 spare elements','Stainless gravity filter, filters ~6,000 gallons per element pair. Used one season, cleaned and ready. Perfect for a household without power.','water','like_new','offering',280,'1 unit + 2 elements','Canned protein, seed stock, or diesel mechanic hours','Asheville, NC',35.5951,-82.5515,'active',false, now() - interval '2 days'),
('22222222-2222-4222-8222-222222222202','11111111-1111-4111-8111-111111111101','Seeking: 20L jerry cans (food grade)','Need 3-4 food grade water containers for a neighborhood distribution point. Can trade filtration help or garden labor.','water','na','seeking',90,'3-4 cans','Trade or mutual aid','Asheville, NC',35.5951,-82.5515,'active',false, now() - interval '5 days'),
('22222222-2222-4222-8222-222222222203','11111111-1111-4111-8111-111111111102','Mobile diesel & small engine repair (4 hrs)','I come to you. Generators, tractors, pickups. Bring parts, I bring tools and knowledge. Four hours of labor.','services','na','offering',320,'4 hours','Firewood, preserved food, solar gear','Asheville, NC',35.6012,-82.5601,'active',false, now() - interval '1 day'),
('22222222-2222-4222-8222-222222222204','11111111-1111-4111-8111-111111111102','Craftsman socket set + torque wrench','Full metric and SAE set, 3/8 and 1/2 drive. Missing two sockets, otherwise complete. Torque wrench recently calibrated.','tools','good','offering',210,'1 set','Welding rod, fuel, or medical supplies','Asheville, NC',35.6012,-82.5601,'active',false, now() - interval '9 days'),
('22222222-2222-4222-8222-222222222205','11111111-1111-4111-8111-111111111103','Heirloom seed bank — 40 varieties','Tomato, bean, squash, greens, herbs. All open-pollinated, harvested last season, germination tested above 85%. Comes labeled with planting notes.','food','new','both',150,'40 packets','Canning jars, honey, or garden tools','Weaverville, NC',35.6971,-82.5610,'active',false, now() - interval '3 days'),
('22222222-2222-4222-8222-222222222206','11111111-1111-4111-8111-111111111103','Home canning workshop for 6 people','Half-day hands-on session. Water bath and pressure canning, safety, and shelf-life. I supply jars for the first batch.','skills','na','offering',180,'1 session (6 seats)','Produce in bulk, propane, or firewood','Weaverville, NC',35.6971,-82.5610,'active',false, now() - interval '11 days'),
('22222222-2222-4222-8222-222222222207','11111111-1111-4111-8111-111111111104','400W solar panel array + charge controller','Four 100W panels, MPPT controller, all wiring and MC4 connectors. Tested at 380W peak. Enough to keep a fridge and radios alive.','energy','good','offering',450,'1 array','Deep cycle batteries, tools, or 4 weeks of produce','Black Mountain, NC',35.6182,-82.3210,'active',false, now() - interval '4 days'),
('22222222-2222-4222-8222-222222222208','11111111-1111-4111-8111-111111111104','Seeking: 12V deep cycle batteries','Any condition considered — I rebuild and rebalance cells. Will return one working battery for every three cores.','energy','na','seeking',300,'3+ batteries','Rebuild service in return','Black Mountain, NC',35.6182,-82.3210,'active',false, now() - interval '6 days'),
('22222222-2222-4222-8222-222222222209','11111111-1111-4111-8111-111111111105','Stocked trauma kit (IFAK) x2','Tourniquets, pressure dressings, chest seals, shears, gloves. Assembled and in-date. For lawful personal first-aid use.','medical','new','offering',240,'2 kits','Water storage, solar, or transport help','Asheville, NC',35.5810,-82.5540,'active',false, now() - interval '7 days'),
('2222222f-2222-4222-8222-22222222220a','11111111-1111-4111-8111-111111111105','Community first-aid training (8 seats)','Bleeding control, shock, splinting, and triage basics. Three hours. Certificate of attendance, not a formal license.','skills','na','offering',200,'8 seats','Food, fuel, or childcare hours','Asheville, NC',35.5810,-82.5540,'active',false, now() - interval '13 days'),
('2222222f-2222-4222-8222-22222222220b','11111111-1111-4111-8111-111111111106','Pickup + 16ft trailer hauling (local)','Up to 50 miles. I move firewood, furniture, generators, livestock feed. You load, I drive, we both unload.','transport','na','offering',160,'1 trip','Fuel, food, or tool loans','Candler, NC',35.5378,-82.6968,'active',false, now() - interval '8 days'),
('2222222f-2222-4222-8222-22222222220c','11111111-1111-4111-8111-111111111107','Boot & gear repair — resoling, restitching','Send me your work boots, packs, and canvas. I restitch, patch, and resole. Turnaround about a week.','services','na','offering',120,'up to 4 items','Preserved food, thread and leather stock','Swannanoa, NC',35.5968,-82.4001,'active',false, now() - interval '10 days'),
('2222222f-2222-4222-8222-22222222220d','11111111-1111-4111-8111-111111111107','Wool blankets and thermal layers','Twelve wool blankets, eight sets of thermal base layers. Washed, mended, sorted by size. Winter-ready.','clothing','good','offering',260,'20 items','Firewood, food stores, or medical supplies','Swannanoa, NC',35.5968,-82.4001,'active',false, now() - interval '12 days'),
('2222222f-2222-4222-8222-22222222220e','11111111-1111-4111-8111-111111111101','Split seasoned firewood — half cord','Oak and hickory, split and stacked, seasoned 14 months. You haul. Burns clean and hot.','other','good','both',220,'0.5 cord','Water storage, solar, or mechanic hours','Asheville, NC',35.5951,-82.5515,'active',false, now() - interval '15 days'),
('2222222f-2222-4222-8222-22222222220f','11111111-1111-4111-8111-111111111108','GUARANTEED BULK RESALE — wire payment only, no meetup','Huge pallet lots. Send deposit first via wire and I ship same day. No questions, no meetups, cash only deals.','other','na','offering',9999,'unlimited','Wire transfer','Unknown',35.6000,-82.5000,'active',true, now() - interval '1 day');

INSERT INTO public.listing_photos (listing_id, url, caption, sort_order) VALUES
('22222222-2222-4222-8222-222222222201','https://picsum.photos/seed/bg-water-filter/900/650','Gravity filter assembled',0),
('22222222-2222-4222-8222-222222222201','https://picsum.photos/seed/bg-water-elements/900/650','Spare elements, sealed',1),
('22222222-2222-4222-8222-222222222202','https://picsum.photos/seed/bg-jerrycan/900/650','Reference photo',0),
('22222222-2222-4222-8222-222222222203','https://picsum.photos/seed/bg-diesel/900/650','On-site repair rig',0),
('22222222-2222-4222-8222-222222222204','https://picsum.photos/seed/bg-sockets/900/650','Socket set laid out',0),
('22222222-2222-4222-8222-222222222205','https://picsum.photos/seed/bg-seeds/900/650','Labeled seed packets',0),
('22222222-2222-4222-8222-222222222206','https://picsum.photos/seed/bg-canning/900/650','Last workshop batch',0),
('22222222-2222-4222-8222-222222222207','https://picsum.photos/seed/bg-solar/900/650','Panels under test',0),
('22222222-2222-4222-8222-222222222208','https://picsum.photos/seed/bg-battery/900/650','Battery bank build',0),
('22222222-2222-4222-8222-222222222209','https://picsum.photos/seed/bg-ifak/900/650','Kit contents',0),
('2222222f-2222-4222-8222-22222222220a','https://picsum.photos/seed/bg-training/900/650','Training session',0),
('2222222f-2222-4222-8222-22222222220b','https://picsum.photos/seed/bg-hauling/900/650','Truck and trailer',0),
('2222222f-2222-4222-8222-22222222220c','https://picsum.photos/seed/bg-boots/900/650','Resoled work boots',0),
('2222222f-2222-4222-8222-22222222220d','https://picsum.photos/seed/bg-blankets/900/650','Sorted wool blankets',0),
('2222222f-2222-4222-8222-22222222220e','https://picsum.photos/seed/bg-firewood/900/650','Seasoned stack',0);

INSERT INTO public.ratings (rater_id, ratee_id, stars, comment, was_reliable) VALUES
('11111111-1111-4111-8111-111111111102','11111111-1111-4111-8111-111111111101',5,'Maya showed up early and the filter was exactly as described.',true),
('11111111-1111-4111-8111-111111111103','11111111-1111-4111-8111-111111111101',5,'Fair trader. Threw in extra seed jars unprompted.',true),
('11111111-1111-4111-8111-111111111101','11111111-1111-4111-8111-111111111102',5,'Andre fixed our generator in the rain. Absolute pro.',true),
('11111111-1111-4111-8111-111111111104','11111111-1111-4111-8111-111111111103',5,'Jo''s canning workshop was worth three times the trade value.',true),
('11111111-1111-4111-8111-111111111105','11111111-1111-4111-8111-111111111104',4,'Solar array worked as promised, wiring needed a little cleanup.',true),
('11111111-1111-4111-8111-111111111107','11111111-1111-4111-8111-111111111105',5,'Sam trained our whole block for free after the trade.',true),
('11111111-1111-4111-8111-111111111106','11111111-1111-4111-8111-111111111107',5,'Beatriz resoled two pairs of boots better than new.',true),
('11111111-1111-4111-8111-111111111101','11111111-1111-4111-8111-111111111108',1,'Asked for a wire transfer up front. Avoid.',false);

INSERT INTO public.reports (reporter_id, listing_id, reported_user_id, reason, details, status) VALUES
('11111111-1111-4111-8111-111111111101','2222222f-2222-4222-8222-22222222220f','11111111-1111-4111-8111-111111111108','Suspected scam','Demands wire payment up front and refuses any meetup. Classic advance-fee pattern.','open'),
('11111111-1111-4111-8111-111111111103','2222222f-2222-4222-8222-22222222220f','11111111-1111-4111-8111-111111111108','Prohibited terms','Cash-only wire deals are against the barter-only policy.','reviewing');
