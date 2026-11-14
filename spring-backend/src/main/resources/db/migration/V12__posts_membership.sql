-- 0.4.0 M5: posty / reels + pakiety członkowskie (paywall)
CREATE TABLE posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    caption VARCHAR(2000) NOT NULL,
    post_type VARCHAR(10) NOT NULL,
    media_json TEXT NULL,
    likes INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_post_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_post_type CHECK (post_type IN ('POST','REEL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_posts_created ON posts (created_at);
CREATE INDEX idx_posts_user ON posts (user_id, created_at);

CREATE TABLE post_likes (
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (post_id, user_id),
    CONSTRAINT fk_like_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_like_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users ADD COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'FREE';
ALTER TABLE users ADD COLUMN plan_until DATETIME(6) NULL;
