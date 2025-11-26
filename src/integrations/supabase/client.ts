// Compat shim: re-export client that uses fetch-based `db` (server API)
import { supabase } from '@/lib/db';

export { supabase };
export default supabase;
