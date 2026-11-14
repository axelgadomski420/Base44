-- V6: edycja profilu (avatar już jest w V1), rola MODERATOR, PURRE Premium, zgłoszenia (moderacja)
ALTER TABLE users DROP CHECK chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('BUYER','BREEDER','ADMIN','MODERATOR'));
ALTER TABLE users ADD COLUMN premium_until DATETIME(6) NULL;

CREATE TABLE reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reporter_id BIGINT NOT NULL,
    listing_id BIGINT NULL,
    reported_user_id BIGINT NULL,
    reason VARCHAR(30) NOT NULL,
    description VARCHAR(1000) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    resolved_by BIGINT NULL,
    resolution_note VARCHAR(1000) NULL,
    created_at DATETIME(6) NOT NULL,
    resolved_at DATETIME(6) NULL,
    CONSTRAINT chk_reports_reason CHECK (reason IN ('SPAM','FAKE_LISTING','PSEUDO_BREEDER','CRUELTY','SCAM','OTHER')),
    CONSTRAINT chk_reports_status CHECK (status IN ('PENDING','RESOLVED','DISMISSED')),
    INDEX idx_reports_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;