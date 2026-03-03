---
description: How to add a new hostel with admin, menu, and settings
---

# Adding a New Hostel — Step by Step

Run these SQL queries in your **Supabase SQL Editor** in order.

---

## Step 1: Create the Hostel

```sql
insert into public.hostels (name, mess_rate, cutoff_time)
values ('Hostel Name Here', 140, 20);
-- mess_rate = ₹ per day, cutoff_time = 24h format (20 = 8 PM)
```

Then grab the new UUID:

```sql
select id, name from public.hostels;
```

---

## Step 2: Create the Admin

```sql
insert into public.admins (name, email, password, hostel_id)
values ('Admin Name', 'admin@email.com', 'password', 'NEW_HOSTEL_UUID');
```

---

## Step 3: Add Weekly Menu

```sql
insert into public.weekly_menu (day_of_week, breakfast, lunch, dinner, hostel_id)
values
  ('Monday',    '{"Idli","Sambar"}',     '{"Rice","Dal"}',       '{"Chapati","Paneer"}',  'NEW_HOSTEL_UUID'),
  ('Tuesday',   '{"Poha","Toast"}',      '{"Rice","Rajma"}',     '{"Chapati","Chicken"}', 'NEW_HOSTEL_UUID'),
  ('Wednesday', '{"Dosa","Chutney"}',    '{"Rice","Sambar"}',    '{"Chapati","Chole"}',   'NEW_HOSTEL_UUID'),
  ('Thursday',  '{"Paratha","Curd"}',    '{"Rice","Dal Fry"}',   '{"Rice","Mutton"}',     'NEW_HOSTEL_UUID'),
  ('Friday',    '{"Upma","Vada"}',       '{"Biryani","Raita"}',  '{"Chapati","Paneer"}',  'NEW_HOSTEL_UUID'),
  ('Saturday',  '{"Puri Bhaji"}',        '{"Rice","Kadhi"}',     '{"Fried Rice","Fish"}', 'NEW_HOSTEL_UUID'),
  ('Sunday',    '{"Chole Bhature"}',     '{"Biryani","Chicken"}','{"Chapati","Dal"}',     'NEW_HOSTEL_UUID');
```

> Customize the menu items as needed. You can also skip this and add the menu via the admin UI after logging in.

---

## What Happens Automatically

- ✅ Admin logs in → sees only their hostel's data
- ✅ Admin adds students → students auto-get the hostel ID
- ✅ Mess rate & cutoff → configurable from the **Settings** page
- ✅ Menu → editable from the **Manage Menu** page
- ✅ Leaves & bills → automatically scoped to the hostel
