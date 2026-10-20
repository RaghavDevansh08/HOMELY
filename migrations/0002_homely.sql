-- Homely application schema. Identity lives in the Better Auth "user" table.

create table if not exists profiles (
  user_id text primary key,
  role text not null check (role in ('customer', 'provider', 'admin')),
  full_name text not null,
  phone text,
  city text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_categories (
  slug text primary key,
  name text not null,
  description text not null,
  tasks jsonb not null,
  starting_price_inr integer not null,
  image_path text not null,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists provider_profiles (
  user_id text primary key references profiles (user_id) on delete cascade,
  experience_years integer not null default 0,
  qualifications text,
  service_radius_km integer not null default 10,
  base_city text not null,
  base_area text not null default '',
  pincode text not null default '',
  lat double precision,
  lng double precision,
  starting_price_inr integer not null default 349,
  hourly_rate_inr integer not null default 399,
  travel_per_km_inr integer not null default 12,
  is_demo boolean not null default false,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected', 'suspended')),
  trust_score integer not null default 70,
  trust_early boolean not null default true,
  jobs_completed integer not null default 0,
  provider_cancels integer not null default 0,
  on_time_rate numeric not null default 0.9,
  tracked_starts integer not null default 0,
  on_time_starts integer not null default 0,
  complaint_count integer not null default 0,
  rating_sum numeric not null default 0,
  review_count integer not null default 0,
  about text not null default '',
  available_now boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists provider_skills (
  provider_user_id text not null references provider_profiles (user_id) on delete cascade,
  category_slug text not null references service_categories (slug),
  primary key (provider_user_id, category_slug)
);

create table if not exists provider_availability (
  provider_user_id text not null references provider_profiles (user_id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  slot text not null check (slot in ('morning', 'afternoon', 'evening')),
  primary key (provider_user_id, weekday, slot)
);

create table if not exists addresses (
  id serial primary key,
  user_id text not null,
  label text not null,
  line1 text not null,
  area text not null,
  city text not null,
  pincode text not null,
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on addresses (user_id);

create table if not exists bookings (
  id serial primary key,
  public_id text not null unique,
  customer_user_id text not null,
  provider_user_id text not null,
  category_slug text not null,
  category_name text not null,
  status text not null check (status in ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  urgency text not null check (urgency in ('standard', 'same_day', 'emergency')),
  description text not null,
  preferred_date date not null,
  time_slot text not null,
  address_snapshot jsonb not null,
  customer_snapshot jsonb not null,
  provider_snapshot jsonb not null,
  estimate jsonb not null,
  agreed_total_inr integer not null,
  revised_estimate jsonb,
  revision_status text,
  customer_confirmed boolean not null default false,
  is_demo_provider boolean not null default false,
  is_demo_customer boolean not null default false,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookings_customer_idx on bookings (customer_user_id, created_at desc);
create index if not exists bookings_provider_idx on bookings (provider_user_id, status);
create index if not exists bookings_status_idx on bookings (status);

create table if not exists booking_status_history (
  id serial primary key,
  booking_id integer not null references bookings (id) on delete cascade,
  status text not null,
  actor_user_id text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists booking_status_booking_idx on booking_status_history (booking_id, id);

create table if not exists booking_images (
  id serial primary key,
  booking_id integer not null references bookings (id) on delete cascade,
  data_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists booking_messages (
  id serial primary key,
  booking_id integer not null references bookings (id) on delete cascade,
  sender_user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id serial primary key,
  booking_id integer not null unique references bookings (id) on delete cascade,
  customer_user_id text not null,
  provider_user_id text not null,
  rating integer not null check (rating between 1 and 5),
  body text not null,
  is_demo boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reviews_provider_idx on reviews (provider_user_id);

create table if not exists notifications (
  id serial primary key,
  user_id text not null,
  title text not null,
  body text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, read, id desc);

create table if not exists payments (
  id serial primary key,
  booking_id integer not null references bookings (id) on delete cascade,
  amount_inr integer not null,
  status text not null,
  method text not null default 'pay_on_completion',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists complaints (
  id serial primary key,
  user_id text not null,
  booking_id integer references bookings (id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'upheld', 'dismissed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists verification_records (
  id serial primary key,
  provider_user_id text not null,
  doc_type text not null,
  consent boolean not null default false,
  reference_label text,
  file_name text,
  file_data text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_user_id text,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists verification_provider_idx on verification_records (provider_user_id, id desc);

create table if not exists favourites (
  user_id text not null,
  provider_user_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, provider_user_id)
);

create table if not exists maintenance_reminders (
  id serial primary key,
  user_id text not null,
  title text not null,
  category_slug text,
  due_on date not null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists reminders_user_idx on maintenance_reminders (user_id, due_on);

create table if not exists audit_logs (
  id serial primary key,
  actor_user_id text,
  action text not null,
  target text,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists platform_settings (
  id integer primary key default 1 check (id = 1),
  platform_fee_pct numeric not null default 8,
  gst_pct numeric not null default 18,
  urgency_same_day_pct numeric not null default 15,
  urgency_emergency_pct numeric not null default 35,
  cancel_free_hours integer not null default 4,
  cancel_fee_pct numeric not null default 20,
  material_buffer_pct numeric not null default 10
);

insert into platform_settings (id) values (1) on conflict (id) do nothing;

create table if not exists ledger_events (
  id serial primary key,
  booking_id integer,
  event_type text not null,
  payload jsonb not null,
  prev_hash text not null,
  event_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists ledger_booking_idx on ledger_events (booking_id, id);
