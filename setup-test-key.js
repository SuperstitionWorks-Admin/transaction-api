const { createHash } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  console.log('Please run: SUPABASE_SERVICE_ROLE_KEY=your_key node setup-test-key.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function hashApiKey(apiKey) {
  return createHash('sha256').update(apiKey).digest('hex');
}

async function setupTestKey() {
  const testKey = 'test_key_12345';
  const hashedKey = hashApiKey(testKey);

  const { data, error } = await supabase
    .from('api_keys')
    .upsert(
      {
        name: 'Test API Key',
        key_hash: hashedKey,
        is_active: true,
        monthly_limit: 10000,
      },
      { onConflict: 'key_hash' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error creating test key:', error);
    process.exit(1);
  }

  console.log('✓ Test API key created successfully');
  console.log('  API Key:', testKey);
  console.log('  Key ID:', data.id);
}

setupTestKey().catch(console.error);
