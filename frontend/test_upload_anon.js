import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUploadAnon() {
  const fileContent = new Blob(['hello world'], { type: 'text/plain' });
  const fileName = `test_anon_${Date.now()}.txt`;
  
  console.log('Attempting to upload to ncrb-vault...');
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('ncrb-vault')
    .upload(`evidence/${fileName}`, fileContent, {
      upsert: true
    });
    
  if (uploadError) {
    console.error('Upload error:', uploadError);
  } else {
    console.log('Upload successful:', uploadData);
  }
}

testUploadAnon();
