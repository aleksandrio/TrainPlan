-- TrainPlan initial schema: goals, plans, sessions with row-level security.
-- Every row is owned by a user (auth.users); policies allow access only to the owner.

create extension if not exists "pgcrypto";

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- goals: one active goal per user
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_text text not null check (char_length(goal_text) between 3 and 500),
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  available_days smallint[] not null default '{}',
  fixed_commitment_day smallint check (fixed_commitment_day between 0 and 6),
  fixed_commitment_label text check (char_length(fixed_commitment_label) <= 100),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_one_per_user unique (user_id),
  constraint goals_commitment_pair check (
    (fixed_commitment_day is null and fixed_commitment_label is null)
    or (fixed_commitment_day is not null and fixed_commitment_label is not null)
  )
);

create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

-- plans: one per user per week
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  week_start date not null,
  valid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_one_per_week unique (user_id, week_start)
);

create index plans_user_week_idx on public.plans (user_id, week_start desc);

create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

-- sessions: the training sessions of a plan
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day smallint not null check (day between 0 and 6),
  type text not null check (type in ('strength', 'cardio', 'mobility', 'plyometrics', 'team_sport', 'other')),
  muscle_groups text[] not null default '{}',
  intensity text not null check (intensity in ('light', 'moderate', 'heavy')),
  duration_min smallint not null check (duration_min between 10 and 240),
  description text not null default '' check (char_length(description) <= 1000),
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  locked boolean not null default false,
  source text not null default 'generated' check (source in ('generated', 'manual', 'commitment')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_plan_idx on public.sessions (plan_id, day);

create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

-- Row-level security: owners only, per operation. anon gets nothing.
alter table public.goals enable row level security;
alter table public.plans enable row level security;
alter table public.sessions enable row level security;

create policy "goals_select_own" on public.goals for select to authenticated using (user_id = auth.uid());
create policy "goals_insert_own" on public.goals for insert to authenticated with check (user_id = auth.uid());
create policy "goals_update_own" on public.goals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goals_delete_own" on public.goals for delete to authenticated using (user_id = auth.uid());

create policy "plans_select_own" on public.plans for select to authenticated using (user_id = auth.uid());
create policy "plans_insert_own" on public.plans for insert to authenticated with check (user_id = auth.uid());
create policy "plans_update_own" on public.plans for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "plans_delete_own" on public.plans for delete to authenticated using (user_id = auth.uid());

create policy "sessions_select_own" on public.sessions for select to authenticated using (user_id = auth.uid());
create policy "sessions_insert_own" on public.sessions for insert to authenticated with check (user_id = auth.uid());
create policy "sessions_update_own" on public.sessions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sessions_delete_own" on public.sessions for delete to authenticated using (user_id = auth.uid());
