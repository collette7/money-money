const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function migrateSettings() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('Running AI settings migration...');
    
    const { error: alterError } = await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE public.ai_settings
        ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
      `
    });
    
    if (alterError) {
      console.error('Error adding metadata column:', alterError);
      return;
    }
    
    const { data, error: fetchError } = await supabase
      .from('ai_settings')
      .select('id, provider, metadata');
    
    if (fetchError) {
      console.error('Error fetching settings:', fetchError);
      return;
    }
    
    for (const setting of data || []) {
      if (setting.provider && !setting.metadata?.original_provider) {
        const { error: updateError } = await supabase
          .from('ai_settings')
          .update({
            metadata: {
              ...setting.metadata,
              original_provider: setting.provider
            }
          })
          .eq('id', setting.id);
        
        if (updateError) {
          console.error(`Error updating setting ${setting.id}:`, updateError);
        } else {
          console.log(`Updated setting ${setting.id}`);
        }
      }
    }
    
    console.log('AI settings migration completed!');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

migrateSettings();