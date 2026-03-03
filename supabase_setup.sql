-- =============================================
-- LADIES HOSTEL MESS APP — Full Database Setup
-- Run this entire script in your Supabase SQL Editor
-- =============================================

-- 1. HOSTELS TABLE
create table public.hostels (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  mess_rate integer not null default 140,
  cutoff_time integer not null default 20,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.hostels enable row level security;

create policy "Hostels are viewable by everyone"
  on public.hostels for select using (true);

create policy "Admins can update hostels"
  on public.hostels for update using (true) with check (true);

-- Insert Ladies Hostel
insert into public.hostels (name, mess_rate, cutoff_time)
values ('Ladies Hostel', 140, 20);

-- 2. ADMINS TABLE
create table public.admins (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  password text not null,
  hostel_id uuid references public.hostels(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.admins enable row level security;

create policy "Admins are viewable by everyone"
  on public.admins for select using (true);

-- Insert admin user (uses the hostel we just created)
insert into public.admins (name, email, password, hostel_id)
values (
  'Ladies Hostel Admin',
  'admin@ladies.in',
  'LH@@1290',
  (select id from public.hostels where name = 'Ladies Hostel' limit 1)
);

-- 3. STUDENTS TABLE
create table public.students (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  mess_number text not null,
  phone text,
  password text,
  room_no text,
  mess_status text default 'Active',
  mess_type text default 'Veg',
  join_date date default current_date,
  hostel_id uuid references public.hostels(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.students enable row level security;

create policy "Students are viewable by everyone"
  on public.students for select using (true);

create policy "Students can be inserted by everyone"
  on public.students for insert with check (true);

create policy "Students can be updated by everyone"
  on public.students for update using (true) with check (true);

create policy "Students can be deleted by everyone"
  on public.students for delete using (true);

-- 4. LEAVES TABLE
create table public.leaves (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.students(id),
  mess_number text not null,
  leave_date date not null,
  status text default 'Approved',
  is_admin_granted boolean default false,
  hostel_id uuid references public.hostels(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.leaves enable row level security;

create policy "Leaves are viewable by everyone"
  on public.leaves for select using (true);

create policy "Leaves can be inserted by everyone"
  on public.leaves for insert with check (true);

create policy "Leaves can be updated by everyone"
  on public.leaves for update using (true) with check (true);

create policy "Leaves can be deleted by everyone"
  on public.leaves for delete using (true);

-- 5. WEEKLY MENU TABLE
create table public.weekly_menu (
  id uuid default gen_random_uuid() primary key,
  day_of_week text not null,
  breakfast text[] default '{}',
  lunch text[] default '{}',
  snack text[] default '{}',
  dinner text[] default '{}',
  hostel_id uuid references public.hostels(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.weekly_menu enable row level security;

create policy "Menu is viewable by everyone"
  on public.weekly_menu for select using (true);

create policy "Menu can be updated by everyone"
  on public.weekly_menu for update using (true) with check (true);

create policy "Menu can be inserted by everyone"
  on public.weekly_menu for insert with check (true);

-- Insert placeholder weekly menu
insert into public.weekly_menu (day_of_week, breakfast, lunch, snack, dinner, hostel_id)
values
  ('Monday',    '{}', '{}', '{}', '{}', (select id from public.hostels where name = 'Ladies Hostel' limit 1)),
  ('Tuesday',   '{}', '{}', '{}', '{}', (select id from public.hostels where name = 'Ladies Hostel' limit 1)),
  ('Wednesday', '{}', '{}', '{}', '{}', (select id from public.hostels where name = 'Ladies Hostel' limit 1)),
  ('Thursday',  '{}', '{}', '{}', '{}', (select id from public.hostels where name = 'Ladies Hostel' limit 1)),
  ('Friday',    '{}', '{}', '{}', '{}', (select id from public.hostels where name = 'Ladies Hostel' limit 1)),
  ('Saturday',  '{}', '{}', '{}', '{}', (select id from public.hostels where name = 'Ladies Hostel' limit 1)),
  ('Sunday',    '{}', '{}', '{}', '{}', (select id from public.hostels where name = 'Ladies Hostel' limit 1));

-- 6. Enable Realtime for all tables
alter publication supabase_realtime add table public.students;
alter publication supabase_realtime add table public.leaves;
alter publication supabase_realtime add table public.weekly_menu;
alter publication supabase_realtime add table public.hostels;

-- Done! Verify setup:
select 'Hostels' as "table", count(*) from public.hostels
union all
select 'Admins', count(*) from public.admins
union all
select 'Menu Days', count(*) from public.weekly_menu;
