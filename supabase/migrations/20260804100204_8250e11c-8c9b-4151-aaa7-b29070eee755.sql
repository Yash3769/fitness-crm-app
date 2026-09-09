CREATE TABLE public.trainer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  business_name TEXT,
  certification_name TEXT,
  certification_number TEXT,
  years_experience INTEGER,
  training_style TEXT,
  measurement_system TEXT NOT NULL DEFAULT 'metric',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  accepted_disclaimer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainer_profiles TO authenticated;
GRANT ALL ON public.trainer_profiles TO service_role;
ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trainer profile" ON public.trainer_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  date_of_birth DATE,
  age INTEGER,
  gender TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  occupation TEXT,
  activity_level TEXT,
  measurement_system TEXT NOT NULL DEFAULT 'metric',
  fitness_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  body_assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
  health JSONB NOT NULL DEFAULT '{}'::jsonb,
  training_setup JSONB NOT NULL DEFAULT '{}'::jsonb,
  health_flagged BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clients" ON public.clients FOR ALL TO authenticated USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);
CREATE INDEX clients_trainer_idx ON public.clients (trainer_id, archived);

CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Workout Plan',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  trainer_notes TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans TO authenticated;
GRANT ALL ON public.workout_plans TO service_role;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.workout_plans FOR ALL TO authenticated USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);
CREATE INDEX workout_plans_client_idx ON public.workout_plans (client_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trainer_profiles_updated BEFORE UPDATE ON public.trainer_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER workout_plans_updated BEFORE UPDATE ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();