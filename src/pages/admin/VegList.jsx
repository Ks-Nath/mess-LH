import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Leaf, Search, X, Loader2, Check, UserPlus, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useStudents } from '../../context/StudentContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function VegList() {
    const { students } = useStudents();
    const { user } = useAuth();
    
    const [attendance, setAttendance] = useState([]); // List of mess_numbers that ate today
    const [loadingAttendance, setLoadingAttendance] = useState(true);
    const [search, setSearch] = useState('');
    
    // Modal states
    const [showManageModal, setShowManageModal] = useState(false);
    const [manageSearch, setManageSearch] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const getTodayStr = () => new Date().toISOString().split('T')[0];

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
                            setAttendance(prev => [...new Set([...prev, payload.new.mess_number])]);
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
                .select('mess_number')
                .eq('eaten_date', getTodayStr())
                .eq('hostel_id', user.hostelId);

            if (error) throw error;
            setAttendance(data.map(r => r.mess_number));
        } catch (error) {
            console.error("Error fetching veg attendance:", error);
        } finally {
            setLoadingAttendance(false);
        }
    };

    const handleFreeze = async (messNumber) => {
        if (!user?.hostelId || attendance.includes(messNumber)) return;
        
        // Optimistic update
        setAttendance(prev => [...prev, messNumber]);
        
        try {
            const { error } = await supabase
                .from('veg_attendance')
                .insert([{
                    mess_number: messNumber,
                    eaten_date: getTodayStr(),
                    hostel_id: user.hostelId
                }]);

            if (error) {
                // Revert optimistic update
                setAttendance(prev => prev.filter(m => m !== messNumber));
                if (error.code === '23505') { // Unique constraint violation (already clicked)
                     setAttendance(prev => [...prev, messNumber]); 
                } else {
                     throw error;
                }
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
            // The StudentContext real-time subscription will automatically update the table!
            setManageSearch(''); // clear search after action
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
    
    // Derived state for the manage modal
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
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[600px]">
                            <thead className="bg-gray-50/80 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-900 w-1/4">Mess No</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900 w-1/2">Name</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900 text-center w-1/4">Action (Freeze)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOutList.map((student) => {
                                    const isFrozen = attendance.includes(student.messNumber);
                                    return (
                                        <tr 
                                            key={student.id} 
                                            className={cn(
                                                "transition-colors duration-300",
                                                isFrozen ? "bg-gray-100/50 grayscale-[0.8] opacity-60" : "hover:bg-green-50/50"
                                            )}
                                        >
                                            <td className={cn("px-6 py-4 font-bold", isFrozen ? "text-red-500" : "text-gray-900")}>
                                                {student.messNumber}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 font-medium">{student.name}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleFreeze(student.messNumber)}
                                                    disabled={isFrozen}
                                                    className={cn(
                                                        "w-8 h-8 rounded-lg outline-none transition-all flex items-center justify-center mx-auto",
                                                        isFrozen 
                                                            ? "bg-gray-300 cursor-not-allowed text-white" 
                                                            : "bg-white border-2 border-green-500 text-transparent hover:bg-green-50 cursor-pointer"
                                                    )}
                                                >
                                                    <Check className={cn("w-5 h-5", isFrozen ? "text-white opacity-100" : "opacity-0")} />
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
