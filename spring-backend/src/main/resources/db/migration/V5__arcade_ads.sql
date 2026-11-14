CREATE TABLE arcade_scores (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    game VARCHAR(40) NOT NULL,
    score INT NOT NULL,
    duration_seconds INT NOT NULL,
    coins_awarded INT NOT NULL DEFAULT 0,
    xp_awarded INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_score_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_score CHECK (score >= 0 AND duration_seconds >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_scores_user_created ON arcade_scores (user_id, created_at);
CREATE INDEX idx_scores_game ON arcade_scores (game, created_at);

CREATE TABLE daily_rewards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    reward_date DATE NOT NULL,
    streak INT NOT NULL,
    coins INT NOT NULL,
    claimed_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_daily_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_daily UNIQUE (user_id, reward_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ad_campaigns (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    advertiser_id BIGINT NULL,
    title VARCHAR(160) NOT NULL,
    image_url VARCHAR(500) NULL,
    target_url VARCHAR(500) NOT NULL,
    type VARCHAR(30) NOT NULL,
    price_coins INT NULL,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    active_from DATETIME(6) NOT NULL,
    active_until DATETIME(6) NOT NULL,
    impressions BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT chk_ad_type CHECK (type IN ('SPONSORED_LISTING','PARTNER','ADSENSE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ads_active ON ad_campaigns (active, active_from, active_until);

CREATE TABLE ad_impressions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    campaign_id BIGINT NOT NULL,
    user_id BIGINT NULL,
    placement VARCHAR(40) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_imp_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
