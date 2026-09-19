import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // I might need a service role key to create buckets? Wait, I will try anon key first.
const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
  const { data, error } = await supabase.storage.createBucket('ncrb-vault', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    fileSizeLimit: 52428800 // 50MB
  });
  if (error) {
    console.error('Error creating bucket:', error);
  } else {
    console.log('Bucket created:', data);
  }
}

createBucket();
