-- 0.4.0 M4: multimedia w messengerze
ALTER TABLE messages ADD COLUMN attachment_url VARCHAR(500) NULL;
ALTER TABLE messages ADD COLUMN attachment_type VARCHAR(20) NULL;
ALTER TABLE messages ADD COLUMN attachment_name VARCHAR(200) NULL;
