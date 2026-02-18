/**
 * CrowdForms Supabase Client
 * 
 * This client connects to the CrowdForms Supabase project to fetch
 * form data and submit orders.
 */

import { createClient } from '@supabase/supabase-js';

const CROWDFORMS_URL = "https://fyyjmyhhsukfbiqnpplr.supabase.co";
const CROWDFORMS_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eWpteWhoc3VrZmJpcW5wcGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNjQ4MTMsImV4cCI6MjA3MDg0MDgxM30.xOHfMzMxYOaG-Q6FoUkNVzVvpkm8Gb_59qwSq0DdIcw";

export const crowdformsClient = createClient(CROWDFORMS_URL, CROWDFORMS_ANON_KEY);
