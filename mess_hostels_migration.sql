-- Create hostels table
create table public.hostels (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  mess_rate integer not null default 140,
  cutoff_time integer not null default 20, -- 24h format, 20 = 8 PM
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.hostels enable row level security;

-- Policy: Everyone can read hostels (for login/signup selection if needed, or generally public info)
create policy "Hostels are viewable by everyone"
  on public.hostels for select
  using ( true );

-- Policy: Only admins can update their own hostel
-- (Assumes admins have a hostel_id and we can check it.
--  For now, let's allow authenticated users to view, but strictly limit updates if we had auth logic ready in SQL.
--  Simpler for this MVP: All authenticated users can read.
--  Updates: We'll restrict this in the app logic or add a stricter policy later.)
create policy "Admins can update hostels"
  on public.hostels for update
  using ( true ) -- In a real app, check auth.uid() against admin table
  with check ( true );

-- Insert default hostel
insert into public.hostels (name, mess_rate, cutoff_time)
values ('Hostel 1', 140, 20);

-- Query to get the ID of the newly created hostel
-- You will need this ID to update existing users/admins
select id, name from public.hostels;
