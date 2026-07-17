-- =============================================
-- BATCHWISE LEAVE FEATURE — Migration
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Add 'batch' column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS batch text DEFAULT NULL;

-- 2. Create batchwise_leaves table
-- Stores one record per admin grant (not per student per day)
CREATE TABLE IF NOT EXISTS public.batchwise_leaves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hostel_id uuid REFERENCES public.hostels(id) ON DELETE CASCADE,
  batch text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  granted_by uuid REFERENCES public.admins(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security
ALTER TABLE public.batchwise_leaves ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (open, consistent with rest of app)
CREATE POLICY "batchwise_leaves viewable by all"
  ON public.batchwise_leaves FOR SELECT USING (true);

CREATE POLICY "batchwise_leaves insertable by all"
  ON public.batchwise_leaves FOR INSERT WITH CHECK (true);

CREATE POLICY "batchwise_leaves deletable by all"
  ON public.batchwise_leaves FOR DELETE USING (true);

-- 5. Enable Realtime for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.batchwise_leaves;

-- Verify
SELECT 'batchwise_leaves table' as item, count(*) as rows FROM public.batchwise_leaves
UNION ALL
SELECT 'students with batch column', count(*) FROM public.students WHERE batch IS NOT NULL;
