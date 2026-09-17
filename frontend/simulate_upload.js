import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  // First create a mock user and login
  const email = `test_${Date.now()}@example.com`;
  const password = 'password123';
  
  console.log('Signing up user...');
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  console.log('User signed up:', authData.user?.id);
  
  // Try to upload a dummy file to ncrb-vault
  const fileContent = new Blob(['hello world'], { type: 'text/plain' });
  const fileName = `test_${Date.now()}.txt`;
  
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

testUpload();
