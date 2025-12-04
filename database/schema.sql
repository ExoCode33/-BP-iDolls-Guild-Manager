-- Main characters table
CREATE TABLE IF NOT EXISTS characters (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(20) NOT NULL,
    discord_name VARCHAR(100) NOT NULL,
    ign VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    class VARCHAR(50) NOT NULL,
    subclass VARCHAR(50) NOT NULL,
    ability_score INTEGER,
    timezone VARCHAR(50),
    guild VARCHAR(50) NOT NULL,
    is_main BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discord_id, ign)
);

-- Alt characters table
CREATE TABLE IF NOT EXISTS alt_characters (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(20) NOT NULL,
    main_character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    ign VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    class VARCHAR(50) NOT NULL,
    subclass VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(discord_id, ign)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_characters_discord_id ON characters(discord_id);
CREATE INDEX IF NOT EXISTS idx_alt_characters_discord_id ON alt_characters(discord_id);
CREATE INDEX IF NOT EXISTS idx_alt_characters_main_character_id ON alt_characters(main_character_id);

-- Composite index for better main character lookup performance
CREATE INDEX IF NOT EXISTS idx_characters_discord_main ON characters(discord_id, is_main);
