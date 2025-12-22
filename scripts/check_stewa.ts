
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

console.log(`Using Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE (RLS Bypassed)' : 'ANON (Subject to RLS)'}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStewa() {
    console.log('--- Checking Data for stewa ---');

    // Check all users first
    const { data: allUsers, error: usersError } = await supabase
        .from('heart_rate_data')
        .select('username'); // Fetch all usernames

    if (usersError) {
        console.error('Error fetching users:', usersError);
    } else {
        const distinctUsers = Array.from(new Set(allUsers.map(u => u.username)));
        console.log('Available Usernames in DB:', distinctUsers);
    }

    // 1. Calculate Start of Week (Same logic as route.ts)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekISO = startOfWeek.toISOString();

    console.log(`Start of Week: ${startOfWeekISO} (Local: ${startOfWeek.toString()})`);

    // 2. Fetch all heart rate data for stewa
    const { data: allData, error } = await supabase
        .from('heart_rate_data')
        .select('*')
        .ilike('username', 'stewa') // Case insensitive check
        .order('timestamp', { ascending: true });

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (!allData || allData.length === 0) {
        console.log('No data found for user "stewa" (checked case-insensitive)');
        return;
    }

    console.log(`Total records for stewa: ${allData.length}`);

    // 3. Filter by date (JS-side to verify)
    const weeklyData = allData.filter(d => new Date(d.timestamp) >= startOfWeek);
    console.log(`Records since start of week: ${weeklyData.length}`);

    // 4. Count Points > 0
    const pointsRecords = weeklyData.filter(d => d.points > 0);
    console.log(`Records with points > 0 (Min BPM 125?): ${pointsRecords.length}`);

    // 5. Inspect a few records
    console.log('\n--- Sample Records (Points > 0) ---');
    pointsRecords.slice(0, 10).forEach(d => {
        console.log(`${d.timestamp}: BPM ${d.bpm}, Points ${d.points}`);
    });

    if (pointsRecords.length > 8) {
        console.log(`\nMISMATCH FOUND: DB has ${pointsRecords.length} minutes with points, but leaderboard shows 8.`);
        console.log('Potentially duplicate timestamps?');
        // check unique timestamps
        const uniqueTimestamps = new Set(pointsRecords.map(d => d.timestamp)).size;
        console.log(`Unique timestamps with points > 0: ${uniqueTimestamps}`);
    } else {
        console.log('\nMatches logic: count is ' + pointsRecords.length);
    }
}

checkStewa();
