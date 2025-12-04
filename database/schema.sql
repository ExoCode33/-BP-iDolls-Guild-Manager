-- Drop old tables if they exist (fresh start)
DROP TABLE IF EXISTS alt_characters CASCADE;
DROP TABLE IF EXISTS characters CASCADE;
DROP TABLE IF EXISTS user_timezones CASCADE;
DROP SEQUENCE IF EXISTS characters_id_seq CASCADE;

-- Create custom sequence for characters table that reuses deleted IDs
CREATE SEQUENCE characters_id_seq START 1;

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

-- Unified characters table (includes both main and alt characters)
CREATE TABLE characters (
    id INTEGER PRIMARY KEY DEFAULT get_next_character_id(),
    discord_id VARCHAR(20) NOT NULL,
    discord_name VARCHAR(100) NOT NULL,
    ign VARCHAR(100) NOT NULL,
    class VARCHAR(50) NOT NULL,
    subclass VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    ability_score INTEGER,
    guild VARCHAR(50),
    is_main BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_discord_ign UNIQUE(discord_id, ign)
);

-- User timezones table (separate from characters)
CREATE TABLE user_timezones (
    discord_id VARCHAR(20) PRIMARY KEY,
    discord_name VARCHAR(100) NOT NULL,
    timezone VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX idx_characters_discord_id ON characters(discord_id);
CREATE INDEX idx_characters_is_main ON characters(is_main);
CREATE INDEX idx_characters_discord_main ON characters(discord_id, is_main);
CREATE INDEX idx_characters_guild ON characters(guild);
CREATE INDEX idx_characters_class ON characters(class);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_characters_updated_at
    BEFORE UPDATE ON characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_timezones_updated_at
    BEFORE UPDATE ON user_timezones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
