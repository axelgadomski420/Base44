-- 0.5.0 M8: profil zwierzaka + statusy ogłoszeń + sponsorowanie
ALTER TABLE listings
  ADD COLUMN gender VARCHAR(10) NULL AFTER breed,
  ADD COLUMN birth_date DATE NULL AFTER gender,
  ADD COLUMN color VARCHAR(80) NULL AFTER birth_date,
  ADD COLUMN coat VARCHAR(80) NULL AFTER color,
  ADD COLUMN character_desc TEXT NULL AFTER coat,
  ADD COLUMN parents TEXT NULL AFTER character_desc,
  ADD COLUMN pedigree BOOLEAN NOT NULL DEFAULT FALSE AFTER parents,
  ADD COLUMN vaccinated BOOLEAN NOT NULL DEFAULT FALSE AFTER pedigree,
  ADD COLUMN chipped BOOLEAN NOT NULL DEFAULT FALSE AFTER vaccinated,
  ADD COLUMN sponsored_until DATETIME(6) NULL AFTER featured_until;

ALTER TABLE listings DROP CHECK chk_listing_status;
ALTER TABLE listings ADD CONSTRAINT chk_listing_status CHECK (status IN ('ACTIVE','OPTION','RESERVED','SOLD','HIDDEN','PLANNED'));

CREATE INDEX idx_listings_gender ON listings (gender);
CREATE INDEX idx_listings_birth ON listings (birth_date);
CREATE INDEX idx_listings_sponsored ON listings (sponsored_until);
