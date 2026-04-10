-- =============================================
-- SQL TO ENABLE CASCADING DELETES FOR STUDENTS
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Drop the existing strict constraint on the leaves table
alter table public.leaves drop constraint if exists leaves_student_id_fkey;

-- 2. Add the new constraint with CASCADE so deleting a student deletes their leaves
alter table public.leaves 
  add constraint leaves_student_id_fkey 
  foreign key (student_id) 
  references public.students(id) 
  on delete cascade;
