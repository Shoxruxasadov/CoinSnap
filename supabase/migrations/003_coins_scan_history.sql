-- ============================================
-- COINS: scan qilgan user va vaqt
-- Snap History uchun: faqat shu user scan qilgan tangalar
-- ============================================
ALTER TABLE public.coins
  ADD COLUMN IF NOT EXISTS scanned_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS coins_scanned_by_user_id_idx ON public.coins (scanned_by_user_id);
CREATE INDEX IF NOT EXISTS coins_scanned_at_idx ON public.coins (scanned_at DESC);

-- RLS: o'z scan qilgan tangalarini ko'radi, yangi scan qo'sha oladi
DROP POLICY IF EXISTS "coins_select" ON public.coins;
CREATE POLICY "coins_select" ON public.coins
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "coins_insert_own_scan" ON public.coins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = scanned_by_user_id);

CREATE POLICY "coins_update_own_scan" ON public.coins
  FOR UPDATE TO authenticated USING (auth.uid() = scanned_by_user_id);
