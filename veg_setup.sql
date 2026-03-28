-- =============================================
-- SQL TO RUN FOR VEG LIST SURVEILLANCE
-- =============================================

create table public.veg_attendance (
  id uuid default gen_random_uuid() primary key,
  mess_number text not null,
  eaten_date date not null default current_date,
  hostel_id uuid references public.hostels(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Adding a unique constraint to ensure a student is only marked once per day per hostel
alter table public.veg_attendance add constraint unique_daily_veg unique (mess_number, eaten_date, hostel_id);

alter table public.veg_attendance enable row level security;

create policy "Veg attendance is viewable by everyone"
  on public.veg_attendance for select using (true);

create policy "Veg attendance can be inserted by everyone"
  on public.veg_attendance for insert with check (true);

create policy "Veg attendance can be deleted by everyone"
  on public.veg_attendance for delete using (true);

-- Enable Realtime
alter publication supabase_realtime add table public.veg_attendance;
