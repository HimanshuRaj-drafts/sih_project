import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCases() {
  const payload = {
    case_number: 'TEST-001',
    file_name: 'test.pdf',
    document_hash: '12345',
    blockchain_tx_hash: '0x123',
    uploader_id: 'd9b7f586-eb6b-4e89-8d76-c4f4a9b5f543' // arbitrary uuid just to test
  };
  const { data, error } = await supabase.from('cases').insert([payload]).select();
  if (error) {
    console.error('Error inserting into cases:', error);
  } else {
    console.log('Inserted:', data);
  }
}

testCases();
