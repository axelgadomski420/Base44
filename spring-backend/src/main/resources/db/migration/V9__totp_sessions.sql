-- Faza 4: 2FA (TOTP) + sesje (refresh tokens)
ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    refresh_token_hash CHAR(64) NOT NULL UNIQUE,
    user_agent VARCHAR(255),
    ip VARCHAR(45),
    created_at TIMESTAMP(6) NOT NULL,
    last_used_at TIMESTAMP(6) NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);