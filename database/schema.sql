-- Safe schema - only creates if not exists, never drops

-- Create custom sequence for characters table that reuses deleted IDs
CREATE SEQUENCE IF NOT EXISTS characters_id_seq START 1;

-- Function to get next available ID (fills gaps)
CREATE OR REPLACE FUNCTION get_next_character_id()
RETURNS INTEGER AS $$
DECLARE
    next_id INTEGER;
BEGIN
    -- Try to find the smallest gap in IDs
    SELECT MIN(id + 1) INTO next_id
    FROM characters
    WHERE (id + 1) NOT IN (SELECT id FROM characters);
    
    -- If no gap found, get the next ID after the max
    IF next_id IS NULL THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO next_id FROM characters;
    END IF;
    
    RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Unified characters table (includes main, alt, and their subclasses)
CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY DEFAULT get_next_character_id(),
    discord_id VARCHAR(20) NOT NULL,
    discord_name VARCHAR(100) NOT NULL,
    ign VARCHAR(100) NOT NULL,
    class VARCHAR(50) NOT NULL,
    subclass VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    ability_score INTEGER,
    guild VARCHAR(50),
    character_type VARCHAR(20) NOT NULL CHECK (character_type IN ('main', 'alt', 'main_subclass', 'alt_subclass')),
    parent_character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User timezones table (separate from characters)
CREATE TABLE IF NOT EXISTS user_timezones (
    discord_id VARCHAR(20) PRIMARY KEY,
    discord_name VARCHAR(100) NOT NULL,
    timezone VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries (only create if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_characters_discord_id') THEN
        CREATE INDEX idx_characters_discord_id ON characters(discord_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_characters_type') THEN
        CREATE INDEX idx_characters_type ON characters(character_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_characters_discord_type') THEN
        CREATE INDEX idx_characters_discord_type ON characters(discord_id, character_type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_characters_parent') THEN
        CREATE INDEX idx_characters_parent ON characters(parent_character_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_characters_guild') THEN
        CREATE INDEX idx_characters_guild ON characters(guild);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_characters_class') THEN
        CREATE INDEX idx_characters_class ON characters(class);
    END IF;
END $$;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_characters_updated_at') THEN
        CREATE TRIGGER update_characters_updated_at
            BEFORE UPDATE ON characters
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_timezones_updated_at') THEN
        CREATE TRIGGER update_user_timezones_updated_at
            BEFORE UPDATE ON user_timezones
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Comments for clarity
COMMENT ON COLUMN characters.character_type IS 'Type: main, alt, main_subclass, alt_subclass';
COMMENT ON COLUMN characters.parent_character_id IS 'NULL for main/alt, references parent for subclasses';
