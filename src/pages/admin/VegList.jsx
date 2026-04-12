import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Leaf, Search, X, Loader2, Check, UserPlus, ShieldAlert, Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStudents } from '../../context/StudentContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getISTDateString } from '../../lib/utils';

export default function VegList() {
    const { students } = useStudents();
    const { user } = useAuth();
    
    // attendance is now an object: { "messNumber": { afternoon: bool, night: bool } }
    const [attendance, setAttendance] = useState({});
    const [loadingAttendance, setLoadingAttendance] = useState(true);
    const [search, setSearch] = useState('');
    
    // Modal states
    const [showManageModal, setShowManageModal] = useState(false);
    const [manageSearch, setManageSearch] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const getTodayStr = () => getISTDateString();

    useEffect(() => {
        if (user?.hostelId) {
            fetchAttendance();
            
            // Real-time for attendance
            const subscription = supabase
                .channel('veg-attendance-channel')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'veg_attendance',
                        filter: `hostel_id=eq.${user.hostelId}`
                    },
                    (payload) => {
                        if (payload.new.eaten_date === getTodayStr()) {
                            const messNo = payload.new.mess_number;
                            const meal = payload.new.meal_type;
                            setAttendance(prev => ({
                                ...prev,
                                [messNo]: {
                                    ...prev[messNo],
                                    [meal]: true
                                }
                            }));
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [user?.hostelId]);

    const fetchAttendance = async () => {
        if (!user?.hostelId) return;
        setLoadingAttendance(true);
        try {
            const { data, error } = await supabase
                .from('veg_attendance')
                .select('mess_number, meal_type')
                .eq('eaten_date', getTodayStr())
                .eq('hostel_id', user.hostelId);

            if (error) throw error;
            
            // Build map: { "messNumber": { afternoon: true/false, night: true/false } }
            const map = {};
            data.forEach(r => {
                if (!map[r.mess_number]) map[r.mess_number] = {};
                map[r.mess_number][r.meal_type] = true;
            });
            setAttendance(map);
        } catch (error) {
            console.error("Error fetching veg attendance:", error);
        } finally {
            setLoadingAttendance(false);
        }
    };

    const handleFreeze = async (messNumber, mealType) => {
        if (!user?.hostelId) return;
        if (attendance[messNumber]?.[mealType]) return; // Already frozen
        
        // Optimistic update
        setAttendance(prev => ({
            ...prev,
            [messNumber]: {
                ...prev[messNumber],
                [mealType]: true
            }
        }));
        
        try {
            const { error } = await supabase
                .from('veg_attendance')
                .insert([{
                    mess_number: messNumber,
                    eaten_date: getTodayStr(),
                    meal_type: mealType,
                    hostel_id: user.hostelId
                }]);

            if (error) {
                if (error.code === '23505') {
                    // Already exists — keep it frozen
                    return;
                }
                // Revert optimistic update
                setAttendance(prev => ({
                    ...prev,
                    [messNumber]: {
                        ...prev[messNumber],
                        [mealType]: false
                    }
                }));
                throw error;
            }
        } catch (error) {
            console.error("Error logging attendance:", error);
            alert("Failed to mark attendance.");
        }
    };

    const toggleVegStatus = async (messNumber, makeVeg) => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('students')
                .update({ mess_type: makeVeg ? 'Veg' : 'Non-Veg' })
                .eq('mess_number', messNumber)
                .eq('hostel_id', user.hostelId);
                
            if (error) throw error;
            setManageSearch('');
        } catch (error) {
            console.error("Error updating mess type:", error);
            alert("Failed to update student.");
        } finally {
            setIsUpdating(false);
        }
    };

    const vegStudents = students.filter(s => s.messType === 'Veg');
    
    const filteredOutList = vegStudents.filter(s => {
        return s.name.toLowerCase().includes(search.toLowerCase()) || 
               s.messNumber.toLowerCase().includes(search.toLowerCase());
    });
    
    const manageStudentResult = manageSearch.trim() === '' ? null : students.find(s => s.messNumber.toUpperCase() === manageSearch.trim().toUpperCase());

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <Leaf className="w-5 h-5 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Veg List</h1>
                    </div>
                    <p className="text-gray-500 mt-2">Track daily vegetarian food consumption to prevent duplicate claims.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="px-3 py-1.5 bg-white shadow-sm border-gray-200 gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        {getTodayStr()}
                    </Badge>
                    <Button size="sm" onClick={() => setShowManageModal(true)} className="h-9 px-3 gap-2 bg-green-600 hover:bg-green-700 text-white text-sm">
                        <UserPlus className="w-4 h-4" /> Manage Veg Students
                    </Button>
                </div>
            </div>

            <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent max-w-sm transition-all">
                <Search className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
                <input
                    type="text"
                    placeholder="Search veg list..."
                    className="w-full bg-transparent outline-none text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loadingAttendance ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                </div>
            ) : (
                <Card className="border-gray-200 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-gray-50/80 border-b border-gray-200 text-xs sm:text-sm text-gray-600">
                                    <tr>
                                        <th className="px-3 py-3 sm:px-4 lg:px-5 font-semibold w-20 sm:w-24">Mess No</th>
                                        <th className="px-3 py-3 sm:px-4 lg:px-5 font-semibold">Name</th>
                                        <th className="px-2 py-3 font-semibold text-center w-16 sm:w-20">
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1">
                                                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                                                <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider">Noon</span>
                                            </div>
                                        </th>
                                        <th className="px-2 py-3 font-semibold text-center w-16 sm:w-20">
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1">
                                                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                                                <span className="text-[11px] sm:text-xs font-medium uppercase tracking-wider">Night</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredOutList.map((student) => {
                                        const afternoonFrozen = !!attendance[student.messNumber]?.afternoon;
                                        const nightFrozen = !!attendance[student.messNumber]?.night;
                                        const fullyFrozen = afternoonFrozen && nightFrozen;
                                        return (
                                            <tr 
                                                key={student.id} 
                                                className={cn(
                                                    "transition-colors duration-200 text-[13px] sm:text-sm",
                                                    fullyFrozen ? "bg-gray-50/80 opacity-60" : "hover:bg-green-50/40 even:bg-slate-50/30"
                                                )}
                                            >
                                                <td className={cn("px-3 py-2.5 sm:px-4 lg:px-5 font-semibold tracking-tight", fullyFrozen ? "text-red-500/80" : "text-gray-900")}>
                                                    {student.messNumber}
                                                </td>
                                                <td className={cn("px-3 py-2.5 sm:px-4 lg:px-5", fullyFrozen ? "text-gray-400" : "text-gray-700")}>
                                                    <div className="max-w-[120px] sm:max-w-[200px] md:max-w-none truncate font-medium">
                                                        {student.name}
                                                    </div>
                                                </td>
                                                {/* Afternoon Checkbox */}
                                                <td className="px-2 py-2 text-center">
                                                    <button
                                                        onClick={() => handleFreeze(student.messNumber, 'afternoon')}
                                                        disabled={afternoonFrozen}
                                                        className={cn(
                                                            "w-9 h-9 sm:w-8 sm:h-8 rounded-md outline-none transition-all flex items-center justify-center mx-auto shadow-sm",
                                                            afternoonFrozen 
                                                                ? "bg-green-100 border border-green-300 cursor-not-allowed" 
                                                                : "bg-white border border-gray-300 hover:border-green-500 hover:bg-green-50 cursor-pointer active:scale-95"
                                                        )}
                                                    >
                                                        <Check className={cn("w-4 h-4 sm:w-4 sm:h-4 text-green-600 transition-transform", afternoonFrozen ? "opacity-100 scale-100" : "opacity-0 scale-75")} />
                                                    </button>
                                                </td>
                                                {/* Night Checkbox */}
                                                <td className="px-2 py-2 text-center">
                                                    <button
                                                        onClick={() => handleFreeze(student.messNumber, 'night')}
                                                        disabled={nightFrozen}
                                                        className={cn(
                                                            "w-9 h-9 sm:w-8 sm:h-8 rounded-md outline-none transition-all flex items-center justify-center mx-auto shadow-sm",
                                                            nightFrozen 
                                                                ? "bg-red-100 border border-red-300 cursor-not-allowed" 
                                                                : "bg-white border border-gray-300 hover:border-red-500 hover:bg-red-50 cursor-pointer active:scale-95"
                                                        )}
                                                    >
                                                        <Check className={cn("w-4 h-4 sm:w-4 sm:h-4 text-red-600 transition-transform", nightFrozen ? "opacity-100 scale-100" : "opacity-0 scale-75")} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredOutList.length === 0 && (
                                <div className="p-12 text-center text-gray-500">
                                    <Leaf className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <p>No vegetarian students found.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Manage Modal */}
            {showManageModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                                    <Leaf className="w-4 h-4 text-green-600" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">Add/Remove Veg Student</h2>
                            </div>
                            <button onClick={() => { setShowManageModal(false); setManageSearch(''); }} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Search by Mess Number</label>
                                <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent transition-all">
                                    <Search className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
                                    <input
                                        type="text"
                                        placeholder="e.g. MESS-001"
                                        className="w-full bg-transparent outline-none uppercase text-sm"
                                        value={manageSearch}
                                        onChange={(e) => setManageSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="min-h-[120px]">
                                {manageSearch.trim() === '' ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                        <Search className="w-8 h-8 opacity-20" />
                                        <p className="text-sm">Type a mess number to find student</p>
                                    </div>
                                ) : manageStudentResult ? (
                                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-4">
                                        <div className="space-y-1">
                                            <p className="font-semibold text-gray-900">{manageStudentResult.name}</p>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-gray-500">{manageStudentResult.messNumber}</p>
                                                <Badge variant="outline" className={manageStudentResult.messType === 'Veg' ? 'text-green-600 border-green-200 bg-green-50' : 'text-gray-500 border-gray-200 bg-white'}>
                                                    Current: {manageStudentResult.messType || 'Veg'}
                                                </Badge>
                                            </div>
                                        </div>
                                        
                                        <Button 
                                            onClick={() => toggleVegStatus(manageStudentResult.messNumber, manageStudentResult.messType !== 'Veg')}
                                            disabled={isUpdating}
                                            variant={manageStudentResult.messType === 'Veg' ? 'destructive' : 'default'}
                                            className={cn(
                                                "w-full", 
                                                manageStudentResult.messType !== 'Veg' ? "bg-green-600 hover:bg-green-700 text-white" : ""
                                            )}
                                        >
                                            {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            {manageStudentResult.messType === 'Veg' ? 'Remove from Veg List' : 'Add to Veg List'}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-red-400 space-y-2">
                                        <ShieldAlert className="w-8 h-8 opacity-50" />
                                        <p className="text-sm">Student not found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
