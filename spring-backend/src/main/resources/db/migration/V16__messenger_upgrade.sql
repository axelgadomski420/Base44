-- 0.5.0 M10: messenger — reakcje, odpowiedzi, edycja, usuwanie, blokowanie
ALTER TABLE messages
  ADD COLUMN reply_to_id BIGINT NULL AFTER sender_id,
  ADD COLUMN edited_at DATETIME(6) NULL AFTER created_at,
  ADD COLUMN deleted_at DATETIME(6) NULL AFTER edited_at;

CREATE TABLE message_reactions (
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    emoji VARCHAR(8) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (message_id, user_id),
    CONSTRAINT fk_reaction_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE blocked_users (
    blocker_id BIGINT NOT NULL,
    blocked_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT fk_block_blocker FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_block_blocked FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
