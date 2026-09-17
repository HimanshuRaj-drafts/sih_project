import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcodgjjbmuzkyefshqyn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjb2RnampibXV6a3llZnNocXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNjQ5NzYsImV4cCI6MjEwNDk0MDk3Nn0.-1fPXphdPi9kWyVQshjKEhSnd6mg3Qq8aEOfPPBnZ8A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase
    .from('cases')
    .select(`*`)
    .limit(5);
  
  console.log("Cases:", JSON.stringify(data, null, 2));
  if (error) console.error("Error:", error);
}

test();
