import { useAuth } from '../context/AuthContext';
import { useLeaves } from '../context/LeaveContext';
import { useHostel } from '../context/HostelContext';
import { Receipt, Calendar, Minus, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';

export default function MessBill() {
    const { user } = useAuth();
    const { getLeavesByDate, loading: leavesLoading } = useLeaves();
    const { messRate } = useHostel();

    if (!user) return <div className="p-8 text-center">Please log in to view bill.</div>;

    // Calculate bill for current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Get total days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Calculate leaves taken this month
    let leaveCount = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const leavesOnDay = getLeavesByDate(dateKey) || [];
        // leavesOnDay is now [{ messNumber, isAdminGranted }, ...]
        if (leavesOnDay.some(l => l.messNumber === user.messNumber)) {
            leaveCount++;
        }
    }

    const activeDays = daysInMonth - leaveCount;
    const totalAmount = activeDays * messRate;
    const savings = leaveCount * messRate;

    const monthName = now.toLocaleString('default', { month: 'long' });

    return (
        <div className="space-y-8 animate-fade-in mx-auto max-w-4xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">My Monthly Bill</h1>
                    <p className="text-gray-500 text-lg">Billing details for {monthName} {currentYear}</p>
                </div>
                {/* Download PDF button removed */}
            </div>

            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Payable</p>
                            {leavesLoading ? (
                                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse mt-1" />
                            ) : (
                                <h2 className="text-4xl font-bold text-gray-900">₹{totalAmount.toLocaleString()}</h2>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                Unpaid
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Due by 5th of next month</p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Breakdown Table */}
                    <div className="divide-y divide-gray-100">
                        <div className="grid grid-cols-2 p-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Total Days
                            </span>
                            <span className="text-sm font-medium text-gray-900 text-right">{daysInMonth} days</span>
                        </div>

                        <div className="grid grid-cols-2 p-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <Minus className="w-4 h-4 text-red-500" /> Leave Days
                            </span>
                            <span className="text-sm font-medium text-red-600 text-right">
                                {leavesLoading ? <span className="inline-block h-4 w-12 bg-red-100 rounded animate-pulse" /> : `− ${leaveCount} days`}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 p-4 sm:px-6 hover:bg-gray-50/30 transition-colors bg-blue-50/10">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-primary-600" /> Billable Days
                            </span>
                            <span className="text-sm font-semibold text-primary-700 text-right">
                                {leavesLoading ? <span className="inline-block h-4 w-12 bg-blue-100 rounded animate-pulse" /> : `${activeDays} days`}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 p-4 sm:px-6 hover:bg-gray-50/30 transition-colors">
                            <span className="text-sm text-gray-500">Cost per day</span>
                            <span className="text-sm font-medium text-gray-900 text-right">₹{messRate}</span>
                        </div>
                    </div>

                    <Separator />

                    {/* Calculation Footer */}
                    <div className="bg-gray-50/30 p-4 sm:px-6 text-center">
                        {leavesLoading ? (
                            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mx-auto" />
                        ) : (
                            <>
                                <p className="text-xs text-gray-400 font-mono">
                                    ({daysInMonth} Total − {leaveCount} Leave) × ₹{messRate} = ₹{totalAmount.toLocaleString()}
                                </p>
                                {savings > 0 && (
                                    <p className="text-xs text-emerald-600 font-medium mt-1">
                                        You saved ₹{savings.toLocaleString()} this month on leaves
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Pay Now button removed */}
        </div>
    );
}
