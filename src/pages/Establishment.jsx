import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Landmark, Receipt, AlertCircle, CalendarClock, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEstablishment } from '../context/EstablishmentContext';
import { useHostel } from '../context/HostelContext';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Establishment() {
    const { user } = useAuth();
    const { establishmentFee } = useHostel();
    const { getStudentPayments, calculateFineForStudent, calculateFineForMonth, loading } = useEstablishment();

    // Default to prior month since we usually collect fees after the month ends
    const [selectedMonth] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().slice(0, 7);
    });

    // Real-time student data sync (to catch fine updates from admin instantly)
    const [liveUser, setLiveUser] = useState(user);

    useEffect(() => {
        if (!user?.id) return;

        const subscription = supabase
            .channel(`student-updates-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'students',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    // Update the local state with the new data from DB (mapped to camelCase)
                    setLiveUser(prev => ({
                        ...prev,
                        name: payload.new.name,
                        messNumber: payload.new.mess_number,
                        phone: payload.new.phone,
                        roomNo: payload.new.room_no,
                        messStatus: payload.new.mess_status,
                        messType: payload.new.mess_type,
                        joinDate: payload.new.join_date,
                        legacyFines: Number(payload.new.legacy_fines) || 0
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user?.id]);

    if (loading) {
        return (
            <div className="space-y-8 p-4">
                <div className="h-12 w-48 bg-gray-100 rounded-xl animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    const studentPayments = getStudentPayments(user.id);

    // Get current month's explicitly requested records
    const currentMessPayment = studentPayments.find(p => p.month === selectedMonth && p.feeType === 'mess');
    const currentEstPayment = studentPayments.find(p => p.month === selectedMonth && p.feeType === 'establishment');

    const isMessPaid = currentMessPayment?.isPaid || false;
    const isEstPaid = currentEstPayment?.isPaid || false;

    // Determine effective join date (fallback if DB field is null)
    // Priority: Live Data > Context Data > Earliest Payment > Current Month
    const effectiveJoinDate = (liveUser.joinDate || user.joinDate)
        || (studentPayments.length > 0 
            ? studentPayments.map(p => p.month).sort()[0] 
            : new Date().toISOString().slice(0, 7));

    // Fines calculate across ALL history dynamically based on payment status + dates
    const totalMessFine = calculateFineForStudent(liveUser.id, effectiveJoinDate, 'mess');
    const totalEstFine = calculateFineForStudent(liveUser.id, effectiveJoinDate, 'establishment');
    const overallFine = totalMessFine + totalEstFine + (liveUser.legacyFines || 0);

    // Helper to get all months between two dates in YYYY-MM format.
    const getMonthsInRangeLocal = (startDateStr, endDate = new Date()) => {
        if (!startDateStr) return [];
        const [sYear, sMonth] = startDateStr.slice(0, 7).split('-').map(Number);
        const start = new Date(sYear, sMonth - 1, 1);
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        const months = [];
        let curr = new Date(start);
        while (curr <= end) {
            months.push(curr.toISOString().slice(0, 7));
            curr.setMonth(curr.getMonth() + 1);
        }
        return months;
    };

    const historyMonths = getMonthsInRangeLocal(effectiveJoinDate);
    const historyArray = historyMonths.map(month => {
        return {
            month,
            mess: studentPayments.find(p => p.month === month && p.feeType === 'mess'),
            est: studentPayments.find(p => p.month === month && p.feeType === 'establishment')
        };
    }).sort((a, b) => b.month.localeCompare(a.month));

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-12">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                    Establishment
                </h1>
                <p className="text-gray-500 mt-2">
                    View your Establishment fees and pending fines
                </p>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 gap-6">

                <Card className={`border-gray-200 shadow-sm relative overflow-hidden transition-all duration-300 ${overallFine > 0 ? 'bg-red-50 border-red-100' : 'bg-white'}`}>
                    {overallFine > 0 && <div className="absolute right-0 top-0 w-32 h-32 bg-red-100/50 rounded-bl-full -z-10" />}
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-5">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${overallFine > 0 ? 'bg-red-600' : 'bg-emerald-100'}`}>
                                <AlertCircle className={`w-6 h-6 ${overallFine > 0 ? 'text-white' : 'text-emerald-600'}`} />
                            </div>
                            <div>
                                <p className={`text-sm font-semibold ${overallFine > 0 ? 'text-red-600' : 'text-gray-500'}`}>Pending Fines</p>
                                <h3 className={`text-3xl font-black mt-0.5 ${overallFine > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                    ₹{overallFine.toLocaleString()}
                                </h3>
                            </div>
                        </div>
                        
                        {overallFine > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-red-100/50">
                                <div className="px-3 py-1.5 bg-white/60 rounded-lg border border-red-100 shadow-sm">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Mess Fine</span>
                                    <span className="text-sm font-bold text-red-600">₹{totalMessFine}</span>
                                </div>
                                <div className="px-3 py-1.5 bg-white/60 rounded-lg border border-red-100 shadow-sm">
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Est. Fine</span>
                                    <span className="text-sm font-bold text-red-600">₹{totalEstFine}</span>
                                </div>
                                {user.legacyFines > 0 && (
                                    <div className="px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100 shadow-sm">
                                        <span className="text-[10px] uppercase tracking-wider text-amber-600 font-bold block">Past Fines</span>
                                        <span className="text-sm font-bold text-amber-700">₹{user.legacyFines}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                All clear! Keep paying on time.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Current Status Card */}
            <Card className="border-gray-200 shadow-sm">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-5">
                    <CardTitle className="text-lg">Recent Summary: {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</CardTitle>
                    <CardDescription>Status for the most recently billed month</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                        {/* Mess Fee Row */}
                        <div className="flex items-center justify-between p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <Receipt className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Mess Fee</p>
                                    <p className="text-xs text-gray-500">Based on active days</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                isMessPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'
                            }`}>
                                {isMessPaid ? 'PAID' : 'UNPAID'}
                            </span>
                        </div>
                        
                        {/* Est Fee Row */}
                        <div className="flex items-center justify-between p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Landmark className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Establishment Fee</p>
                                    <p className="text-xs text-gray-500">Fixed monthly rate</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                isEstPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'
                            }`}>
                                {isEstPaid ? 'PAID' : 'UNPAID'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* History Table */}
            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-5">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-500" />
                        <CardTitle className="text-lg">Payment History</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Month</th>
                                    <th className="px-6 py-4 text-center">Mess Fee</th>
                                    <th className="px-6 py-4 text-center">Est. Fee</th>
                                    <th className="px-6 py-4 text-right">Fine Incurred</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {historyArray.map((row) => {
                                    const mPaid = row.mess?.isPaid;
                                    const ePaid = row.est?.isPaid;
                                    
                                    const mFine = !mPaid ? calculateFineForMonth(row.month) : 0;
                                    const eFine = !ePaid ? calculateFineForMonth(row.month) : 0;
                                    const thisMonthFine = mFine + eFine;

                                    return (
                                        <tr key={row.month} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {new Date(row.month + '-01').toLocaleString('default', { month: 'short', year: 'numeric' })}
                                            </td>
                                            
                                            <td className="px-6 py-4 text-center">
                                                {mPaid ? (
                                                    <span className="text-emerald-600 font-medium text-xs">Paid on {row.mess?.paidDate}</span>
                                                ) : (
                                                    <span className="text-red-500 font-medium text-xs">— Pending —</span>
                                                )}
                                            </td>
                                            
                                            <td className="px-6 py-4 text-center">
                                                {ePaid ? (
                                                    <span className="text-emerald-600 font-medium text-xs">Paid on {row.est?.paidDate}</span>
                                                ) : (
                                                    <span className="text-red-500 font-medium text-xs">— Pending —</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                {thisMonthFine > 0 ? (
                                                    <span className="text-red-600 font-bold">₹{thisMonthFine}</span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {historyArray.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                            No payment records found yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
