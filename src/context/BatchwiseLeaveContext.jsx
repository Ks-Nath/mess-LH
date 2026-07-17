import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const BatchwiseLeaveContext = createContext(null);

export function BatchwiseLeaveProvider({ children }) {
    const [batchLeaves, setBatchLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchBatchLeaves = useCallback(async () => {
        if (!user?.hostelId) {
            setBatchLeaves([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('batchwise_leaves')
            .select('id, batch, start_date, end_date, created_at')
            .eq('hostel_id', user.hostelId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching batchwise leaves:', error);
        } else {
            setBatchLeaves(
                (data || []).map(r => ({
                    id: r.id,
                    batch: r.batch,
                    startDate: r.start_date,
                    endDate: r.end_date,
                    createdAt: r.created_at,
                }))
            );
        }
        setLoading(false);
    }, [user?.hostelId]);

    useEffect(() => {
        fetchBatchLeaves();
    }, [fetchBatchLeaves]);

    /**
     * Returns the number of UNIQUE batchwise leave days for a given batch in a given month.
     * Uses a Set to deduplicate overlapping grant ranges automatically.
     * @param {string} batch
     * @param {number} year  - full year e.g. 2026
     * @param {number} month - 0-indexed (0=Jan, 11=Dec)
     */
    const getBatchwiseDaysForMonth = useCallback(
        (batch, year, month) => {
            if (!batch) return 0;
            const uniqueDays = new Set();

            batchLeaves.forEach(grant => {
                if (grant.batch !== batch) return;

                const start = new Date(grant.startDate + 'T00:00:00');
                const end = new Date(grant.endDate + 'T00:00:00');
                const current = new Date(start);

                while (current <= end) {
                    if (current.getFullYear() === year && current.getMonth() === month) {
                        // Format as YYYY-MM-DD for deduplication key
                        const y = current.getFullYear();
                        const m = String(current.getMonth() + 1).padStart(2, '0');
                        const d = String(current.getDate()).padStart(2, '0');
                        uniqueDays.add(`${y}-${m}-${d}`);
                    }
                    current.setDate(current.getDate() + 1);
                }
            });

            return uniqueDays.size;
        },
        [batchLeaves]
    );

    /**
     * Returns an array of date strings ('YYYY-MM-DD') covered by batchwise leaves
     * for a given batch in a given month — for rendering on the calendar.
     * @param {string} batch
     * @param {number} year
     * @param {number} month - 0-indexed
     */
    const getBatchwiseDatesForMonth = useCallback(
        (batch, year, month) => {
            if (!batch) return [];
            const uniqueDays = new Set();

            batchLeaves.forEach(grant => {
                if (grant.batch !== batch) return;

                const start = new Date(grant.startDate + 'T00:00:00');
                const end = new Date(grant.endDate + 'T00:00:00');
                const current = new Date(start);

                while (current <= end) {
                    if (current.getFullYear() === year && current.getMonth() === month) {
                        const y = current.getFullYear();
                        const m = String(current.getMonth() + 1).padStart(2, '0');
                        const d = String(current.getDate()).padStart(2, '0');
                        uniqueDays.add(`${y}-${m}-${d}`);
                    }
                    current.setDate(current.getDate() + 1);
                }
            });

            return Array.from(uniqueDays).sort();
        },
        [batchLeaves]
    );

    /**
     * Admin: grant batchwise leave for a batch over a date range.
     */
    const addBatchwiseLeave = async (batch, startDate, endDate) => {
        if (!user?.hostelId || !user?.id) return { success: false, error: 'Not authenticated' };

        const { error } = await supabase.from('batchwise_leaves').insert([{
            hostel_id: user.hostelId,
            batch,
            start_date: startDate,
            end_date: endDate,
            granted_by: user.id,
        }]);

        if (error) {
            console.error('Error adding batchwise leave:', error);
            return { success: false, error: error.message };
        }

        await fetchBatchLeaves();
        return { success: true };
    };

    /**
     * Admin: delete a batchwise leave grant by ID.
     */
    const deleteBatchwiseLeave = async (id) => {
        if (!user?.hostelId) return { success: false, error: 'Not authenticated' };

        const { error } = await supabase
            .from('batchwise_leaves')
            .delete()
            .eq('id', id)
            .eq('hostel_id', user.hostelId);

        if (error) {
            console.error('Error deleting batchwise leave:', error);
            return { success: false, error: error.message };
        }

        await fetchBatchLeaves();
        return { success: true };
    };

    return (
        <BatchwiseLeaveContext.Provider value={{
            batchLeaves,
            loading,
            getBatchwiseDaysForMonth,
            getBatchwiseDatesForMonth,
            addBatchwiseLeave,
            deleteBatchwiseLeave,
            refreshBatchLeaves: fetchBatchLeaves,
        }}>
            {children}
        </BatchwiseLeaveContext.Provider>
    );
}

export function useBatchwiseLeaves() {
    const ctx = useContext(BatchwiseLeaveContext);
    if (!ctx) throw new Error('useBatchwiseLeaves must be used within a BatchwiseLeaveProvider');
    return ctx;
}
