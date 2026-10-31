import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { 
    ShieldCheck, 
    Lock, 
    Eye, 
    EyeOff, 
    Landmark, 
    Receipt, 
    AlertCircle, 
    KeyRound, 
    Calendar, 
    Search, 
    Download,
    CheckCheck,
    GraduationCap,
    X,
    Loader2,
    CheckCircle2,
    RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '../../components/ui/button';
import { useStudents } from '../../context/StudentContext';
import { useEstablishment } from '../../context/EstablishmentContext';
import { useHostel } from '../../context/HostelContext';
import { getISTDate, getISTDateString } from '../../lib/utils';
import { BATCHES } from '../../data/mockData';
import toast, { Toaster } from 'react-hot-toast';

// Remove local constant in favor of database-backed passcode from context
// const PASSCODE = import.meta.env.VITE_ESTABLISHMENT_PASSCODE;

export default function AdminEstablishment() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [showPasscode, setShowPasscode] = useState(false);
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const inputRef = useRef(null);

    // Data handling
    const { students, updateLegacyFine } = useStudents();
    const { establishmentFee, establishmentPasscode } = useHostel();
    const {
        payments,
        markAsPaid,
        markAsUnpaid,
        markBatchAsPaid,
        markBatchAsUnpaid,
        getPaymentStatus,
        calculateFineForMonth,
        calculateFineForStudent
    } = useEstablishment();

    // Default to prior month since we usually collect fees after the month ends
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = getISTDate();
        d.setMonth(d.getMonth() - 1);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBatchFilter, setSelectedBatchFilter] = useState('All');

    // Batch Payment Modal State
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchModalBatch, setBatchModalBatch] = useState('');
    const [batchModalMonth, setBatchModalMonth] = useState('');
    const [batchModalMode, setBatchModalMode] = useState('paid'); // 'paid' | 'unpaid'
    const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);

    // Dynamic list of available batches (combining predefined BATCHES and any set on students)
    const availableBatches = useMemo(() => {
        const set = new Set(BATCHES);
        students.forEach(s => {
            if (s.batch && s.batch.trim()) set.add(s.batch.trim());
        });
        return Array.from(set).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [students]);

    // Students in the modal's selected batch
    const modalBatchStudents = useMemo(() => {
        if (!batchModalBatch) return [];
        return students.filter(s => s.batch === batchModalBatch);
    }, [students, batchModalBatch]);

    // Modal batch stats for selected month
    const { modalBatchPaidCount, modalBatchUnpaidCount } = useMemo(() => {
        if (!batchModalBatch || !batchModalMonth) return { modalBatchPaidCount: 0, modalBatchUnpaidCount: 0 };
        let paid = 0;
        let unpaid = 0;
        modalBatchStudents.forEach(s => {
            const isPaid = getPaymentStatus(s.id, batchModalMonth, 'establishment');
            if (isPaid) paid++;
            else unpaid++;
        });
        return { modalBatchPaidCount: paid, modalBatchUnpaidCount: unpaid };
    }, [modalBatchStudents, batchModalMonth, getPaymentStatus]);

    // Relevant students to display in the modal based on mode ('paid' targets unpaid students, 'unpaid' targets paid)
    const relevantStudents = useMemo(() => {
        if (!batchModalBatch || !batchModalMonth) return [];
        return modalBatchStudents.filter(s => {
            const isPaid = getPaymentStatus(s.id, batchModalMonth, 'establishment');
            return batchModalMode === 'paid' ? !isPaid : isPaid;
        });
    }, [modalBatchStudents, batchModalMonth, batchModalMode, getPaymentStatus]);

    // Open Batch Modal helper
    const openBatchModal = (batchToSelect = null) => {
        const targetBatch = batchToSelect 
            || (selectedBatchFilter !== 'All' && selectedBatchFilter !== 'Unassigned' ? selectedBatchFilter : (availableBatches[0] || ''));
        setBatchModalBatch(targetBatch);
        setBatchModalMonth(selectedMonth);
        setBatchModalMode('paid');
        setIsBatchModalOpen(true);
    };

    // Auto-select all relevant students when batch, month, or mode changes
    useEffect(() => {
        if (!isBatchModalOpen || !batchModalBatch || !batchModalMonth) return;
        const ids = new Set(relevantStudents.map(s => s.id));
        setSelectedStudentIds(ids);
    }, [isBatchModalOpen, batchModalBatch, batchModalMonth, batchModalMode, relevantStudents]);

    const handleToggleStudent = (studentId) => {
        setSelectedStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.add(studentId);
            }
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedStudentIds.size === relevantStudents.length) {
            setSelectedStudentIds(new Set());
        } else {
            setSelectedStudentIds(new Set(relevantStudents.map(s => s.id)));
        }
    };

    const handleExecuteBatchPayment = async () => {
        if (!batchModalBatch) {
            toast.error('Please select a batch');
            return;
        }

        const studentsToProcess = modalBatchStudents.filter(s => selectedStudentIds.has(s.id));
        if (studentsToProcess.length === 0) {
            toast.error('No students selected to update');
            return;
        }

        setIsProcessingBatch(true);
        const modeLabel = batchModalMode === 'paid' ? 'paid' : 'unpaid';
        toast.loading(`Marking ${studentsToProcess.length} students as ${modeLabel}...`, { id: 'batch_update' });

        try {
            let result;
            if (batchModalMode === 'paid') {
                result = await markBatchAsPaid(studentsToProcess, batchModalMonth, 'establishment');
            } else {
                result = await markBatchAsUnpaid(studentsToProcess, batchModalMonth, 'establishment');
            }

            if (result.success) {
                toast.success(
                    `Marked ${studentsToProcess.length} students in "${batchModalBatch}" as ${modeLabel} for ${batchModalMonth}!`,
                    { id: 'batch_update' }
                );
                setIsBatchModalOpen(false);
            } else {
                toast.error(`Failed to update payments: ${result.error}`, { id: 'batch_update' });
            }
        } catch (err) {
            toast.error(`Error: ${err.message}`, { id: 'batch_update' });
        } finally {
            setIsProcessingBatch(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAuthenticated]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (passcode === establishmentPasscode) {
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

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            s.messNumber.toLowerCase().includes(searchQuery.toLowerCase());
        
        let matchesBatch = true;
        if (selectedBatchFilter === 'Unassigned') {
            matchesBatch = !s.batch;
        } else if (selectedBatchFilter !== 'All') {
            matchesBatch = s.batch === selectedBatchFilter;
        }

        return matchesSearch && matchesBatch;
    });

    // Counts for currently filtered batch view
    const { filteredBatchPaidCount, filteredBatchUnpaidCount } = useMemo(() => {
        if (selectedBatchFilter === 'All' || selectedBatchFilter === 'Unassigned') {
            return { filteredBatchPaidCount: 0, filteredBatchUnpaidCount: 0 };
        }
        let paid = 0;
        let unpaid = 0;
        filteredStudents.forEach(s => {
            const isPaid = getPaymentStatus(s.id, selectedMonth, 'establishment');
            if (isPaid) paid++;
            else unpaid++;
        });
        return { filteredBatchPaidCount: paid, filteredBatchUnpaidCount: unpaid };
    }, [filteredStudents, selectedBatchFilter, selectedMonth, getPaymentStatus]);

    // Shared logic helper to ensure Dashboard and Excel always match perfectly
    const getStudentStatusForMonth = (student, month = selectedMonth) => {
        const isMessPaid = getPaymentStatus(student.id, month, 'mess');
        const isEstPaid = getPaymentStatus(student.id, month, 'establishment');
        
        // Stricter Enrollment Check: Student must have a join date <= report month
        const studentJoinMonth = student.joinDate ? student.joinDate.slice(0, 7) : null;
        const isEnrolled = !!studentJoinMonth && month >= studentJoinMonth;
        
        const finePerType = calculateFineForMonth(month);
        const messFine = (isEnrolled && !isMessPaid) ? finePerType : 0;
        const estFine = (isEnrolled && !isEstPaid) ? finePerType : 0;
        
        const cumulativeFine = calculateFineForStudent(student.id, student.joinDate, 'mess') + 
                              calculateFineForStudent(student.id, student.joinDate, 'establishment') + 
                              (student.legacyFines || 0);
        
        return {
            isMessPaid,
            isEstPaid,
            isEnrolled,
            messFine,
            estFine,
            monthFines: messFine + estFine,
            totalFines: cumulativeFine
        };
    };

    const handleExportExcel = () => {
        const monthString = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'short', year: 'numeric' });
        
        const data = filteredStudents.map(student => {
            const status = getStudentStatusForMonth(student);

            return {
                "Mess No": student.messNumber,
                "Student Name": student.name,
                "Batch": student.batch || '—',
                "Mess Fee": status.isMessPaid ? 'PAID' : 'UNPAID',
                "Establishment Fee": status.isEstPaid ? 'PAID' : 'UNPAID',
                "Legacy Fines": student.legacyFines || 0,
                "Month Fines": status.monthFines,
                "Total Fines": status.totalFines
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        // Auto-size columns slightly
        const wscols = [
            {wch: 10}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 12}, {wch: 12}, {wch: 12}
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

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {/* Mark Batch Paid Button */}
                    <button 
                        onClick={() => openBatchModal()}
                        className="h-9 px-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg flex items-center justify-center gap-2 shadow-sm font-medium text-sm transition-all cursor-pointer"
                        title="Mark an entire batch as paid"
                    >
                        <CheckCheck className="w-4 h-4" />
                        <span>Mark Batch Paid</span>
                    </button>

                    {/* Excel Download */}
                    <button 
                        onClick={handleExportExcel}
                        className="h-9 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 hover:bg-emerald-100 flex items-center justify-center gap-2 shadow-sm font-medium text-sm transition-colors cursor-pointer"
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
                            className="text-sm outline-none text-gray-700 bg-transparent font-medium w-full sm:w-40"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Batch Filter */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                        <GraduationCap className="w-4 h-4 text-gray-400 shrink-0" />
                        <select
                            className="text-sm outline-none text-gray-700 bg-transparent font-medium cursor-pointer"
                            value={selectedBatchFilter}
                            onChange={(e) => setSelectedBatchFilter(e.target.value)}
                        >
                            <option value="All">All Batches</option>
                            {availableBatches.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                            <option value="Unassigned">No Batch</option>
                        </select>
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

            {/* Filtered Batch Banner */}
            {selectedBatchFilter !== 'All' && selectedBatchFilter !== 'Unassigned' && (
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-indigo-950 text-sm">{selectedBatchFilter}</h4>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                                    {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <p className="text-xs text-indigo-700 mt-0.5">
                                <span className="font-semibold text-emerald-700">{filteredBatchPaidCount} Paid</span>
                                {' • '}
                                <span className="font-semibold text-amber-700">{filteredBatchUnpaidCount} Unpaid</span>
                                {filteredBatchUnpaidCount > 0 && (
                                    <> (₹{(filteredBatchUnpaidCount * establishmentFee).toLocaleString()} pending)</>
                                )}
                                {' for '}
                                <span className="font-medium text-gray-700">
                                    {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'short', year: 'numeric' })}
                                </span>
                            </p>
                        </div>
                    </div>
                    {filteredBatchUnpaidCount > 0 && (
                        <button
                            onClick={() => openBatchModal(selectedBatchFilter)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Mark {selectedBatchFilter} as Paid
                        </button>
                    )}
                </div>
            )}

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
                                <th className="px-6 py-4">Batch</th>
                                <th className="px-6 py-4 text-center">Mess Fee</th>
                                <th className="px-6 py-4 text-center">Establishment Fee</th>
                                <th className="px-6 py-4 text-center">Past Fines</th>
                                <th className="px-6 py-4 text-right">Fines (This Month)</th>
                                <th className="px-6 py-4 text-right text-gray-400">Total Cumulative Fines</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredStudents.map((student) => {
                                const status = getStudentStatusForMonth(student);

                                return (
                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{student.messNumber}</td>
                                        <td className="px-6 py-4 text-gray-600">{student.name}</td>
                                        <td className="px-6 py-4">
                                            {student.batch ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                    {student.batch}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">—</span>
                                            )}
                                        </td>
                                        
                                        {/* Mess Fee Toggle */}
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleTogglePayment(student.id, student.messNumber, 'mess', status.isMessPaid)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                                    status.isMessPaid 
                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                }`}
                                            >
                                                {status.isMessPaid ? 'PAID' : 'UNPAID'}
                                            </button>
                                        </td>
                                        
                                        {/* Establishment Fee Toggle */}
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleTogglePayment(student.id, student.messNumber, 'establishment', status.isEstPaid)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                                    status.isEstPaid 
                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                }`}
                                            >
                                                {status.isEstPaid ? 'PAID' : 'UNPAID'}
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
                                            {status.monthFines > 0 ? (
                                                <span className="text-red-600 font-bold">₹{status.monthFines.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>

                                        {/* Total Cumulative Fines */}
                                        <td className="px-6 py-4 text-right">
                                            {status.totalFines > 0 ? (
                                                <span className="text-amber-600 font-bold">₹{status.totalFines.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                        {searchQuery || selectedBatchFilter !== 'All' ? 'No students found matching your filters.' : 'No students found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Mark Batch as Paid Modal */}
            {isBatchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-scale-up">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base">Mark Batch Payment</h3>
                                    <p className="text-xs text-gray-500">Establishment Fee (₹{establishmentFee} / student)</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBatchModalOpen(false)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-5">
                            {/* Batch and Month Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Select Batch</label>
                                    <select
                                        value={batchModalBatch}
                                        onChange={(e) => setBatchModalBatch(e.target.value)}
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                        <option value="" disabled>Choose a batch...</option>
                                        {availableBatches.map(b => {
                                            const count = students.filter(s => s.batch === b).length;
                                            return (
                                                <option key={b} value={b}>
                                                    {b} ({count} student{count !== 1 ? 's' : ''})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Fee Month</label>
                                    <input
                                        type="month"
                                        value={batchModalMonth}
                                        onChange={(e) => setBatchModalMonth(e.target.value)}
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Mode Selector (Paid / Unpaid) */}
                            <div className="flex items-center justify-between p-1 bg-gray-100 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setBatchModalMode('paid')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                        batchModalMode === 'paid'
                                            ? 'bg-white text-indigo-700 shadow-xs'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    Mark as Paid
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBatchModalMode('unpaid')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                        batchModalMode === 'unpaid'
                                            ? 'bg-white text-red-600 shadow-xs'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    Mark as Unpaid (Undo)
                                </button>
                            </div>

                            {/* Batch Summary Stats */}
                            {batchModalBatch && (
                                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Batch Total</p>
                                            <p className="text-lg font-bold text-gray-900 mt-0.5">{modalBatchStudents.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-emerald-600 font-medium">Already Paid</p>
                                            <p className="text-lg font-bold text-emerald-600 mt-0.5">{modalBatchPaidCount}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-amber-600 font-medium">Pending Unpaid</p>
                                            <p className="text-lg font-bold text-amber-600 mt-0.5">{modalBatchUnpaidCount}</p>
                                        </div>
                                    </div>

                                    {batchModalMode === 'paid' && modalBatchUnpaidCount === 0 && (
                                        <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs">
                                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                            <span>All students in <strong>{batchModalBatch}</strong> are already marked as paid for this month!</span>
                                        </div>
                                    )}

                                    {batchModalMode === 'unpaid' && modalBatchPaidCount === 0 && (
                                        <div className="mt-3 p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center gap-2 text-gray-600 text-xs">
                                            <AlertCircle className="w-4 h-4 shrink-0 text-gray-400" />
                                            <span>No students in <strong>{batchModalBatch}</strong> are marked as paid for this month.</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Student Checklist */}
                            {batchModalBatch && relevantStudents.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                                        <span>
                                            {batchModalMode === 'paid' ? 'Unpaid Students' : 'Paid Students'} ({selectedStudentIds.size}/{relevantStudents.length} selected)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleToggleSelectAll}
                                            className="text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                                        >
                                            {selectedStudentIds.size === relevantStudents.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>

                                    <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
                                        {relevantStudents.map(student => {
                                            const isChecked = selectedStudentIds.has(student.id);
                                            return (
                                                <label
                                                    key={student.id}
                                                    className="flex items-center gap-3 px-3.5 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleToggleStudent(student.id)}
                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                                                    />
                                                    <span className="font-mono text-xs font-bold text-gray-700 w-16">
                                                        {student.messNumber}
                                                    </span>
                                                    <span className="text-xs font-medium text-gray-900 flex-1 truncate">
                                                        {student.name}
                                                    </span>
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                        batchModalMode === 'paid' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                                    }`}>
                                                        {batchModalMode === 'paid' ? 'UNPAID' : 'PAID'}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Amount Summary */}
                            {batchModalMode === 'paid' && selectedStudentIds.size > 0 && (
                                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                                    <span className="text-indigo-900 font-medium">Total Collection to Record:</span>
                                    <span className="text-indigo-950 font-bold text-sm">
                                        ₹{(selectedStudentIds.size * establishmentFee).toLocaleString()} 
                                        <span className="text-xs font-normal text-indigo-700 ml-1">
                                            ({selectedStudentIds.size} × ₹{establishmentFee})
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsBatchModalOpen(false)}
                                disabled={isProcessingBatch}
                                className="text-xs cursor-pointer"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleExecuteBatchPayment}
                                disabled={!batchModalBatch || selectedStudentIds.size === 0 || isProcessingBatch}
                                className={`text-xs cursor-pointer font-semibold ${
                                    batchModalMode === 'paid'
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                        : 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                                }`}
                            >
                                {isProcessingBatch ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        Updating...
                                    </>
                                ) : batchModalMode === 'paid' ? (
                                    <>
                                        <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                                        Mark {selectedStudentIds.size} as Paid
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                        Mark {selectedStudentIds.size} as Unpaid
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
