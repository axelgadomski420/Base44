-- 0.5.0 M12: Wydarzenia — kalendarz wystaw i spotkań, bilety za PURRE Coins.
CREATE TABLE events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    kind VARCHAR(20) NOT NULL,
    city VARCHAR(120) NULL,
    region VARCHAR(120) NULL,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NULL,
    ticket_cost INT NOT NULL DEFAULT 0,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_event_kind CHECK (kind IN ('SHOW', 'MEET', 'ONLINE')),
    INDEX idx_events_starts (starts_at)
);

CREATE TABLE event_registrations (
    event_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id),
    CONSTRAINT fk_erev_event FOREIGN KEY (event_id) REFERENCES events(id),
    CONSTRAINT fk_erev_user FOREIGN KEY (user_id) REFERENCES users(id)
);
