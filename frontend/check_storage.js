import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStorage() {
  const { data, error } = await supabase.storage.from('ncrb-vault').list('');
  if (error) {
    console.error('Error fetching storage:', error);
  } else {
    console.log('Files at root:', data);
  }
}

checkStorage();
