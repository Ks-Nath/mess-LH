const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function count() {
    const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Total students in DB:', count);

    const { data: hostels } = await supabase.from('hostels').select('*');
    console.log('Hostels:', hostels);

    if (hostels && hostels.length > 0) {
        for (const hostel of hostels) {
            const { count: hCount } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true })
                .eq('hostel_id', hostel.id);
            console.log(`Hostel ${hostel.name} (ID: ${hostel.id}) has ${hCount} students`);
        }
    }
}

count();
