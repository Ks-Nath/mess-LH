import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const StudentContext = createContext(null);

export function StudentProvider({ children }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        // ONLY fetch students if the user is an ADMIN.
        // Regular students do not need the full registry.
        if (user?.hostelId && user?.role === 'admin') {
            fetchStudents();

            // Real-time subscription for student changes
            const subscription = supabase
                .channel('students-channel')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'students',
                        filter: `hostel_id=eq.${user.hostelId}`
                    },
                    () => {
                        fetchStudents();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        } else {
            setStudents([]);
            setLoading(false);
        }
    }, [user?.hostelId, user?.role]);

    const fetchStudents = async () => {
        if (!user?.hostelId || user?.role !== 'admin') return;

        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('hostel_id', user.hostelId)
                .order('mess_number', { ascending: true });

            if (error) throw error;

            // Map DB snake_case to camelCase used by the app
            const mapped = (data || []).map(s => ({
                id: s.id,
                name: s.name,
                messNumber: s.mess_number,
                phone: s.phone,
                role: 'user',
                roomNo: s.room_no,
                messStatus: s.mess_status,
                messType: s.mess_type,
                joinDate: s.join_date,
                legacyFines: s.legacy_fines || 0,
                hostelId: s.hostel_id,
            }));

            // Natural sort by mess number (handles "1", "2", "10" vs "1", "10", "2")
            mapped.sort((a, b) => {
                return a.messNumber.localeCompare(b.messNumber, undefined, { numeric: true, sensitivity: 'base' });
            });

            setStudents(mapped);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const addStudent = async (newStudent) => {
        if (!user?.hostelId) return { success: false, error: 'No hostel assigned' };

        try {
            const { data, error } = await supabase
                .from('students')
                .insert([{
                    name: newStudent.name,
                    mess_number: newStudent.messNumber,
                    phone: newStudent.phone,
                    room_no: newStudent.roomNo,
                    mess_status: newStudent.messStatus || 'Active',
                    mess_type: newStudent.messType || 'Veg',
                    join_date: newStudent.joinDate || new Date().toISOString().slice(0, 10),
                    hostel_id: user.hostelId,
                }])
                .select()
                .single();

            if (error) throw error;

            // Force refresh to ensure UI updates immediately
            await fetchStudents();

            return { success: true, data };
        } catch (error) {
            console.error('Error adding student:', error);
            return { success: false, error: error.message };
        }
    };

    const removeStudent = async (messNumber) => {
        if (!user?.hostelId) return { success: false, error: 'No hostel assigned' };

        try {
            const { error } = await supabase
                .from('students')
                .delete()
                .eq('mess_number', messNumber)
                .eq('hostel_id', user.hostelId);

            if (error) throw error;

            // Force refresh
            await fetchStudents();
            return { success: true };
        } catch (error) {
            console.error('Error removing student:', error);
            return { success: false, error: error.message };
        }
    };

    const getStudentByMessNumber = (messNumber) => {
        return students.find(s => s.messNumber === messNumber);
    };

    const updateLegacyFine = async (studentId, amount) => {
        if (!user?.hostelId) return { success: false, error: 'No hostel assigned' };

        try {
            const { error } = await supabase
                .from('students')
                .update({ legacy_fines: amount })
                .eq('id', studentId)
                .eq('hostel_id', user.hostelId);

            if (error) throw error;

            // Optimistic UI update
            setStudents(prev => prev.map(s => 
                s.id === studentId ? { ...s, legacyFines: amount } : s
            ));
            
            return { success: true };
        } catch (error) {
            console.error('Error updating legacy fine:', error);
            return { success: false, error: error.message };
        }
    };

    return (
        <StudentContext.Provider value={{ students, loading, addStudent, removeStudent, getStudentByMessNumber, updateLegacyFine }}>
            {children}
        </StudentContext.Provider>
    );
}

export function useStudents() {
    const ctx = useContext(StudentContext);
    if (!ctx) throw new Error('useStudents must be used within a StudentProvider');
    return ctx;
}
