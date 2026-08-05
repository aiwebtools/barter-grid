CREATE TYPE public.meetup_status AS ENUM ('proposed','confirmed','declined','cancelled','completed');
CREATE TYPE public.crypto_payment_status AS ENUM ('requested','sent','confirmed','cancelled');

CREATE TABLE public.meetups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.trade_proposals(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  location text NOT NULL,
  notes text,
  status meetup_status NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crypto_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.trade_proposals(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chain text NOT NULL,
  asset text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  wallet_address text NOT NULL,
  memo text,
  tx_hash text,
  status crypto_payment_status NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetups_proposal ON public.meetups(proposal_id);
CREATE INDEX idx_crypto_payments_proposal ON public.crypto_payments(proposal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetups TO authenticated;
GRANT ALL ON public.meetups TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.crypto_payments TO authenticated;
GRANT ALL ON public.crypto_payments TO service_role;

ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read meetups" ON public.meetups FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.trade_proposals p WHERE p.id = meetups.proposal_id
  AND (p.proposer_id = auth.uid() OR p.recipient_id = auth.uid() OR public.is_staff(auth.uid()))));

CREATE POLICY "Participants create meetups" ON public.meetups FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.trade_proposals p
  WHERE p.id = meetups.proposal_id AND (p.proposer_id = auth.uid() OR p.recipient_id = auth.uid())));

CREATE POLICY "Participants update meetups" ON public.meetups FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trade_proposals p WHERE p.id = meetups.proposal_id
  AND (p.proposer_id = auth.uid() OR p.recipient_id = auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.trade_proposals p WHERE p.id = meetups.proposal_id
  AND (p.proposer_id = auth.uid() OR p.recipient_id = auth.uid())));

CREATE POLICY "Creator deletes meetups" ON public.meetups FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Participants read payments" ON public.crypto_payments FOR SELECT TO authenticated
USING (payer_id = auth.uid() OR payee_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "Participants create payments" ON public.crypto_payments FOR INSERT TO authenticated
WITH CHECK (requested_by = auth.uid() AND (payer_id = auth.uid() OR payee_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.trade_proposals p WHERE p.id = crypto_payments.proposal_id
    AND (p.proposer_id = auth.uid() OR p.recipient_id = auth.uid())));

CREATE POLICY "Participants update payments" ON public.crypto_payments FOR UPDATE TO authenticated
USING (payer_id = auth.uid() OR payee_id = auth.uid())
WITH CHECK (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE TRIGGER t_meetups_touch BEFORE UPDATE ON public.meetups
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_crypto_payments_touch BEFORE UPDATE ON public.crypto_payments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.meetups REPLICA IDENTITY FULL;
ALTER TABLE public.crypto_payments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_payments;