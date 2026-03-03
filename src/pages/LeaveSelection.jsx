import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import LeaveCalendar from '../components/LeaveCalendar';
import { MAX_LEAVES_PER_MONTH } from '../data/mockData';
import { CalendarOff, Clock, Save, AlertTriangle, X, Info } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useLeaves } from '../context/LeaveContext';
import { useAuth } from '../context/AuthContext';
import { useHostel } from '../context/HostelContext';

export default function LeaveSelection() {
    const { user } = useAuth();
    const { getLeavesByDate, addLeave, removeLeave, leaves } = useLeaves();
    const { cutoffTime } = useHostel();

    const [today, setToday] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    // Update "today" every minute to ensure cutoff logic is always fresh
    useEffect(() => {
        const interval = setInterval(() => {
            setToday(new Date());
        }, 60000); // 1 minute
        return () => clearInterval(interval);
    }, []);

    // Derived state from Context (Real-time)
    // We need to scan all leaves to find ones for this user, OR efficient lookup if context supported it.
    // For now, we interact with "selectedDates" as a local staging, but strictly it should reflect DB + changes.
    // Let's make "selectedDates" initialized from DB, and "Save" commits them.
    // OR easier: Direct interaction if we want instant feedback? The prompt implied "Save" button. 
    // Let's keep "Save" flow: Local edits -> Save -> Push diffs.

    const [selectedDates, setSelectedDates] = useState([]);
    const [pendingChanges, setPendingChanges] = useState(false);

    // Initial load from DB
    useEffect(() => {
        if (!user) return;

        // Flatten context leaves structure { 'YYYY-MM-DD': [{ messNumber, isAdminGranted }] } to my dates [{ date, isAdminGranted }]
        const myLeaves = Object.entries(leaves).reduce((acc, [date, leafRecords]) => {
            const myRecord = leafRecords.find(l => l.messNumber === user.messNumber);
            if (myRecord) {
                acc.push({ date, isAdminGranted: myRecord.isAdminGranted });
            }
            return acc;
        }, []);

        setSelectedDates(myLeaves);
    }, [leaves, user]);

    const isTodayCutoffPassed = today.getHours() >= cutoffTime;

    // Count leaves selected in the currently viewed month (EXCLUDING admin-granted leaves)
    const leavesThisMonth = selectedDates.filter((l) => {
        if (l.isAdminGranted) return false;
        const d = new Date(l.date + 'T00:00:00');
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const remainingLeaves = MAX_LEAVES_PER_MONTH - leavesThisMonth;
    const isCapReached = remainingLeaves <= 0;

    const handleDateToggle = (dateStr) => {
        setPendingChanges(true); // Enable save button
        const isRemoving = selectedDates.some(l => l.date === dateStr);
        const existingRecord = selectedDates.find(l => l.date === dateStr);

        // If it's an admin leaf, don't allow student to remove it from here?
        // Actually, the prompt says "mark as purple and do not increase quota".
        // Usually admin leaves are "mandatory" or different. Let's make them non-removable if purple.
        if (existingRecord?.isAdminGranted) {
            toast.error("Admin-granted leaves cannot be modified.");
            return;
        }

        if (!isRemoving) {
            // Cutoff check
            const dateObj = new Date(dateStr + 'T00:00:00');
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const isTomorrow = dateObj.getTime() === tomorrow.getTime();
            const isTodayPassed = now.getHours() >= cutoffTime;

            if (isTomorrow && isTodayPassed) {
                toast.error(`Cutoff reached (8 PM). You can only apply for leave from day after tomorrow.`, {
                    position: 'bottom-center',
                    style: { borderRadius: '8px', background: '#1f2937', color: '#fff' },
                });
                return;
            }

            if (isCapReached) {
                // Check if the date being added belongs to the viewed month
                const d = new Date(dateStr + 'T00:00:00');
                if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                    toast.error(`Maximum ${MAX_LEAVES_PER_MONTH} leave days reached for this month`, {
                        position: 'bottom-center',
                        style: {
                            borderRadius: '8px',
                            background: '#1f2937',
                            color: '#fff',
                        },
                    });
                    return;
                }
            }
        }

        setSelectedDates((prev) =>
            isRemoving
                ? prev.filter((l) => l.date !== dateStr)
                : [...prev, { date: dateStr, isAdminGranted: false }].sort((a, b) => a.date.localeCompare(b.date))
        );
    };

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear((y) => y - 1);
        } else {
            setCurrentMonth((m) => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear((y) => y + 1);
        } else {
            setCurrentMonth((m) => m + 1);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        // Calculate diffs
        // Current DB state for this user
        const currentDbEntries = Object.entries(leaves).reduce((acc, [date, leafRecords]) => {
            const myRecord = leafRecords.find(l => l.messNumber === user.messNumber);
            if (myRecord) {
                acc.push({ date, isAdminGranted: myRecord.isAdminGranted });
            }
            return acc;
        }, []);

        const toAdd = selectedDates.filter(s => !currentDbEntries.some(db => db.date === s.date));
        const toRemove = currentDbEntries.filter(db => !selectedDates.some(s => s.date === db.date));

        if (toAdd.length === 0 && toRemove.length === 0) {
            toast('No changes to save');
            return;
        }

        toast.loading('Saving changes...', { id: 'saving' });

        try {
            // Final validation check for additions (Real-time cutoff enforcement)
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const isTodayPassed = now.getHours() >= cutoffTime;

            for (const date of toAdd) {
                const dateObj = new Date(date + 'T00:00:00');
                if (dateObj.getTime() === tomorrow.getTime() && isTodayPassed) {
                    throw new Error(`Cutoff passed for ${date}. Please refresh or adjust your selection.`);
                }
            }

            // Process Additions
            for (const entry of toAdd) {
                await addLeave(user.messNumber, entry.date, user.id, false);
            }

            // Process Removals
            for (const entry of toRemove) {
                await removeLeave(user.messNumber, entry.date);
            }

            toast.success('Leave preferences saved successfully', { id: 'saving' });
            setPendingChanges(false);
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to save changes', { id: 'saving' });
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    const futureDates = selectedDates.filter(l => l.date >= today.toISOString().split('T')[0]);

    // Progress colour: green → amber → red
    const getProgressColor = () => {
        const ratio = leavesThisMonth / MAX_LEAVES_PER_MONTH;
        if (ratio >= 1) return { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100' };
        if (ratio >= 0.8) return { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' };
        return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    };
    const progressColors = getProgressColor();
    const progressPercent = Math.min((leavesThisMonth / MAX_LEAVES_PER_MONTH) * 100, 100);

    return (
        <div className="space-y-8 animate-fade-in mx-auto">
            <Toaster />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Leave Management</h1>
                    <p className="text-gray-500 text-lg">Select dates you won't be eating at the mess.</p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Cutoff: {cutoffTime > 12 ? cutoffTime - 12 : cutoffTime}:00 {cutoffTime >= 12 ? 'PM' : 'AM'} daily</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Calendar Card */}
                <div className="lg:col-span-2 space-y-6">
                    {isTodayCutoffPassed ? (
                        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-amber-900">Today's Cutoff Passed ({cutoffTime > 12 ? cutoffTime - 12 : cutoffTime}:00 {cutoffTime >= 12 ? 'PM' : 'AM'})</p>
                                <p className="text-sm text-amber-700 mt-0.5">
                                    You can only apply for leave for <strong>day after tomorrow</strong> onwards.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <Info className="w-5 h-5 text-blue-600 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-blue-900">Advance Notice Required</p>
                                <p className="text-sm text-blue-700 mt-0.5">
                                    Same-day leave is not allowed. You can apply for leave from <strong>tomorrow</strong> onwards.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Warning when nearing or at limit */}
                    {remainingLeaves <= 2 && remainingLeaves > 0 && (
                        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                            <Info className="w-5 h-5 text-amber-600 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-amber-900">Almost at leave limit</p>
                                <p className="text-sm text-amber-700 mt-0.5">
                                    Only <strong>{remainingLeaves}</strong> leave {remainingLeaves === 1 ? 'day' : 'days'} remaining this month.
                                </p>
                            </div>
                        </div>
                    )}

                    {isCapReached && (
                        <div className="flex gap-3 p-4 bg-red-50 border border-red-100 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-red-900">Leave limit reached</p>
                                <p className="text-sm text-red-700 mt-0.5">
                                    You've used all <strong>{MAX_LEAVES_PER_MONTH}</strong> leave days for this month. Deselect a date to free up a slot.
                                </p>
                            </div>
                        </div>
                    )}

                    <Card className="border-gray-200 shadow-sm overflow-hidden">
                        <LeaveCalendar
                            currentMonth={currentMonth}
                            currentYear={currentYear}
                            selectedDates={selectedDates}
                            onDateToggle={handleDateToggle}
                            onPrevMonth={handlePrevMonth}
                            onNextMonth={handleNextMonth}
                            maxLeaves={MAX_LEAVES_PER_MONTH}
                            leavesUsedThisMonth={leavesThisMonth}
                            today={today}
                            cutoffTime={cutoffTime}
                        />
                    </Card>
                </div>

                {/* Selected Dates Panel */}
                <div className="lg:col-span-1">
                    <Card className="border-gray-200 shadow-sm h-full flex flex-col">
                        <CardHeader className="pb-4 border-b border-gray-100 bg-gray-50/50 space-y-4">
                            <CardTitle className="text-lg flex items-center justify-between">
                                Selected Dates
                                <Badge variant="secondary" className="bg-white border-gray-200">{futureDates.length}</Badge>
                            </CardTitle>

                            {/* Leave Quota Progress */}
                            <div className={`p-3 rounded-lg border ${progressColors.bg} ${progressColors.border}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-600">Monthly Quota</span>
                                    <span className={`text-xs font-bold ${progressColors.text}`}>
                                        {leavesThisMonth} / {MAX_LEAVES_PER_MONTH}
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-white/80 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ease-out ${progressColors.bar}`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5">
                                    {isCapReached
                                        ? 'No leaves remaining'
                                        : `${remainingLeaves} ${remainingLeaves === 1 ? 'day' : 'days'} remaining`
                                    }
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto max-h-[400px] p-0">
                            {futureDates.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <CalendarOff className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No upcoming leave dates selected.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {futureDates.map(entry => (
                                        <li key={entry.date} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                            <span className="text-sm font-medium text-gray-700">{formatDate(entry.date)}</span>
                                            {entry.isAdminGranted ? (
                                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">Admin</Badge>
                                            ) : (
                                                <button onClick={() => handleDateToggle(entry.date)} className="text-gray-400 hover:text-red-500 p-1">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
                            <Button onClick={handleSave} className="w-full" disabled={!pendingChanges}>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
