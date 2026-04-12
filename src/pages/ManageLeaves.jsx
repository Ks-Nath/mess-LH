import { useState } from 'react';
import { useLeaves } from '../context/LeaveContext';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getISTDate, getISTDateString } from '../lib/utils';
import { useStudents } from '../context/StudentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import toast, { Toaster } from 'react-hot-toast';
import { CalendarIcon, UserX, CheckCircle, AlertCircle, CalendarRange, CalendarPlus } from 'lucide-react';

export default function ManageLeaves() {
    const { getLeavesByDate, addLeave, addBulkLeaves, removeLeave, removeBulkLeaves, isStudentOnLeave, refreshLeaves, loading: leavesLoading } = useLeaves();
    const { user } = useAuth();
    const { students, loading: studentsLoading } = useStudents();
    
    const isLoading = leavesLoading || studentsLoading;
    const [selectedDate, setSelectedDate] = useState(getISTDate());

    // Manual Override State
    const [overrideMessNumber, setOverrideMessNumber] = useState('');
    const [overrideDate, setOverrideDate] = useState(getISTDate());

    // Leave Till Join State
    const [ltjMessNumber, setLtjMessNumber] = useState('');
    const [ltjStartDate, setLtjStartDate] = useState(getISTDate());
    const [ltjEndDate, setLtjEndDate] = useState(getISTDate());

    // Helper to format date as YYYY-MM-DD for context
    const formatDateKey = (date) => {
        // Fallback to getISTDateString logic if input is not a Date object
        if (!(date instanceof Date)) return getISTDateString();
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const leavesForDate = getLeavesByDate(formatDateKey(selectedDate));
    const sortedLeavesForDate = [...leavesForDate].sort((a, b) => {
        return a.messNumber.localeCompare(b.messNumber, undefined, { numeric: true, sensitivity: 'base' });
    });

    const handleGrantLeave = async () => {
        if (!overrideMessNumber) {
            toast.error('Please select a student');
            return;
        }

        const dateKey = formatDateKey(overrideDate);

        if (overrideMessNumber === 'ALL') {
            const activeStudents = students.filter(s => s.messStatus === 'Active');
            if (!window.confirm(`Are you sure you want to GRANT leave for ALL ${activeStudents.length} active students for ${dateKey}?`)) return;

            toast.loading('Granting leaves...', { id: 'bulk-grant' });
            const { success, error } = await addBulkLeaves(activeStudents, dateKey, 'OVERRIDE');

            if (success) {
                toast.success(`Leave granted for all ${activeStudents.length} students`, { id: 'bulk-grant' });
            } else {
                toast.error(`Failed to grant leaves: ${error}`, { id: 'bulk-grant' });
            }
        } else {
            const selectedStudent = students.find(s => s.messNumber === overrideMessNumber);
            if (!selectedStudent) {
                toast.error('Student not found');
                return;
            }
            const { success, error } = await addLeave(overrideMessNumber, dateKey, selectedStudent.id, 'OVERRIDE');
            if (success) {
                toast.success(`Leave granted for ${overrideMessNumber} on ${dateKey}`);
            } else {
                toast.error(`Failed to grant leave: ${error}`);
            }
        }
        setOverrideMessNumber('');
    };

    const handleCancelLeave = async () => {
        if (!overrideMessNumber) {
            toast.error('Please select a student');
            return;
        }
        const dateKey = formatDateKey(overrideDate);

        if (overrideMessNumber === 'ALL') {
            const activeStudents = students.filter(s => s.messStatus === 'Active');
            if (!window.confirm(`Are you sure you want to CANCEL leave for ALL ${activeStudents.length} active students for ${dateKey}?`)) return;

            toast.loading('Cancelling leaves...', { id: 'bulk-cancel' });
            const { success, error } = await removeBulkLeaves(dateKey);

            if (success) {
                toast.success(`All leaves cancelled for this date`, { id: 'bulk-cancel' });
            } else {
                toast.error(`Failed to cancel leaves: ${error}`, { id: 'bulk-cancel' });
            }
        } else {
            removeLeave(overrideMessNumber, dateKey);
            toast.success(`Leave cancelled for ${overrideMessNumber} on ${dateKey}`);
        }
        setOverrideMessNumber('');
    };

    const handleLeaveTillJoin = async () => {
        if (!ltjMessNumber) {
            toast.error('Please select a student');
            return;
        }

        const start = new Date(ltjStartDate);
        const end = new Date(ltjEndDate);

        if (start > end) {
            toast.error('Start date must be on or before end date');
            return;
        }

        // Generate all dates in the range
        const dates = [];
        const current = new Date(start);
        while (current <= end) {
            dates.push(formatDateKey(current));
            current.setDate(current.getDate() + 1);
        }

        if (ltjMessNumber === 'ALL') {
            const activeStudents = students.filter(s => s.messStatus === 'Active');
            if (!window.confirm(`Grant leave for ALL ${activeStudents.length} active students for ${dates.length} day(s)?\n${formatDateKey(start)} \u2192 ${formatDateKey(end)}\n\nTotal records: ${activeStudents.length * dates.length}\nThese will NOT count towards the monthly quota.`)) return;

            toast.loading(`Cleaning up overlapping leaves...`, { id: 'ltj-grant' });
            
            const messNumbers = activeStudents.map(s => s.messNumber);
            const batchSizeForDelete = 200;
            let delErrorAll = null;
            for (let i = 0; i < messNumbers.length; i += batchSizeForDelete) {
                const batchMsg = messNumbers.slice(i, i + batchSizeForDelete);
                const { error } = await supabase
                    .from('leaves')
                    .delete()
                    .in('leave_date', dates)
                    .in('mess_number', batchMsg)
                    .eq('hostel_id', user.hostelId);
                if (error) { delErrorAll = error; break; }
            }

            if (delErrorAll) {
                toast.error(`Cleanup failed: ${delErrorAll.message}`, { id: 'ltj-grant' });
                return;
            }

            toast.loading(`Granting ${activeStudents.length * dates.length} leave(s)...`, { id: 'ltj-grant' });

            // Build ALL records in one flat array: students × dates — SINGLE bulk insert
            const records = activeStudents.flatMap(student =>
                dates.map(dateKey => ({
                    student_id: student.id,
                    mess_number: student.messNumber,
                    leave_date: dateKey,
                    status: 'Approved',
                    hostel_id: user.hostelId,
                    is_admin_granted: true
                }))
            );

            // Batched inserts of 100 records at a time
            const BATCH_SIZE = 100;
            let insertError = null;
            for (let i = 0; i < records.length; i += BATCH_SIZE) {
                const batch = records.slice(i, i + BATCH_SIZE);
                const { error } = await supabase.from('leaves').insert(batch);
                if (error) { insertError = error; break; }
            }

            if (insertError) {
                toast.error(`Failed: ${insertError.message}`, { id: 'ltj-grant' });
                return;
            }

            toast.success(`Granted ${records.length} leave(s) for all students`, { id: 'ltj-grant' });
        } else {
            const selectedStudent = students.find(s => s.messNumber === ltjMessNumber);
            if (!selectedStudent) {
                toast.error('Student not found');
                return;
            }

            if (!window.confirm(`Grant leave for ${selectedStudent.name} (${ltjMessNumber}) for ${dates.length} day(s)?\n${formatDateKey(start)} \u2192 ${formatDateKey(end)}\n\nThese will NOT count towards the monthly quota.`)) return;

            toast.loading(`Cleaning up overlapping leaves...`, { id: 'ltj-grant' });
            
            const { error: delError } = await supabase
                .from('leaves')
                .delete()
                .in('leave_date', dates)
                .eq('mess_number', ltjMessNumber)
                .eq('hostel_id', user.hostelId);

            if (delError) {
                toast.error(`Cleanup failed: ${delError.message}`, { id: 'ltj-grant' });
                return;
            }

            toast.loading(`Granting ${dates.length} leave(s)...`, { id: 'ltj-grant' });

            // Build all records for a SINGLE bulk insert
            const records = dates.map(dateKey => ({
                student_id: selectedStudent.id,
                mess_number: ltjMessNumber,
                leave_date: dateKey,
                status: 'Approved',
                hostel_id: user.hostelId,
                is_admin_granted: true
            }));

            const { error } = await supabase
                .from('leaves')
                .insert(records);

            if (error) {
                toast.error(`Failed: ${error.message}`, { id: 'ltj-grant' });
                return;
            }

            toast.success(`Granted ${dates.length} leave(s) for ${selectedStudent.name}`, { id: 'ltj-grant' });
        }

        setLtjMessNumber('');
        if (refreshLeaves) refreshLeaves();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <Toaster />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Leave Reports</h1>
                    <p className="text-gray-500">View and manage student leaves.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Report Section */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Daily Report</span>
                                <input
                                    type="date"
                                    className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formatDateKey(selectedDate)}
                                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                />
                            </CardTitle>
                            <CardDescription>
                                {isLoading ? (
                                    <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mt-1" />
                                ) : (
                                    <span><span className="text-blue-600 font-bold">{leavesForDate.length}</span> student{leavesForDate.length !== 1 ? 's' : ''} on leave for {selectedDate.toDateString()}</span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3 pt-4">
                                    <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
                                    <div className="h-10 w-full bg-gray-50 rounded animate-pulse" />
                                    <div className="h-10 w-full bg-gray-50 rounded animate-pulse" />
                                </div>
                            ) : leavesForDate.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <CalendarRange className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>No student is on leave for this specific date.</p>
                                </div>
                            ) : (
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-4 py-3 font-medium text-gray-700">Mess No</th>
                                                <th className="px-4 py-3 font-medium text-gray-700">Name</th>
                                                <th className="px-4 py-3 font-medium text-gray-700 hidden md:table-cell">Phone</th>

                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {sortedLeavesForDate.map(leaf => {
                                                const messNo = leaf.messNumber;
                                                const student = students.find(s => s.messNumber === messNo);
                                                return (
                                                    <tr key={messNo} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                                            {messNo}
                                                            {leaf.isAdminGranted && (
                                                                <span className="w-2 h-2 rounded-full bg-admin-purple" title="Admin Granted"></span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">{student ? student.name : 'Unknown'}</td>
                                                        <td className="px-4 py-3 hidden md:table-cell">{student ? student.phone : '-'}</td>

                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Manual Override Section */}
                <div className="lg:col-span-1">
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader>
                            <CardTitle>Administrative Override</CardTitle>
                            <CardDescription>
                                Forcefully grant or cancel leaves regardless of time restrictions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Select Student</label>
                                <select
                                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={overrideMessNumber}
                                    onChange={(e) => setOverrideMessNumber(e.target.value)}
                                >
                                    <option value="" disabled>Select student...</option>
                                    <option value="ALL" className="font-bold text-blue-600">SELECT ALL</option>
                                    {students.map(student => (
                                        <option key={student.id} value={student.messNumber}>
                                            {student.name} ({student.messNumber})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Select Date</label>
                                <input
                                    type="date"
                                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formatDateKey(overrideDate)}
                                    onChange={(e) => setOverrideDate(new Date(e.target.value))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleGrantLeave}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Grant
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={handleCancelLeave}
                                >
                                    <UserX className="w-4 h-4 mr-2" />
                                    Cancel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Leave Till Join Section */}
                    <Card className="border-l-4 border-l-amber-500">
                        <CardHeader>
                            <CardTitle>Leave Till Join</CardTitle>
                            <CardDescription>
                                Grant leaves for a date range. These will bypass the monthly quota.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Select Student</label>
                                <select
                                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    value={ltjMessNumber}
                                    onChange={(e) => setLtjMessNumber(e.target.value)}
                                >
                                    <option value="" disabled>Select student...</option>
                                    <option value="ALL" className="font-bold text-amber-600">SELECT ALL</option>
                                    {students.map(student => (
                                        <option key={student.id} value={student.messNumber}>
                                            {student.name} ({student.messNumber})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        value={formatDateKey(ltjStartDate)}
                                        onChange={(e) => setLtjStartDate(new Date(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        value={formatDateKey(ltjEndDate)}
                                        onChange={(e) => setLtjEndDate(new Date(e.target.value))}
                                    />
                                </div>
                            </div>

                            <Button
                                className="w-full bg-amber-600 hover:bg-amber-700"
                                onClick={handleLeaveTillJoin}
                            >
                                <CalendarPlus className="w-4 h-4 mr-2" />
                                Grant Leaves
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
