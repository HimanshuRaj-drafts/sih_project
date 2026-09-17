import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// AUTHENTICATION
// ==========================================
export const auth = {
  async signUp(email, password, role, fullName) {
    // 1. Create the user in Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;

    // 2. Insert their role and name into the profiles table
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: authData.user.id, role: role, full_name: fullName }]);
      
      if (profileError) throw profileError;
    }
    return authData;
  },

  async fetchUserProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return data;
  }
};

// ==========================================
// STORAGE (VAULT)
// ==========================================
export const vault = {
  async uploadEvidence(file, fileName) {
    const { data, error } = await supabase.storage
      .from('ncrb-vault')
      .upload(`evidence/${fileName}`, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    return data.path;
  }
};

// ==========================================
// DATABASE (CASES)
// ==========================================
export const db = {
  async saveCaseMetadata(caseData) {
    const { data, error } = await supabase
      .from('cases')
      .insert([caseData])
      .select();
      
    if (error) throw error;
    return data;
  },

  async fetchCases() {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        file_name,
        document_hash,
        blockchain_tx_hash,
        created_at
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  }
};