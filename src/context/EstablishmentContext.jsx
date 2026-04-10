import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const EstablishmentContext = createContext(null);

function getMonthsInRange(startDateStr, endDate = new Date()) {
    if (!startDateStr) return [];
    const [sYear, sMonth] = startDateStr.split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    const months = [];
    let current = new Date(start);
    while (current <= end) {
        months.push(current.toISOString().slice(0, 7));
        current.setMonth(current.getMonth() + 1);
    }
    return months;
}

function getMonthsLate(feeMonth, today = new Date()) {
    const [fYear, fMonth] = feeMonth.split('-').map(Number);
    const dMonth = fMonth;
    const dYear = fMonth === 12 ? fYear + 1 : fYear;
    const deadline = new Date(dYear, dMonth % 12, 10, 23, 59, 59);
    if (today <= deadline) return 0;
    const yearDiff = today.getFullYear() - dYear;
    const monthDiff = today.getMonth() - (dMonth % 12);
    const totalMonths = yearDiff * 12 + monthDiff;
    return today.getDate() > 10 ? totalMonths + 1 : Math.max(totalMonths, 1);
}

export function EstablishmentProvider({ children }) {
    const { user } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Build a lookup map for O(1) payment status checks instead of O(n) .find() per call
    const paymentMap = useMemo(() => {
        const map = {};
        for (const p of payments) {
            map[`${p.studentId}|${p.month}|${p.feeType}`] = p;
        }
        return map;
    }, [payments]);

    const fetchPayments = useCallback(async () => {
        if (!user?.hostelId) {
            setPayments([]);
            setLoading(false);
            return;
        }

        try {
            // Only fetch the columns we actually use — saves bandwidth
            const { data, error } = await supabase
                .from('fee_payments')
                .select('id, student_id, mess_number, month, fee_type, is_paid, paid_date')
                .eq('hostel_id', user.hostelId)
                .order('month', { ascending: false });

            if (error) throw error;

            setPayments((data || []).map(p => ({
                id: p.id,
                studentId: p.student_id,
                messNumber: p.mess_number,
                month: p.month,
                feeType: p.fee_type,
                isPaid: p.is_paid,
                paidDate: p.paid_date,
                hostelId: user.hostelId,
            })));
        } catch (err) {
            console.error('Error fetching fee payments:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.hostelId]);

    useEffect(() => {
        if (user?.hostelId) {
            fetchPayments();
            // No realtime subscription — the admin is the only writer,
            // and we use optimistic updates. This saves Supabase realtime quota.
        } else {
            setPayments([]);
            setLoading(false);
        }
    }, [user?.hostelId, fetchPayments]);

    /**
     * Optimistically update local state so the UI is instant.
     * Only one DB call (upsert), no follow-up fetch.
     */
    const markAsPaid = async (studentId, messNumber, month, feeType) => {
        if (!user?.hostelId) return { success: false, error: 'No hostel' };

        const paidDate = new Date().toISOString().slice(0, 10);

        // Optimistic update
        setPayments(prev => {
            const idx = prev.findIndex(
                p => p.studentId === studentId && p.month === month && p.feeType === feeType
            );
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], isPaid: true, paidDate };
                return updated;
            }
            // Record doesn't exist locally yet — add it
            return [...prev, {
                id: crypto.randomUUID(),
                studentId,
                messNumber,
                month,
                feeType,
                isPaid: true,
                paidDate,
                hostelId: user.hostelId,
            }];
        });

        try {
            const { error } = await supabase
                .from('fee_payments')
                .upsert({
                    student_id: studentId,
                    mess_number: messNumber,
                    month,
                    fee_type: feeType,
                    is_paid: true,
                    paid_date: paidDate,
                    hostel_id: user.hostelId,
                }, { onConflict: 'student_id,month,fee_type' });

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('Error marking as paid:', err);
            // Revert on failure
            await fetchPayments();
            return { success: false, error: err.message };
        }
    };

    const markAsUnpaid = async (studentId, messNumber, month, feeType) => {
        if (!user?.hostelId) return { success: false, error: 'No hostel' };

        // Optimistic update
        setPayments(prev => {
            const idx = prev.findIndex(
                p => p.studentId === studentId && p.month === month && p.feeType === feeType
            );
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], isPaid: false, paidDate: null };
                return updated;
            }
            return [...prev, {
                id: crypto.randomUUID(),
                studentId,
                messNumber,
                month,
                feeType,
                isPaid: false,
                paidDate: null,
                hostelId: user.hostelId,
            }];
        });

        try {
            const { error } = await supabase
                .from('fee_payments')
                .upsert({
                    student_id: studentId,
                    mess_number: messNumber,
                    month,
                    fee_type: feeType,
                    is_paid: false,
                    paid_date: null,
                    hostel_id: user.hostelId,
                }, { onConflict: 'student_id,month,fee_type' });

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('Error marking as unpaid:', err);
            await fetchPayments();
            return { success: false, error: err.message };
        }
    };

    /**
     * O(1) lookup via the pre-built map instead of O(n) .find()
     */
    const getPaymentStatus = (studentId, month, feeType) => {
        const record = paymentMap[`${studentId}|${month}|${feeType}`];
        return record ? record.isPaid : false;
    };

    const getStudentPayments = (studentId) => {
        return payments.filter(p => p.studentId === studentId);
    };

    /**
     * Calculate total fine for a student for a given fee type.
     * Iterates from joinDate to referenceDate to include arrears.
     */
    const calculateFineForStudent = (studentId, joinDate, feeType, referenceDate = new Date()) => {
        if (!joinDate) return 0;
        
        const months = getMonthsInRange(joinDate, referenceDate);
        let totalFine = 0;
        for (const month of months) {
            const isPaid = getPaymentStatus(studentId, month, feeType);
            if (!isPaid) {
                totalFine += 100 * getMonthsLate(month, referenceDate);
            }
        }
        return totalFine;
    };

    const calculateFineForMonth = (month, referenceDate = new Date()) => {
        return 100 * getMonthsLate(month, referenceDate);
    };

    // Memoize the context value to prevent unnecessary re-renders of consumers
    const contextValue = useMemo(() => ({
        payments,
        loading,
        markAsPaid,
        markAsUnpaid,
        getPaymentStatus,
        getStudentPayments,
        calculateFineForStudent,
        calculateFineForMonth,
        fetchPayments,
    }), [payments, loading, paymentMap]);

    return (
        <EstablishmentContext.Provider value={contextValue}>
            {children}
        </EstablishmentContext.Provider>
    );
}

export function useEstablishment() {
    const ctx = useContext(EstablishmentContext);
    if (!ctx) throw new Error('useEstablishment must be used within an EstablishmentProvider');
    return ctx;
}
