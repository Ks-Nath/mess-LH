import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { ShieldCheck, Lock, Eye, EyeOff, Landmark, Receipt, AlertCircle, KeyRound, Calendar, Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '../../components/ui/button';
import { useStudents } from '../../context/StudentContext';
import { useEstablishment } from '../../context/EstablishmentContext';
import { useHostel } from '../../context/HostelContext';
import toast, { Toaster } from 'react-hot-toast';

const PASSCODE = import.meta.env.VITE_ESTABLISHMENT_PASSCODE;

export default function AdminEstablishment() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [showPasscode, setShowPasscode] = useState(false);
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const inputRef = useRef(null);

    // Data handling
    const { students, updateLegacyFine } = useStudents();
    const { establishmentFee } = useHostel();
    const {
        payments,
        markAsPaid,
        markAsUnpaid,
        getPaymentStatus,
        calculateFineForMonth,
        calculateFineForStudent
    } = useEstablishment();

    // Default to prior month since we usually collect fees after the month ends
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().slice(0, 7);
    });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!isAuthenticated && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAuthenticated]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (passcode === PASSCODE) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Incorrect passcode. Please try again.');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            setPasscode('');
            inputRef.current?.focus();
        }
    };

    const handleTogglePayment = async (studentId, messNumber, feeType, currentStatus) => {
        toast.loading(`Updating ${feeType === 'mess' ? 'Mess' : 'Est.'} payment...`, { id: 'payment_update' });
        
        let result;
        if (currentStatus) {
            result = await markAsUnpaid(studentId, messNumber, selectedMonth, feeType);
        } else {
            result = await markAsPaid(studentId, messNumber, selectedMonth, feeType);
        }

        if (result.success) {
            toast.success('Payment updated successfully', { id: 'payment_update' });
        } else {
            toast.error('Failed to update payment: ' + result.error, { id: 'payment_update' });
        }
    };

    // Calculate Fines for the selected month to show in the row
    const monthFinePerType = calculateFineForMonth(selectedMonth);

    // Calculate Summary Stats
    const totalCollected = payments.filter(p => p.isPaid).length * establishmentFee; // Basic estimation
    const pendingFines = students.reduce((sum, s) => {
        return sum + calculateFineForStudent(s.id, s.joinDate, 'mess') + calculateFineForStudent(s.id, s.joinDate, 'establishment') + (s.legacyFines || 0);
    }, 0);

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.messNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExportExcel = () => {
        const monthString = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'short', year: 'numeric' });
        
        const data = filteredStudents.map(student => {
            const isMessPaid = getPaymentStatus(student.id, selectedMonth, 'mess');
            const isEstPaid = getPaymentStatus(student.id, selectedMonth, 'establishment');
            const messFineThisMonth = !isMessPaid ? monthFinePerType : 0;
            const estFineThisMonth = !isEstPaid ? monthFinePerType : 0;
            const totalFines = calculateFineForStudent(student.id, student.joinDate, 'mess') + calculateFineForStudent(student.id, student.joinDate, 'establishment') + (student.legacyFines || 0);

            return {
                "Mess No": student.messNumber,
                "Student Name": student.name,
                "Mess Fee": isMessPaid ? 'PAID' : 'UNPAID',
                "Establishment Fee": isEstPaid ? 'PAID' : 'UNPAID',
                "Legacy Fines": student.legacyFines || 0,
                "Month Fines": messFineThisMonth + estFineThisMonth,
                "Total Fines": totalFines
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        // Auto-size columns slightly
        const wscols = [
            {wch: 10}, {wch: 25}, {wch: 15}, {wch: 20}, {wch: 12}, {wch: 12}, {wch: 12}
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Establishment_Data");
        XLSX.writeFile(wb, `Establishment_${monthString.replace(' ', '_')}.xlsx`);
    };

    // ── Passcode Gate ──
    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
                <div className="w-full max-w-md">
                    <Card
                        className={`border-gray-200 shadow-lg overflow-hidden transition-transform ${isShaking ? 'animate-shake' : ''}`}
                    >
                        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                        <CardContent className="p-8">
                            <div className="flex justify-center mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center shadow-inner">
                                    <KeyRound className="w-8 h-8 text-indigo-600" />
                                </div>
                            </div>
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Restricted Access</h2>
                                <p className="text-gray-500 mt-2 text-sm">Enter the establishment passcode to continue.</p>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200
                                    ${error
                                        ? 'border-red-300 bg-red-50/50 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100'
                                        : 'border-gray-200 bg-gray-50/50 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:bg-white'
                                    }`}>
                                    <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                                    <input
                                        ref={inputRef}
                                        id="establishment-passcode-input"
                                        type={showPasscode ? 'text' : 'password'}
                                        value={passcode}
                                        onChange={(e) => {
                                            setPasscode(e.target.value);
                                            setError('');
                                        }}
                                        placeholder="Enter passcode"
                                        className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-900 placeholder-gray-400"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasscode(!showPasscode)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                                        tabIndex={-1}
                                    >
                                        {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {error && (
                                    <div className="flex items-center gap-2 text-red-600 text-sm animate-fade-in">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                                <Button
                                    type="submit"
                                    id="establishment-passcode-submit"
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-md shadow-indigo-200 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-300 cursor-pointer"
                                >
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    Unlock Access
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // ── Main Content (after passcode) ──
    return (
        <div className="space-y-8 animate-fade-in">
            <Toaster />
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Establishment & Fees</h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Unlocked
                        </span>
                    </div>
                    <p className="text-gray-500 mt-1">Track monthly mess bills, establishment fees (₹{establishmentFee}), and calculate fines.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    {/* Excel Download */}
                    <button 
                        onClick={handleExportExcel}
                        className="h-9 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 hover:bg-emerald-100 flex items-center justify-center gap-2 shadow-sm font-medium text-sm transition-colors"
                    >
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span className="hidden sm:inline">Export</span>
                    </button>

                    {/* Search */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                        <Search className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search by name or number..."
                            className="text-sm outline-none text-gray-700 bg-transparent font-medium w-full sm:w-48"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Month Selector */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                            type="month"
                            className="text-sm outline-none text-gray-700 bg-transparent font-medium"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <Landmark className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-gray-500">Fixed Establishment Fee</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">₹{establishmentFee}</h3>
                        <p className="text-xs text-gray-400 mt-1">Per student per month. Change in Settings.</p>
                    </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-amber-600" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-gray-500">Total Unpaid Fines (All Months)</p>
                        <h3 className="text-3xl font-bold text-gray-900 mt-1">₹{pendingFines.toLocaleString()}</h3>
                        <p className="text-xs text-gray-400 mt-1">Cumulative mess & establishment fines combined</p>
                    </CardContent>
                </Card>
            </div>

            {/* Billing Table */}
            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                    <CardTitle className="text-lg">Payment Tracking — {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</CardTitle>
                    <CardDescription>
                        Fees are due by the 10th of the following month. 
                        {monthFinePerType > 0 ? (
                            <span className="text-red-500 font-medium ml-2">Fines active (₹{monthFinePerType} per unpaid fee).</span>
                        ) : (
                            <span className="text-emerald-600 font-medium ml-2">Still within deadline. No fines.</span>
                        )}
                    </CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Mess No</th>
                                <th className="px-6 py-4">Student Name</th>
                                <th className="px-6 py-4 text-center">Mess Fee</th>
                                <th className="px-6 py-4 text-center">Establishment Fee</th>
                                <th className="px-6 py-4 text-center">Past Fines</th>
                                <th className="px-6 py-4 text-right">Fines (This Month)</th>
                                <th className="px-6 py-4 text-right text-gray-400">Total Cumulative Fines</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredStudents.map((student) => {
                                const isMessPaid = getPaymentStatus(student.id, selectedMonth, 'mess');
                                const isEstPaid = getPaymentStatus(student.id, selectedMonth, 'establishment');
                                const isEnrolled = !student.joinDate || selectedMonth >= student.joinDate.slice(0, 7);
                                
                                const messFineThisMonth = (!isMessPaid && isEnrolled) ? monthFinePerType : 0;
                                const estFineThisMonth = (!isEstPaid && isEnrolled) ? monthFinePerType : 0;
                                const thisMonthFines = messFineThisMonth + estFineThisMonth;

                                const cumulativeMessFine = calculateFineForStudent(student.id, student.joinDate, 'mess');
                                const cumulativeEstFine = calculateFineForStudent(student.id, student.joinDate, 'establishment');
                                const totalFines = cumulativeMessFine + cumulativeEstFine + (student.legacyFines || 0);

                                return (
                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{student.messNumber}</td>
                                        <td className="px-6 py-4 text-gray-600">{student.name}</td>
                                        
                                        {/* Mess Fee Toggle */}
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleTogglePayment(student.id, student.messNumber, 'mess', isMessPaid)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                                    isMessPaid 
                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                }`}
                                            >
                                                {isMessPaid ? 'PAID' : 'UNPAID'}
                                            </button>
                                        </td>

                                        {/* Establishment Fee Toggle */}
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleTogglePayment(student.id, student.messNumber, 'establishment', isEstPaid)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                                    isEstPaid 
                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                }`}
                                            >
                                                {isEstPaid ? 'PAID' : 'UNPAID'}
                                            </button>
                                        </td>

                                        {/* Legacy Fines */}
                                        <td className="px-6 py-4 text-center">
                                            <div 
                                                className="cursor-pointer group flex items-center justify-center gap-1"
                                                onClick={() => {
                                                    const current = student.legacyFines || 0;
                                                    const val = window.prompt(`Update past/legacy fines for ${student.name}:`, current);
                                                    if (val !== null && !isNaN(val)) {
                                                        const newFine = parseInt(val, 10);
                                                        if (newFine !== current) {
                                                            toast.promise(
                                                                updateLegacyFine(student.id, newFine),
                                                                {
                                                                    loading: 'Updating fine...',
                                                                    success: 'Past fine updated!',
                                                                    error: 'Failed to update fine'
                                                                }
                                                            );
                                                        }
                                                    }
                                                }}
                                                title="Click to edit past fines"
                                            >
                                                <span className={`font-semibold border-b border-dashed ${student.legacyFines > 0 ? 'text-amber-600 border-amber-300' : 'text-gray-500 border-gray-300'} transition-colors group-hover:text-amber-700`}>
                                                    ₹{student.legacyFines || 0}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Fines for selected month */}
                                        <td className="px-6 py-4 text-right">
                                            {thisMonthFines > 0 ? (
                                                <span className="text-red-600 font-bold">₹{thisMonthFines}</span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>

                                        {/* Total Cumulative Fines */}
                                        <td className="px-6 py-4 text-right">
                                            {totalFines > 0 ? (
                                                <span className="text-amber-600 font-bold">₹{totalFines}</span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        {searchQuery ? 'No students found matching your search.' : 'No students found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
