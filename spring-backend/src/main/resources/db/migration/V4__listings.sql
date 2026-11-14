CREATE TABLE listings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    breeder_id BIGINT NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    species VARCHAR(10) NOT NULL,
    breed VARCHAR(120) NULL,
    price DECIMAL(10,2) NULL,
    currency VARCHAR(10) NULL,
    city VARCHAR(120) NULL,
    region VARCHAR(120) NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    status VARCHAR(10) NOT NULL,
    featured_until DATETIME(6) NULL,
    published_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_listing_breeder FOREIGN KEY (breeder_id) REFERENCES users(id),
    CONSTRAINT chk_listing_status CHECK (status IN ('ACTIVE','SOLD','HIDDEN')),
    CONSTRAINT chk_listing_species CHECK (species IN ('DOG','CAT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_listings_status ON listings (status, featured_until);
CREATE INDEX idx_listings_breeder ON listings (breeder_id);

CREATE TABLE listing_media (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    media_type VARCHAR(10) NOT NULL,
    url VARCHAR(500) NOT NULL,
    tag VARCHAR(60) NULL,
    position INT NOT NULL,
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_media_listing FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    CONSTRAINT chk_media_type CHECK (media_type IN ('IMAGE','VIDEO'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_media_listing ON listing_media (listing_id, position);
