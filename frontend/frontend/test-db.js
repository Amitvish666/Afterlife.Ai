import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hqtalsezrmvfjtlgjrhj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxdGFsc2V6cm12Zmp0bGdqcmhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzA4MTksImV4cCI6MjA5MzY0NjgxOX0.H5p1Dc2_nDbrviDPOIpL9ysnB8zUBWv4Z518EK0-Ap0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Testing app_users table...");
  const { data, error } = await supabase.from('app_users').select('*').limit(5);
  if (error) {
    console.error("Supabase error for app_users:", error.message);
  } else {
    console.log("Success! app_users table query succeeded. Data:", data);
  }
}

check();
