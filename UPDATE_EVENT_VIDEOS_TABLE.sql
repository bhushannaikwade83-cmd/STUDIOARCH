-- Add 'type' column to event_videos table (BJNP approach)
-- This allows distinguishing between 'youtube' and 'upload' videos

ALTER TABLE event_videos ADD COLUMN type VARCHAR(20) DEFAULT 'upload';

-- Add comment for clarity
COMMENT ON COLUMN event_videos.type IS 'Type of video: youtube or upload';

-- Update existing YouTube videos
UPDATE event_videos
SET type = 'youtube'
WHERE youtube_id IS NOT NULL AND youtube_id != '';

-- Update existing uploaded videos
UPDATE event_videos
SET type = 'upload'
WHERE youtube_id IS NULL OR youtube_id = '';

-- Make type NOT NULL after migration
ALTER TABLE event_videos ALTER COLUMN type SET NOT NULL;

-- Optional: Add index for faster filtering
CREATE INDEX idx_event_videos_type ON event_videos(type);
