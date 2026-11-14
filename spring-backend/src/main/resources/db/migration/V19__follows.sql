-- 0.5.0 M13: Obserwowanie hodowców + podstawa Trust Score.
CREATE TABLE follows (
    follower_id BIGINT NOT NULL,
    breeder_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, breeder_id),
    CONSTRAINT fk_follow_follower FOREIGN KEY (follower_id) REFERENCES users(id),
    CONSTRAINT fk_follow_breeder FOREIGN KEY (breeder_id) REFERENCES users(id),
    INDEX idx_follows_breeder (breeder_id)
);
