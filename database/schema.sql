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

-- Unified characters table (includes main, alt, and their subclasses)
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
    character_type VARCHAR(20) NOT NULL CHECK (character_type IN ('main', 'alt', 'main_subclass', 'alt_subclass')),
    parent_character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX idx_characters_type ON characters(character_type);
CREATE INDEX idx_characters_discord_type ON characters(discord_id, character_type);
CREATE INDEX idx_characters_parent ON characters(parent_character_id);
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

-- Comments for clarity
COMMENT ON COLUMN characters.character_type IS 'Type: main, alt, main_subclass, alt_subclass';
COMMENT ON COLUMN characters.parent_character_id IS 'NULL for main/alt, references parent for subclasses';

-- Example queries:

-- Get main characters only:
-- SELECT * FROM characters WHERE discord_id = '123' AND character_type = 'main';

-- Get alts only:
-- SELECT * FROM characters WHERE discord_id = '123' AND character_type = 'alt';

-- Get subclasses for a main character:
-- SELECT * FROM characters WHERE parent_character_id = 5 AND character_type = 'main_subclass';

-- Get all characters for a user with hierarchy:
-- SELECT c.*, p.ign as parent_ign, p.character_type as parent_type
-- FROM characters c
-- LEFT JOIN characters p ON c.parent_character_id = p.id
-- WHERE c.discord_id = '123'
-- ORDER BY 
--   CASE character_type 
--     WHEN 'main' THEN 1 
--     WHEN 'main_subclass' THEN 2 
--     WHEN 'alt' THEN 3 
--     WHEN 'alt_subclass' THEN 4 
--   END,
--   c.created_at;
