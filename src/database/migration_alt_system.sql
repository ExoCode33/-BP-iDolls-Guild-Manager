-- ═══════════════════════════════════════════════════════════════════
-- ALT CHARACTER SYSTEM - DATABASE MIGRATION
-- ═══════════════════════════════════════════════════════════════════
-- Version: 1.0.0
-- Date: 2026-01-03
-- Description: Removes alt_subclass support and ensures schema is ready
-- ═══════════════════════════════════════════════════════════════════

-- STEP 1: Check for existing alt_subclass entries
-- ════════════════════════════════════════════════════════════════════
SELECT COUNT(*) as alt_subclass_count 
FROM characters 
WHERE character_type = 'alt_subclass';

-- If the count is > 0, you need to decide how to handle them:
-- Option A: Convert to regular alts
-- UPDATE characters SET character_type = 'alt' WHERE character_type = 'alt_subclass';

-- Option B: Delete them (if they're invalid/test data)
-- DELETE FROM characters WHERE character_type = 'alt_subclass';


-- STEP 2: Remove old constraint and add new one
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_character_type_check;

ALTER TABLE characters ADD CONSTRAINT characters_character_type_check 
  CHECK (character_type IN ('main', 'main_subclass', 'alt'));


-- STEP 3: Verify the schema
-- ════════════════════════════════════════════════════════════════════

-- Check constraint is correct
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'characters_character_type_check';

-- Verify character type distribution
SELECT character_type, COUNT(*) as count 
FROM characters 
GROUP BY character_type;


-- STEP 4: Add indexes for better performance (optional but recommended)
-- ════════════════════════════════════════════════════════════════════

-- Index for finding alts
CREATE INDEX IF NOT EXISTS idx_characters_type_alt 
ON characters(user_id, character_type) 
WHERE character_type = 'alt';

-- Index for finding mains
CREATE INDEX IF NOT EXISTS idx_characters_type_main 
ON characters(user_id) 
WHERE character_type = 'main';

-- Index for finding subclasses
CREATE INDEX IF NOT EXISTS idx_characters_type_subclass 
ON characters(user_id, parent_id) 
WHERE character_type = 'main_subclass';


-- STEP 5: Verify everything is working
-- ════════════════════════════════════════════════════════════════════

-- Test inserting an alt (should work)
-- INSERT INTO characters (user_id, ign, uid, class, subclass, ability_score, guild, character_type, created_at, updated_at)
-- VALUES ('test_user_id', 'TestAlt', '999999', 'Frost Mage', 'Icicle', '40-42k', 'Visitor', 'alt', NOW(), NOW());

-- Test inserting an alt_subclass (should FAIL with constraint violation)
-- INSERT INTO characters (user_id, ign, uid, class, subclass, ability_score, guild, character_type, created_at, updated_at)
-- VALUES ('test_user_id', 'TestAltSub', '888888', 'Stormblade', 'Iaido Slash', '40-42k', 'Visitor', 'alt_subclass', NOW(), NOW());

-- Clean up test data
-- DELETE FROM characters WHERE user_id = 'test_user_id';


-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════
-- Next steps:
-- 1. Deploy new bot code with alt character system
-- 2. Test alt registration, editing, deletion
-- 3. Monitor logs for any issues
-- 4. Update Google Sheets integration to use orange color for alts
-- ═══════════════════════════════════════════════════════════════════
