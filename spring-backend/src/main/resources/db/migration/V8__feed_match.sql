-- V8: Faza 3 — adopcje (typ ogłoszenia) i Smart Match (preferencje)
ALTER TABLE listings ADD COLUMN listing_type VARCHAR(10) NOT NULL DEFAULT 'SALE';
ALTER TABLE listings ADD CONSTRAINT chk_listings_type CHECK (listing_type IN ('SALE','ADOPTION'));
CREATE INDEX idx_listings_type ON listings (listing_type);

CREATE TABLE match_preferences (
    user_id BIGINT PRIMARY KEY,
    species VARCHAR(10) NULL,
    breed VARCHAR(120) NULL,
    city VARCHAR(120) NULL,
    max_radius_km INT NOT NULL DEFAULT 50,
    updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;