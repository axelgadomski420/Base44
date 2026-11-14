-- PURRE PETS: naprawa uprawnień PostgreSQL (błąd 42501 "permission denied for schema public").
-- Uruchom jako superuser:
--   sudo -u postgres psql -d purrepets -f backend/scripts/fix-db-perms.sql
-- Zmienna &lt;app_user&gt; poniżej = użytkownik z DATABASE_URL (domyślnie "postgres").

-- 1. Uprawnienia do schematu public (PostgreSQL 15+ domyślnie zamyka public dla nie-superuserów).
GRANT USAGE, CREATE ON SCHEMA public TO PUBLIC;
ALTER SCHEMA public OWNER TO postgres;
GRANT ALL ON SCHEMA public TO postgres;

-- 2. Właściciel wszystkich istniejących tabel/sekwencji/widoków w schemacie public.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO postgres', r.tablename);
  END LOOP;
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO postgres', r.sequencename);
  END LOOP;
  FOR r IN SELECT viewname FROM pg_views WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER VIEW public.%I OWNER TO postgres', r.viewname);
  END LOOP;
END $$;

-- 3. Pełne uprawnienia do wszystkich tabel i sekwencji (INSERT/UPDATE/DELETE/SELECT + nextval).
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- 4. Domyślne uprawnienia dla przyszłych tabel tworzonych przez migracje Prisma.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
