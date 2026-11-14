-- 0.4.0 M7: indeksy pod profesjonalną wyszukiwarkę ogłoszeń
CREATE INDEX idx_listings_status_species ON listings (status, species);
CREATE INDEX idx_listings_city ON listings (city);
CREATE INDEX idx_listings_breed ON listings (breed);
CREATE INDEX idx_listings_created ON listings (created_at);
CREATE INDEX idx_listings_type ON listings (listing_type);
