const { createClient } = require('@supabase/supabase-js');

// Config from .env.local
const supabaseUrl = 'https://hqtalsezrmvfjtlgjrhj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxdGFsc2V6cm12Zmp0bGdqcmhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzA4MTksImV4cCI6MjA5MzY0NjgxOX0.H5p1Dc2_nDbrviDPOIpL9ysnB8zUBWv4Z518EK0-Ap0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error("Supabase error:", error.message);
  } else {
    console.log("Success! Users table exists and query succeeded.");
  }
}
check();
