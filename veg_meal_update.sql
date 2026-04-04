-- =============================================
-- SQL TO ADD MEAL TYPE (AFTERNOON / NIGHT) TO VEG ATTENDANCE
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Add meal_type column
alter table public.veg_attendance add column meal_type text not null default 'afternoon';

-- 2. Drop the old unique constraint
alter table public.veg_attendance drop constraint unique_daily_veg;

-- 3. Add the new unique constraint that includes meal_type
alter table public.veg_attendance add constraint unique_daily_veg_meal unique (mess_number, eaten_date, meal_type, hostel_id);
