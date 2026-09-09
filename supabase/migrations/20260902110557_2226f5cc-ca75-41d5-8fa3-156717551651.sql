-- ========= ROLES =========
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role),
  UNIQUE (user_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE POLICY "read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin reads roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin());

-- Claim a role once. Single-coach platform: only the first admin claim succeeds; later ones become clients.
CREATE OR REPLACE FUNCTION public.claim_role(_role public.app_role)
RETURNS public.app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing public.app_role;
  final_role public.app_role := _role;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT role INTO existing FROM public.user_roles WHERE user_id = auth.uid();
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  IF _role = 'admin' AND EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    final_role := 'client';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), final_role);
  RETURN final_role;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_role(public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

-- ========= CLIENTS (now client-owned profiles) =========
ALTER TABLE public.clients
  ALTER COLUMN trainer_id DROP NOT NULL,
  ADD COLUMN user_id uuid UNIQUE,
  ADD COLUMN email text,
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN hold_reason text,
  ADD COLUMN last_activity_at timestamptz;

DROP POLICY IF EXISTS "own clients" ON public.clients;
CREATE POLICY "admin manages clients" ON public.clients FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "client reads own profile" ON public.clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "client creates own profile" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "client updates own profile" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Lock coach-controlled fields against client edits
CREATE OR REPLACE FUNCTION public.protect_client_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'pending';
      NEW.trainer_id := NULL;
      NEW.archived := false;
      NEW.hold_reason := NULL;
    ELSE
      NEW.status := OLD.status;
      NEW.trainer_id := OLD.trainer_id;
      NEW.archived := OLD.archived;
      NEW.hold_reason := OLD.hold_reason;
      NEW.user_id := OLD.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER clients_protect BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.protect_client_fields();

CREATE OR REPLACE FUNCTION public.client_id_for_user(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.clients WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.client_is_active(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clients WHERE id = _client_id AND status = 'active')
$$;

-- ========= CLIENT REQUESTS =========
CREATE TABLE public.client_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  admin_id uuid,
  status text NOT NULL DEFAULT 'pending',
  message text,
  rejection_reason text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_requests TO authenticated;
GRANT ALL ON public.client_requests TO service_role;
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages requests" ON public.client_requests FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "client reads own requests" ON public.client_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "client submits request" ON public.client_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND client_id = public.client_id_for_user(auth.uid()) AND status = 'pending');
CREATE TRIGGER client_requests_updated BEFORE UPDATE ON public.client_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========= WORKOUT PLANS =========
ALTER TABLE public.workout_plans
  ADD COLUMN created_by uuid,
  ADD COLUMN goal text,
  ADD COLUMN start_date date,
  ADD COLUMN end_date date,
  ADD COLUMN current_phase integer NOT NULL DEFAULT 1,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN archived boolean NOT NULL DEFAULT false;
UPDATE public.workout_plans SET created_by = trainer_id WHERE created_by IS NULL;
UPDATE public.workout_plans SET status = 'published', published_at = updated_at WHERE approved = true AND status = 'approved';

DROP POLICY IF EXISTS "own plans" ON public.workout_plans;
CREATE POLICY "admin manages plans" ON public.workout_plans FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "client reads published plans" ON public.workout_plans FOR SELECT TO authenticated
  USING (client_id = public.client_id_for_user(auth.uid()) AND status IN ('published','paused','completed'));

CREATE TABLE public.plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL,
  trainer_notes text,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.plan_versions TO authenticated;
GRANT ALL ON public.plan_versions TO service_role;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages versions" ON public.plan_versions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.snapshot_plan_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.plan_versions (plan_id, version, title, content, trainer_notes, status)
    VALUES (NEW.id, NEW.version, NEW.title, NEW.content, NEW.trainer_notes, NEW.status);
  ELSIF NEW.content IS DISTINCT FROM OLD.content OR NEW.version IS DISTINCT FROM OLD.version THEN
    INSERT INTO public.plan_versions (plan_id, version, title, content, trainer_notes, status)
    VALUES (NEW.id, NEW.version, NEW.title, NEW.content, NEW.trainer_notes, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER workout_plans_snapshot AFTER INSERT OR UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_plan_version();

-- ========= SESSIONS & COMPLETIONS =========
CREATE TABLE public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  week_number integer NOT NULL DEFAULT 1,
  phase_index integer NOT NULL DEFAULT 0,
  day_index integer NOT NULL DEFAULT 0,
  day_label text NOT NULL DEFAULT '',
  focus text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled',
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workout_sessions_client_date ON public.workout_sessions (client_id, scheduled_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages sessions" ON public.workout_sessions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "client reads own sessions" ON public.workout_sessions FOR SELECT TO authenticated
  USING (client_id = public.client_id_for_user(auth.uid()));
CREATE POLICY "client updates own sessions when active" ON public.workout_sessions FOR UPDATE TO authenticated
  USING (client_id = public.client_id_for_user(auth.uid()) AND public.client_is_active(client_id))
  WITH CHECK (client_id = public.client_id_for_user(auth.uid()) AND public.client_is_active(client_id));
CREATE TRIGGER workout_sessions_updated BEFORE UPDATE ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.exercise_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  exercise_key text NOT NULL,
  exercise_name text NOT NULL,
  completed boolean NOT NULL DEFAULT true,
  completed_at timestamptz NOT NULL DEFAULT now(),
  performance jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (session_id, exercise_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_completions TO authenticated;
GRANT ALL ON public.exercise_completions TO service_role;
ALTER TABLE public.exercise_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads completions" ON public.exercise_completions FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "client manages own completions when active" ON public.exercise_completions FOR ALL TO authenticated
  USING (client_id = public.client_id_for_user(auth.uid()))
  WITH CHECK (client_id = public.client_id_for_user(auth.uid()) AND public.client_is_active(client_id));

-- ========= PROGRESS =========
CREATE TABLE public.progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric,
  body_fat_pct numeric,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX progress_entries_client ON public.progress_entries (client_id, recorded_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_entries TO authenticated;
GRANT ALL ON public.progress_entries TO service_role;
ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads progress" ON public.progress_entries FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "client manages own progress" ON public.progress_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND client_id = public.client_id_for_user(auth.uid()));

-- ========= NOTIFICATIONS & ACTIVITY =========
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_recipient ON public.notifications (recipient_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  actor_id uuid,
  type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_client ON public.activity_log (client_id, created_at DESC);
GRANT SELECT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads activity" ON public.activity_log FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "client reads own activity" ON public.activity_log FOR SELECT TO authenticated USING (client_id = public.client_id_for_user(auth.uid()));

-- helper: notify every admin
CREATE OR REPLACE FUNCTION public.notify_admins(_type text, _title text, _message text, _link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (recipient_id, type, title, message, link)
  SELECT user_id, _type, _title, _message, _link FROM public.user_roles WHERE role = 'admin'
$$;

CREATE OR REPLACE FUNCTION public.log_activity(_client_id uuid, _type text, _message text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.activity_log (client_id, actor_id, type, message) VALUES (_client_id, auth.uid(), _type, _message);
  UPDATE public.clients SET last_activity_at = now() WHERE id = _client_id;
$$;

-- request submitted -> notify admin
CREATE OR REPLACE FUNCTION public.on_request_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cname text;
BEGIN
  SELECT full_name INTO cname FROM public.clients WHERE id = NEW.client_id;
  PERFORM public.notify_admins('request_new', 'New client request', coalesce(cname,'A client') || ' submitted a coaching request.', '/admin/requests');
  PERFORM public.log_activity(NEW.client_id, 'request_submitted', 'Submitted a coaching request');
  RETURN NEW;
END;
$$;
CREATE TRIGGER client_requests_notify AFTER INSERT ON public.client_requests FOR EACH ROW EXECUTE FUNCTION public.on_request_insert();

-- request reviewed -> notify client, sync client status
CREATE OR REPLACE FUNCTION public.on_request_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' THEN
      UPDATE public.clients SET status = 'active', trainer_id = coalesce(NEW.admin_id, auth.uid()) WHERE id = NEW.client_id;
      INSERT INTO public.notifications (recipient_id, type, title, message, link)
      VALUES (NEW.user_id, 'request_accepted', 'Request accepted', 'Your coach accepted your request. Your personalised plan is on its way.', '/app');
      PERFORM public.log_activity(NEW.client_id, 'request_accepted', 'Request accepted by coach');
    ELSIF NEW.status = 'rejected' THEN
      UPDATE public.clients SET status = 'rejected' WHERE id = NEW.client_id;
      INSERT INTO public.notifications (recipient_id, type, title, message, link)
      VALUES (NEW.user_id, 'request_rejected', 'Request not accepted', coalesce(NEW.rejection_reason, 'Your coach could not accept your request at this time.'), '/app');
      PERFORM public.log_activity(NEW.client_id, 'request_rejected', 'Request declined by coach');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER client_requests_review AFTER UPDATE ON public.client_requests FOR EACH ROW EXECUTE FUNCTION public.on_request_review();

-- client status change (hold / reactivate) -> notify client
CREATE OR REPLACE FUNCTION public.on_client_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.user_id IS NOT NULL THEN
    IF NEW.status = 'on_hold' THEN
      INSERT INTO public.notifications (recipient_id, type, title, message, link)
      VALUES (NEW.user_id, 'account_on_hold', 'Account on hold', 'Your account is currently on hold. Please contact your coach for more information.', '/app');
      PERFORM public.log_activity(NEW.id, 'on_hold', 'Account placed on hold');
    ELSIF NEW.status = 'active' AND OLD.status IN ('on_hold','archived') THEN
      INSERT INTO public.notifications (recipient_id, type, title, message, link)
      VALUES (NEW.user_id, 'account_reactivated', 'Account reactivated', 'Your account is active again. Your plan is available.', '/app');
      PERFORM public.log_activity(NEW.id, 'reactivated', 'Account reactivated');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER clients_status_notify AFTER UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.on_client_status_change();

-- plan published / updated -> notify client
CREATE OR REPLACE FUNCTION public.on_plan_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  SELECT user_id INTO uid FROM public.clients WHERE id = NEW.client_id;
  IF uid IS NULL THEN RETURN NEW; END IF;
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    INSERT INTO public.notifications (recipient_id, type, title, message, link)
    VALUES (uid, 'plan_published', 'New plan published', 'Your coach published "' || NEW.title || '". Open your plan to get started.', '/app/plan');
    PERFORM public.log_activity(NEW.client_id, 'plan_published', 'Plan published: ' || NEW.title);
  ELSIF NEW.status = 'published' AND NEW.content IS DISTINCT FROM OLD.content THEN
    INSERT INTO public.notifications (recipient_id, type, title, message, link)
    VALUES (uid, 'plan_updated', 'Plan updated', 'Your coach updated "' || NEW.title || '".', '/app/plan');
    PERFORM public.log_activity(NEW.client_id, 'plan_updated', 'Plan updated: ' || NEW.title);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER workout_plans_notify AFTER UPDATE ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION public.on_plan_change();

-- workout completed -> notify admin + activity
CREATE OR REPLACE FUNCTION public.on_session_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cname text;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT full_name INTO cname FROM public.clients WHERE id = NEW.client_id;
    PERFORM public.notify_admins('workout_completed', 'Workout completed', coalesce(cname,'A client') || ' completed ' || NEW.day_label || ' — ' || NEW.focus || '.', '/admin/clients/' || NEW.client_id::text);
    PERFORM public.log_activity(NEW.client_id, 'workout_completed', 'Completed ' || NEW.day_label || ' workout — ' || NEW.focus);
  ELSIF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' THEN
    PERFORM public.log_activity(NEW.client_id, 'workout_started', 'Started ' || NEW.day_label || ' workout');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER workout_sessions_notify AFTER UPDATE ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION public.on_session_change();

-- progress logged -> activity
CREATE OR REPLACE FUNCTION public.on_progress_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_activity(NEW.client_id, 'progress_logged',
    CASE WHEN NEW.weight_kg IS NOT NULL THEN 'Updated weight to ' || NEW.weight_kg::text || ' kg' ELSE 'Logged a progress entry' END);
  RETURN NEW;
END;
$$;
CREATE TRIGGER progress_entries_notify AFTER INSERT ON public.progress_entries FOR EACH ROW EXECUTE FUNCTION public.on_progress_insert();