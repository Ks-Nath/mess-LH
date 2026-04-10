-- =============================================
-- ESTABLISHMENT FEE & FINE SYSTEM — Database Setup
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Add establishment_fee column to hostels table
ALTER TABLE public.hostels 
ADD COLUMN IF NOT EXISTS establishment_fee integer NOT NULL DEFAULT 800;

-- 2. Set default establishment fee for existing hostel
UPDATE public.hostels SET establishment_fee = 800 WHERE establishment_fee = 0 OR establishment_fee IS NULL;

-- 3. Create fee_payments table
CREATE TABLE IF NOT EXISTS public.fee_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  mess_number text NOT NULL,
  month text NOT NULL,                -- format: "2026-04" (the month the fee is FOR)
  fee_type text NOT NULL CHECK (fee_type IN ('mess', 'establishment')),
  is_paid boolean DEFAULT false,
  paid_date date,                     -- date when admin marked it paid
  hostel_id uuid REFERENCES public.hostels(id),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Unique constraint: one record per student per month per fee type
CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_payments_unique 
  ON public.fee_payments(student_id, month, fee_type);

-- 4. Enable RLS
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fee payments are viewable by everyone"
  ON public.fee_payments FOR SELECT USING (true);

CREATE POLICY "Fee payments can be inserted by everyone"
  ON public.fee_payments FOR INSERT WITH CHECK (true);

CREATE POLICY "Fee payments can be updated by everyone"
  ON public.fee_payments FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Fee payments can be deleted by everyone"
  ON public.fee_payments FOR DELETE USING (true);

-- 5. Enable Realtime
ALTER publication supabase_realtime ADD TABLE public.fee_payments;

-- Done! Verify:
SELECT 'fee_payments' AS "table", count(*) FROM public.fee_payments;
SELECT establishment_fee FROM public.hostels LIMIT 1;
