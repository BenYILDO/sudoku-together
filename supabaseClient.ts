import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sdpncapummdhzlnxczlj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkcG5jYXB1bW1kaHpsbnhjemxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NTAzMzUsImV4cCI6MjA2NDIyNjMzNX0.ie5mz1r7MmTYMVsLpsLVslmHrZhyPFnyYlDDJkIsAzQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 