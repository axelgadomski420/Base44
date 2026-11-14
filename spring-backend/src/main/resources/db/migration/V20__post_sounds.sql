-- 0.5.0 Reels Studio: dźwięki i filtry jak TikTok
ALTER TABLE posts ADD COLUMN sound_id VARCHAR(64) NULL;
ALTER TABLE posts ADD COLUMN filter_id VARCHAR(32) NULL;
