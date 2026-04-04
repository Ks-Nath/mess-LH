import { useState } from 'react';
import { useLeaves } from '../context/LeaveContext';
import { useStudents } from '../context/StudentContext';
import { useHostel } from '../context/HostelContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Download, Calendar, CalendarRange, FileSpreadsheet } from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function AdminBills() {
    const { students, loading: studentsLoading } = useStudents();
    const { getLeavesByDate, loading: leavesLoading } = useLeaves();
    const isLoading = studentsLoading || leavesLoading;
    const { messRate } = useHostel();

    // Mode: 'month' or 'range'
    const [mode, setMode] = useState('month');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    // Compute the date list based on mode
    const getDateRange = () => {
        let start, end;
        if (mode === 'month') {
            const [y, m] = selectedMonth.split('-').map(Number);
            const daysInMonth = new Date(y, m, 0).getDate();
            start = new Date(y, m - 1, 1);
            end = new Date(y, m - 1, daysInMonth);
        } else {
            start = new Date(startDate);
            end = new Date(endDate);
        }
        const dates = [];
        const current = new Date(start);
        while (current <= end) {
            const yyyy = current.getFullYear();
            const mm = String(current.getMonth() + 1).padStart(2, '0');
            const dd = String(current.getDate()).padStart(2, '0');
            dates.push(`${yyyy}-${mm}-${dd}`);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    const dateRange = getDateRange();
    const totalDays = dateRange.length;

    // Period label for display
    const periodLabel = mode === 'month'
        ? new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })
        : `${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    // Calculate bills
    const studentBills = students.map(student => {
        let leaveCount = 0;
        dateRange.forEach(dateKey => {
            const leavesOnDay = getLeavesByDate(dateKey) || [];
            if (leavesOnDay.some(l => l.messNumber === student.messNumber)) {
                leaveCount++;
            }
        });

        const billableDays = totalDays - leaveCount;
        const totalBill = billableDays * messRate;

        return {
            ...student,
            totalDays,
            leaveCount,
            billableDays,
            totalBill,
        };
    });

    // Grand totals
    const grandTotal = studentBills.reduce((sum, s) => sum + s.totalBill, 0);
    const totalLeaves = studentBills.reduce((sum, s) => sum + s.leaveCount, 0);

    const handleDownloadExcel = () => {
        // Data rows
        const rows = studentBills.map(s => ({
            'Mess No': s.messNumber,
            'Student Name': s.name,
            'Total Days': s.totalDays,
            'Leaves Taken': s.leaveCount,
            'Billable Days': s.billableDays,
            'Total Bill (₹)': s.totalBill,
        }));

        // Summary row
        rows.push({
            'Mess No': '',
            'Student Name': 'TOTAL',
            'Total Days': '',
            'Leaves Taken': totalLeaves,
            'Billable Days': '',
            'Total Bill (₹)': grandTotal,
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 12 }, // Mess No
            { wch: 22 }, // Student Name
            { wch: 12 }, // Total Days
            { wch: 14 }, // Leaves Taken
            { wch: 14 }, // Billable Days
            { wch: 16 }, // Total Bill
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Mess Bills');

        // Generate filename
        const filename = mode === 'month'
            ? `mess_bills_${selectedMonth}.xlsx`
            : `mess_bills_${startDate}_to_${endDate}.xlsx`;

        // Download as proper .xlsx using data URI
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        const link = document.createElement('a');
        link.href = `data:application/octet-stream;base64,${wbout}`;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadOverview = () => {
        // Generate rows with daily status
        const rows = studentBills.map(s => {
            const row = {
                'MESS NO': s.messNumber,
                'NAME': s.name,
            };

            // Add daily columns
            dateRange.forEach(dateKey => {
                // Use simply the day number as header (1, 2, 3...) derived from string YYYY-MM-DD
                // dateKey is YYYY-MM-DD. Split by '-' take last part, remove leading zero.
                const dayPart = dateKey.split('-')[2];
                const dayHeader = dayPart.startsWith('0') ? dayPart.substring(1) : dayPart;

                const leavesOnDay = getLeavesByDate(dateKey) || [];
                const isLeave = leavesOnDay.some(l => l.messNumber === s.messNumber);

                row[dayHeader] = isLeave ? 'L' : 'X';
            });

            // Add summary columns
            row['TOTAL DAYS'] = s.billableDays; // Active days = Billable Days
            row['TOTAL AMOUNT'] = s.totalBill; // Final total amount

            return row;
        });

        // Calculate Grand Totals for summary row
        const grandTotalAmount = rows.reduce((sum, r) => sum + (r['TOTAL AMOUNT'] || 0), 0);

        const summaryRow = {
            'MESS NO': '',
            'NAME': 'TOTAL',
            'TOTAL DAYS': '',
            'TOTAL AMOUNT': grandTotalAmount
        };

        rows.push(summaryRow);

        // Define exact header order
        const header = ['MESS NO', 'NAME'];
        dateRange.forEach(dateKey => {
            const dayPart = dateKey.split('-')[2];
            const dayHeader = dayPart.startsWith('0') ? dayPart.substring(1) : dayPart;
            header.push(dayHeader);
        });
        header.push('TOTAL DAYS');
        header.push('TOTAL AMOUNT');

        // Create worksheet with strict header order
        const worksheet = XLSX.utils.json_to_sheet(rows, { header });

        // Set column widths
        const cols = [
            { wch: 10 }, // Mess No
            { wch: 20 }, // Name
        ];
        // Add width for days
        dateRange.forEach(() => cols.push({ wch: 3 }));
        // Add width for summary cols
        cols.push({ wch: 12 }); // Total Days
        cols.push({ wch: 16 }); // Total Amount

        worksheet['!cols'] = cols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Overview');

        // Generate filename
        const filename = mode === 'month'
            ? `mess_overview_${selectedMonth}.xlsx`
            : `mess_overview_${startDate}_to_${endDate}.xlsx`;

        // Download
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        const link = document.createElement('a');
        link.href = `data:application/octet-stream;base64,${wbout}`;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Student Bills</h1>
                    <p className="text-gray-500">Generate and download bill reports as Excel.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleDownloadOverview} disabled={isLoading} variant="outline" className="gap-2 border-green-600 text-green-600 hover:bg-green-50 shadow-sm">
                        <FileSpreadsheet className="w-4 h-4" /> Overview
                    </Button>
                    <Button onClick={handleDownloadExcel} disabled={isLoading} className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm">
                        <Download className="w-4 h-4" /> Download Excel
                    </Button>
                </div>
            </div>

            {/* Controls Card */}
            <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                        {/* Mode Toggle */}
                        <div className="w-full sm:w-auto p-1 bg-gray-100 rounded-lg grid grid-cols-2 gap-1 border border-gray-200 shrink-0">
                            {[{ key: 'month', label: 'Full Month', icon: Calendar }, { key: 'range', label: 'Range', icon: CalendarRange }].map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setMode(key)}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all",
                                        mode === key
                                            ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{label}</span>
                                    <span className="sm:hidden">{label === 'Full Month' ? 'Month' : 'Range'}</span>
                                </button>
                            ))}
                        </div>

                        {/* Date Inputs */}
                        <div className="w-full sm:w-auto">
                            {mode === 'month' ? (
                                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm w-full sm:w-auto">
                                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                    <input
                                        type="month"
                                        className="text-sm outline-none text-gray-700 bg-transparent w-full sm:w-auto"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm w-full sm:w-auto">
                                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">From</span>
                                        <input
                                            type="date"
                                            className="text-sm outline-none text-gray-700 bg-transparent w-full"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <span className="text-gray-400 hidden sm:block">→</span>
                                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm w-full sm:w-auto">
                                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">To</span>
                                        <input
                                            type="date"
                                            className="text-sm outline-none text-gray-700 bg-transparent w-full"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Summary Chips */}
                        <div className="flex flex-wrap items-center gap-2 lg:ml-auto w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                {totalDays} days
                            </span>
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                                {students.length} students
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                    <CardTitle className="text-lg">Bill Summary — {periodLabel}</CardTitle>
                    <CardDescription>
                        Rate: ₹{messRate}/day
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                            <p>Calculating bills...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Mess No</th>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4 text-center">Total Days</th>
                                        <th className="px-6 py-4 text-center">Leaves</th>
                                        <th className="px-6 py-4 text-center">Billable Days</th>
                                        <th className="px-6 py-4 text-right font-bold">Final Bill (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {studentBills.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{student.messNumber}</td>
                                            <td className="px-6 py-4 text-gray-600">{student.name}</td>
                                            <td className="px-6 py-4 text-center text-gray-500">{student.totalDays}</td>
                                            <td className="px-6 py-4 text-center text-amber-600 font-medium">{student.leaveCount}</td>
                                            <td className="px-6 py-4 text-center text-green-600 font-medium">{student.billableDays}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">₹{student.totalBill.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {/* Grand Total Footer */}
                                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                    <tr>
                                        <td className="px-6 py-4" />
                                        <td className="px-6 py-4 font-bold text-gray-900">Grand Total</td>
                                        <td className="px-6 py-4 text-center text-gray-500 font-medium">{totalDays}</td>
                                        <td className="px-6 py-4 text-center text-amber-600 font-bold">{totalLeaves}</td>
                                        <td className="px-6 py-4" />
                                        <td className="px-6 py-4 text-right font-bold text-gray-900 text-base">₹{grandTotal.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                            {studentBills.length === 0 && (
                                <div className="p-12 text-center text-gray-500">
                                    <FileSpreadsheet className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                                    <p>No students found.</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
