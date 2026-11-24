import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'PUBLIC_SUPABASE_URL atau PUBLIC_SUPABASE_ANON_KEY belum diisi. ' +
    'Isi berkas .env di akar project, dan Environment Variables di Vercel.'
  );
}

export const supabase = createClient(url, key);
