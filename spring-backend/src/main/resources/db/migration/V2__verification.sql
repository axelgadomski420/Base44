CREATE TABLE breeder_verifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL,
    kennel_number VARCHAR(120) NULL,
    kennel_union VARCHAR(120) NULL,
    risk_score INT NULL,
    ai_analysis TEXT NULL,
    rejection_reason VARCHAR(1000) NULL,
    decided_by BIGINT NULL,
    decided_at DATETIME(6) NULL,
    appeal_message VARCHAR(1000) NULL,
    appealed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_verif_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_verif_status CHECK (status IN ('PENDING','APPROVED','REJECTED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE verification_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    verification_id BIGINT NOT NULL,
    doc_type VARCHAR(40) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    stored_path VARCHAR(500) NOT NULL,
    size_bytes BIGINT NOT NULL,
    ocr_text MEDIUMTEXT NULL,
    purge_after DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_doc_verif FOREIGN KEY (verification_id) REFERENCES breeder_verifications(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE verification_access_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id BIGINT NOT NULL,
    accessed_by BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL,
    accessed_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_log_doc FOREIGN KEY (document_id) REFERENCES verification_documents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE verification_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    verification_id BIGINT NOT NULL,
    from_status VARCHAR(20) NULL,
    to_status VARCHAR(20) NOT NULL,
    note VARCHAR(1000) NULL,
    actor_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_hist_verif FOREIGN KEY (verification_id) REFERENCES breeder_verifications(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
