import db from './db.js';

/**
 * Run alt character system migration
 * This will update the database schema to support alt characters
 */
export async function runAltSystemMigration() {
  console.log('🔄 [MIGRATION] Starting alt character system migration...');

  try {
    // Step 1: Check for existing alt_subclass entries
    const checkResult = await db.query(
      `SELECT COUNT(*) as count FROM characters WHERE character_type = 'alt_subclass'`
    );
    
    const altSubclassCount = parseInt(checkResult.rows[0].count);
    
    if (altSubclassCount > 0) {
      console.log(`⚠️  [MIGRATION] Found ${altSubclassCount} alt_subclass entries`);
      console.log('📝 [MIGRATION] Converting alt_subclass to alt...');
      
      // Convert alt_subclass to alt
      await db.query(
        `UPDATE characters SET character_type = 'alt' WHERE character_type = 'alt_subclass'`
      );
      
      console.log(`✅ [MIGRATION] Converted ${altSubclassCount} alt_subclass entries to alt`);
    } else {
      console.log('✅ [MIGRATION] No alt_subclass entries found');
    }

    // Step 2: Drop old constraint
    console.log('🔧 [MIGRATION] Updating character_type constraint...');
    await db.query(
      `ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_character_type_check`
    );
    
    // Step 3: Add new constraint without alt_subclass
    await db.query(
      `ALTER TABLE characters ADD CONSTRAINT characters_character_type_check 
       CHECK (character_type IN ('main', 'main_subclass', 'alt'))`
    );
    
    console.log('✅ [MIGRATION] Updated character_type constraint');

    // Step 4: Add performance indexes
    console.log('⚡ [MIGRATION] Adding performance indexes...');
    
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_characters_type_alt 
       ON characters(user_id, character_type) 
       WHERE character_type = 'alt'`
    );
    
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_characters_type_main 
       ON characters(user_id) 
       WHERE character_type = 'main'`
    );
    
    await db.query(
      `CREATE INDEX IF NOT EXISTS idx_characters_type_subclass 
       ON characters(user_id, parent_id) 
       WHERE character_type = 'main_subclass'`
    );
    
    console.log('✅ [MIGRATION] Added performance indexes');

    // Step 5: Verify the migration
    const verifyResult = await db.query(
      `SELECT character_type, COUNT(*) as count 
       FROM characters 
       GROUP BY character_type`
    );
    
    console.log('📊 [MIGRATION] Character type distribution:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.character_type}: ${row.count}`);
    });

    console.log('✅ [MIGRATION] Alt character system migration completed successfully!');
    return { success: true };

  } catch (error) {
    console.error('❌ [MIGRATION] Migration failed:', error);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * Check if migration is needed
 */
export async function needsMigration() {
  try {
    // Check if constraint allows alt_subclass
    const result = await db.query(`
      SELECT pg_get_constraintdef(oid) as def
      FROM pg_constraint 
      WHERE conname = 'characters_character_type_check'
    `);
    
    if (result.rows.length === 0) {
      // No constraint exists, definitely needs migration
      return true;
    }
    
    const constraintDef = result.rows[0].def;
    
    // If constraint includes 'alt_subclass', needs migration
    if (constraintDef.includes('alt_subclass')) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[MIGRATION] Error checking if migration needed:', error);
    return true; // Assume migration needed if check fails
  }
}

export default {
  runAltSystemMigration,
  needsMigration
};
