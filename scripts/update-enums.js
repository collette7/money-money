const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function updateEnums() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('Running enum update script...');
    
    const { error } = await supabase.rpc('update_ai_provider_enum', {
      new_values: ['gemini', 'minimax', 'moonshot']
    });
    
    if (error) {
      console.error('Error updating enum:', error);
      return;
    }
    
    console.log('Successfully updated app_ai_provider enum!');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

updateEnums();