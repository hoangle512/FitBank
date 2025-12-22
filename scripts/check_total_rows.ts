
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role if available for unlimited access, though 1000 limit might apply to client unless configured? 
// Actually JS client returns paginated data by default (range 0-1000?).
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTotalRows() {
    console.log('--- Checking Total Rows for Week ---');

    // 1. Calculate Start of Week
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekISO = startOfWeek.toISOString();

    console.log(`Start of Week: ${startOfWeekISO}`);

    // 2. Count rows
    const { count, error } = await supabase
        .from('heart_rate_data')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', startOfWeekISO);

    if (error) {
        console.error('Error fetching count:', error);
        return;
    }

    console.log(`Total records since start of week: ${count}`);

    if (count !== null && count >= 1000) {
        console.log('WARNING: Row count hits default Supabase limit (1000). Pagination required.');
    } else {
        console.log('Row count is within default safe limits (<1000).');
    }
}

checkTotalRows();
