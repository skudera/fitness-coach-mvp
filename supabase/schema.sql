create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  full_name text,
  preferred_workout_length integer default 75,
  max_workout_length integer default 85,
  created_at timestamptz default now()
);

create table if not exists body_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  recorded_on date not null,
  weight numeric(5,1) not null,
  body_fat numeric(4,1) not null,
  water_percent numeric(4,1) not null,
  waist numeric(4,1),
  chest numeric(4,1),
  arms numeric(4,1),
  thighs numeric(4,1),
  notes text,
  created_at timestamptz default now()
);

create table if not exists weekly_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  week_of date not null,
  mode text not null,
  basketball_thursday text not null,
  coach_note text,
  adjustments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists workout_days (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid references weekly_plans(id) on delete cascade,
  day_name text not null,
  focus text not null,
  estimated_minutes integer not null,
  warmup jsonb default '[]'::jsonb,
  cardio_machine text,
  cardio_minutes integer,
  cardio_hr_target text,
  sauna_recommendation text,
  position integer not null,
  created_at timestamptz default now()
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  muscle_group text not null,
  equipment_group text not null,
  shoulder_risk text default 'low',
  back_risk text default 'low',
  substitute_names jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists workout_day_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid references workout_days(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete restrict,
  order_index integer not null,
  target_sets integer not null,
  target_reps integer not null,
  suggested_weight numeric(6,1),
  created_at timestamptz default now()
);

create table if not exists exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_day_exercise_id uuid references workout_day_exercises(id) on delete cascade,
  logged_at timestamptz default now(),
  set_number integer not null,
  weight numeric(6,1),
  reps integer not null,
  difficulty text,
  discomfort_type text default 'none',
  note text
);

create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  photo_type text not null,
  image_path text not null,
  taken_on date not null,
  created_at timestamptz default now()
);
