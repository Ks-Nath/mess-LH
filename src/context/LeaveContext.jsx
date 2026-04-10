import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const LeaveContext = createContext(null);

export function LeaveProvider({ children }) {
    const [leaves, setLeaves] = useState({});
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (user?.hostelId) {
            fetchLeaves();
            // Realtime subscription removed to preserve Supabase quota.
            // With 600 students, every single student leaf addition triggering a full
            // refetch for the admin would exhaust limits rapidly.
        } else {
            setLeaves({});
            setLoading(false);
        }
    }, [user?.hostelId, user?.role]);

    const fetchLeaves = async () => {
        if (!user?.hostelId) return;
        setLoading(true);

        const PAGE_SIZE = 1000; // Increased to 1000 for efficiency with 600 students
        let allData = [];
        let from = 0;

        // Paginated fetch to bypass server-side row cap
        while (true) {
            let query = supabase
                .from('leaves')
                .select('leave_date, mess_number, is_admin_granted')
                .eq('status', 'Approved')
                .eq('hostel_id', user.hostelId)
                .range(from, from + PAGE_SIZE - 1);

            // If STUDENT, only fetch OWN leaves
            if (user.role !== 'admin' && user.messNumber) {
                query = query.eq('mess_number', user.messNumber);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching leaves:', error);
                return;
            }

            allData = allData.concat(data);
            if (data.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }

        // Transform records to map: { 'YYYY-MM-DD': [{ messNumber, isAdminGranted }] }
        const leavesMap = {};
        allData.forEach(record => {
            const d = record.leave_date;
            if (!leavesMap[d]) leavesMap[d] = [];

            const existing = leavesMap[d].find(l => l.messNumber === record.mess_number);
            
            if (!existing) {
                leavesMap[d].push({
                    messNumber: record.mess_number,
                    isAdminGranted: record.is_admin_granted
                });
            } else if (record.is_admin_granted && !existing.isAdminGranted) {
                existing.isAdminGranted = true;
            }
        });
        setLeaves(leavesMap);
        setLoading(false);
    };

    const getLeavesByDate = (date) => {
        return leaves[date] || [];
    };

    const isStudentOnLeave = (messNumber, date) => {
        const shapeDate = date.includes('T') ? date.split('T')[0] : date;
        return leaves[shapeDate]?.some(l => l.messNumber === messNumber);
    };

    const addLeave = async (messNumber, date, studentId, isAdminGranted = false) => {
        if (!user?.hostelId) return { success: false, error: 'No hostel assigned' };
        const shapeDate = date.includes('T') ? date.split('T')[0] : date;

        // CHECK IF ALREADY EXISTS (Local Check)
        if (leaves[shapeDate]?.some(l => l.messNumber === messNumber)) {
            return { success: true, alreadyExists: true };
        }

        // Optimistic update
        setLeaves(prev => {
            const current = prev[shapeDate] || [];
            if (current.some(l => l.messNumber === messNumber)) return prev;
            return {
                ...prev,
                [shapeDate]: [...current, { messNumber, isAdminGranted }]
            };
        });

        let sid = studentId;
        if (!sid) {
            const { data } = await supabase
                .from('students')
                .select('id')
                .eq('mess_number', messNumber)
                .eq('hostel_id', user.hostelId)
                .single();
            if (data) sid = data.id;
        }

        // Double check in DB to be strictly sure
        const { data: existing } = await supabase
            .from('leaves')
            .select('id')
            .eq('mess_number', messNumber)
            .eq('leave_date', shapeDate)
            .eq('hostel_id', user.hostelId)
            .maybeSingle();

        if (existing) {
            return { success: true, alreadyExists: true };
        }

        const { error } = await supabase.from('leaves').insert([{
            student_id: sid,
            mess_number: messNumber,
            leave_date: shapeDate,
            status: 'Approved',
            hostel_id: user.hostelId,
            is_admin_granted: isAdminGranted
        }]);

        if (error) {
            console.error('Error adding leave:', error);
            // Revert optimistic update
            fetchLeaves();
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    const addBulkLeaves = async (studentsList, date, isAdminGranted = false) => {
        if (!user?.hostelId) return { success: false, error: 'No hostel assigned' };
        const shapeDate = date.includes('T') ? date.split('T')[0] : date;

        const newEntries = studentsList.map(s => ({
            student_id: s.id,
            mess_number: s.messNumber,
            leave_date: shapeDate,
            status: 'Approved',
            hostel_id: user.hostelId,
            is_admin_granted: isAdminGranted
        }));

        // Optimistic update
        setLeaves(prev => {
            const current = prev[shapeDate] || [];
            const updated = [...current];
            newEntries.forEach(entry => {
                if (!updated.some(l => l.messNumber === entry.mess_number)) {
                    updated.push({ messNumber: entry.mess_number, isAdminGranted });
                }
            });
            return { ...prev, [shapeDate]: updated };
        });

        // Batched inserts of 100 records at a time
        const BATCH_SIZE = 100;
        for (let i = 0; i < newEntries.length; i += BATCH_SIZE) {
            const batch = newEntries.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('leaves').insert(batch);
            if (error) {
                console.error('Error adding bulk leaves:', error);
                fetchLeaves(); // Sync back
                return { success: false, error: error.message };
            }
        }
        return { success: true };
    };

    const removeLeave = async (messNumber, date) => {
        if (!user?.hostelId) return { success: false, error: 'No hostel assigned' };
        const shapeDate = date.includes('T') ? date.split('T')[0] : date;

        setLeaves(prev => {
            const current = prev[shapeDate] || [];
            return { ...prev, [shapeDate]: current.filter(l => l.messNumber !== messNumber) };
        });

        const { error } = await supabase
            .from('leaves')
            .delete()
            .eq('mess_number', messNumber)
            .eq('leave_date', shapeDate)
            .eq('hostel_id', user.hostelId);

        if (error) {
            console.error('Error removing leave:', error);
            fetchLeaves();
            return { success: false, error: error.message };
        }

        return { success: true };
    };

    const removeBulkLeaves = async (date) => {
        if (!user?.hostelId) return { success: false, error: 'No hostel assigned' };
        const shapeDate = date.includes('T') ? date.split('T')[0] : date;

        setLeaves(prev => {
            const { [shapeDate]: _, ...rest } = prev;
            return rest;
        });

        const { error } = await supabase
            .from('leaves')
            .delete()
            .eq('leave_date', shapeDate)
            .eq('hostel_id', user.hostelId);

        if (error) {
            console.error('Error removing bulk leaves:', error);
            fetchLeaves();
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    const addStudentLeavesBulk = async (studentId, messNumber, datesToAdd) => {
        if (!user?.hostelId || datesToAdd.length === 0) return { success: true };

        // Optimistic update
        setLeaves(prev => {
            const next = { ...prev };
            datesToAdd.forEach(date => {
                const shapeDate = date.includes('T') ? date.split('T')[0] : date;
                const current = next[shapeDate] || [];
                if (!current.some(l => l.messNumber === messNumber)) {
                    next[shapeDate] = [...current, { messNumber, isAdminGranted: false }];
                }
            });
            return next;
        });

        const newRecords = datesToAdd.map(date => ({
            student_id: studentId,
            mess_number: messNumber,
            leave_date: date.includes('T') ? date.split('T')[0] : date,
            status: 'Approved',
            hostel_id: user.hostelId,
            is_admin_granted: false
        }));

        const { error } = await supabase.from('leaves').insert(newRecords);

        if (error) {
            console.error('Error adding bulk student leaves:', error);
            fetchLeaves(); // Revert
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    const removeStudentLeavesBulk = async (messNumber, datesToRemove) => {
        if (!user?.hostelId || datesToRemove.length === 0) return { success: true };

        // Optimistic update
        setLeaves(prev => {
            const next = { ...prev };
            datesToRemove.forEach(date => {
                const shapeDate = date.includes('T') ? date.split('T')[0] : date;
                if (next[shapeDate]) {
                    next[shapeDate] = next[shapeDate].filter(l => l.messNumber !== messNumber);
                }
            });
            return next;
        });

        const shapeDates = datesToRemove.map(d => d.includes('T') ? d.split('T')[0] : d);

        const { error } = await supabase
            .from('leaves')
            .delete()
            .eq('mess_number', messNumber)
            .eq('hostel_id', user.hostelId)
            .in('leave_date', shapeDates);

        if (error) {
            console.error('Error removing bulk student leaves:', error);
            fetchLeaves(); // Revert
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    return (
        <LeaveContext.Provider value={{
            leaves,
            loading,
            getLeavesByDate,
            addLeave,
            addBulkLeaves,
            removeLeave,
            removeBulkLeaves,
            addStudentLeavesBulk,
            removeStudentLeavesBulk,
            isStudentOnLeave,
            refreshLeaves: fetchLeaves
        }}>
            {children}
        </LeaveContext.Provider>
    );
}

export function useLeaves() {
    const ctx = useContext(LeaveContext);
    if (!ctx) throw new Error('useLeaves must be used within a LeaveProvider');
    return ctx;
}
