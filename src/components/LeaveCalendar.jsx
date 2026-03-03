import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

export default function LeaveCalendar({
    currentMonth,
    currentYear,
    selectedDates,
    onDateToggle,
    onPrevMonth,
    onNextMonth,
    maxLeaves,
    leavesUsedThisMonth,
    today,
    cutoffTime,
}) {
    // const today = new Date(); // Using today from props
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    // First day of month (0=Sun)
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const isCapReached = maxLeaves != null && leavesUsedThisMonth >= maxLeaves;

    const isPastDate = (day) => {
        const d = new Date(currentYear, currentMonth, day);
        const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return d < t;
    };

    const isToday = (day) => {
        return (
            currentYear === today.getFullYear() &&
            currentMonth === today.getMonth() &&
            day === today.getDate()
        );
    };

    const isTomorrow = (day) => {
        const d = new Date(currentYear, currentMonth, day);
        const t = new Date(today);
        t.setDate(t.getDate() + 1);
        t.setHours(0, 0, 0, 0); // normalize
        return (
            d.getFullYear() === t.getFullYear() &&
            d.getMonth() === t.getMonth() &&
            d.getDate() === t.getDate()
        );
    };

    const isTodayCutoffPassed = () => {
        return today.getHours() >= cutoffTime;
    };

    const getDateStr = (day) => {
        return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const getLeaveInfo = (day) => {
        const dateStr = getDateStr(day);
        // selectedDates is now an array of { date, isAdminGranted } from LeaveSelection
        return selectedDates.find(l => l.date === dateStr);
    };

    const isSelected = (day) => {
        return !!getLeaveInfo(day);
    };

    const isAdminLeave = (day) => {
        return getLeaveInfo(day)?.isAdminGranted;
    };

    const isDisabled = (day) => {
        if (isPastDate(day)) return true;

        // RULE: Cannot apply for leave for today on today itself.
        if (isToday(day)) return true;

        const info = getLeaveInfo(day);
        if (info?.isAdminGranted) return true; // Cannot toggle admin leaves from here

        // CUTOFF RULE: If cutoff passed (8 PM), disable tomorrow as well.
        if (isTomorrow(day) && isTodayCutoffPassed()) return true;

        // If cap is reached, disable unselected future dates (but allow deselecting)
        if (isCapReached && !info) return true;
        return false;
    };

    const handleClick = (day) => {
        if (isPastDate(day)) return;

        // RULE: Cannot apply for leave for today
        if (isToday(day)) return;

        if (isTomorrow(day) && isTodayCutoffPassed()) return;

        const info = getLeaveInfo(day);
        if (info?.isAdminGranted) return;

        // Allow the toggle — LeaveSelection.jsx handles the cap toast
        onDateToggle(getDateStr(day));
    };

    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <div className="p-4 sm:p-6 bg-white">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-8">
                <Button variant="ghost" size="icon" onClick={onPrevMonth}>
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <h3 className="text-lg font-semibold text-gray-900">
                    {monthNames[currentMonth]} {currentYear}
                </h3>
                <Button variant="ghost" size="icon" onClick={onNextMonth}>
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {blanks.map((_, i) => (
                    <div key={`blank-${i}`} className="aspect-square"></div>
                ))}
                {daysArr.map((day) => {
                    const info = getLeaveInfo(day);
                    const disabled = isDisabled(day);
                    const selected = !!info;
                    const adminGranted = Boolean(info?.isAdminGranted);
                    const todayDate = isToday(day);
                    const cappedOut = isCapReached && !selected && !isPastDate(day) && !(isToday(day) && isTodayCutoffPassed());

                    return (
                        <button
                            key={day}
                            onClick={() => handleClick(day)}
                            disabled={disabled}
                            className={cn(
                                "aspect-square rounded-lg text-sm font-medium relative transition-all duration-200 border border-transparent",
                                adminGranted
                                    ? "bg-admin-purple text-white shadow-sm cursor-not-allowed opacity-90"
                                    : selected
                                        ? "bg-red-500 text-white shadow-sm hover:bg-red-600"
                                        : todayDate
                                            ? "bg-primary-50 text-primary-700 border-primary-100"
                                            : cappedOut
                                                ? "text-gray-300 cursor-not-allowed bg-gray-50/80 border-dashed border-gray-200"
                                                : disabled
                                                    ? "text-gray-300 cursor-not-allowed bg-gray-50/50"
                                                    : "text-gray-700 hover:bg-gray-100 hover:border-gray-200"
                            )}
                        >
                            {day}
                            {todayDate && !selected && (
                                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500"></span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-6 mt-8 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500"></div>
                    <span className="text-xs text-gray-500 font-medium">Your Leave</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-admin-purple"></div>
                    <span className="text-xs text-gray-500 font-medium">Admin Granted</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary-50 border border-primary-100"></div>
                    <span className="text-xs text-gray-500 font-medium">Today</span>
                </div>
                {isCapReached && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-gray-50 border border-dashed border-gray-300"></div>
                        <span className="text-xs text-gray-500 font-medium">Limit Reached</span>
                    </div>
                )}
            </div>
        </div>
    );
}
