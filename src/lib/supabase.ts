import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ycoxhupuumiasqzccove.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hodXB1dW1pYXNxemNjb3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMzYxMjUsImV4cCI6MjA2MTcxMjEyNX0.igTybks4U_g5qo8b4VK9D11M7HNRCU5ET1RyDG8gP7s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);