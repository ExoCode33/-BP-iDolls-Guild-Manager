CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  ign VARCHAR(255) NOT NULL,
  class VARCHAR(100) NOT NULL,
  subclass VARCHAR(100) NOT NULL,
  ability_score VARCHAR(50) NOT NULL,
  guild VARCHAR(100),
  role VARCHAR(50),
  character_type VARCHAR(50) NOT NULL,
  parent_character_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_timezones (
  user_id VARCHAR(20) PRIMARY KEY,
  timezone VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_character_type ON characters(character_type);
CREATE INDEX IF NOT EXISTS idx_parent_character_id ON characters(parent_character_id);
