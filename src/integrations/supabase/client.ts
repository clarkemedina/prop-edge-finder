import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cirbccredjxmyzpfvvil.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cqw11BoaV8msmQLlBkUNjw_akHAc_NO';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
