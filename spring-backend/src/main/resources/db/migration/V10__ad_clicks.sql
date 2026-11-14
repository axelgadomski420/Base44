-- 0.3.1: śledzenie kliknięć w reklamy (RODO: bez identyfikacji użytkownika)
ALTER TABLE ad_campaigns ADD COLUMN clicks BIGINT NOT NULL DEFAULT 0;
