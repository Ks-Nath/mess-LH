import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Search, MoreHorizontal, Users, UserPlus, X, Loader2, Trash2 } from 'lucide-react';
import { cn, getISTDate, getISTDateString } from '../lib/utils';
import { useStudents } from '../context/StudentContext';
import { useLeaves } from '../context/LeaveContext';

export default function ManageStudents() {
    const { students, loading: studentsLoading, addStudent, removeStudent, updateStudentMessType } = useStudents();
    const { isStudentOnLeave, loading: leavesLoading } = useLeaves();

    const loading = studentsLoading || leavesLoading;

    const [selectedDate, setSelectedDate] = useState(getISTDate());
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');

    // Actions dropdown state — stores { id, top, right } for fixed positioning
    const [dropdownState, setDropdownState] = useState(null);

    // Add Student Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newStudent, setNewStudent] = useState({ name: '', messNumber: '', phone: '', messType: 'Veg' });
    const [addError, setAddError] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const formatDateKey = (date) => {
        if (!(date instanceof Date)) return getISTDateString();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Derive students with dynamic status
    const studentsWithStatus = students.map(student => {
        const onLeave = isStudentOnLeave(student.messNumber, formatDateKey(selectedDate));
        return { ...student, status: onLeave ? 'On Leave' : 'Active' };
    });

    const filteredStudents = studentsWithStatus.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.messNumber.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'All' || s.status === filter;
        return matchesSearch && matchesFilter;
    });

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setAddError('');

        if (!newStudent.name.trim() || !newStudent.messNumber.trim() || !newStudent.phone.trim()) {
            setAddError('All fields are required.');
            return;
        }

        setIsAdding(true);
        const result = await addStudent({
            name: newStudent.name.trim(),
            messNumber: newStudent.messNumber.trim().toUpperCase(),
            phone: newStudent.phone.trim(),
            messType: newStudent.messType,
            roomNo: '',
            messStatus: 'Active',
        });
        setIsAdding(false);

        if (result.success) {
            setNewStudent({ name: '', messNumber: '', phone: '', messType: 'Veg' });
            setShowAddModal(false);
        } else {
            setAddError(result.error || 'Failed to add student.');
        }
    };

    const handleRemoveStudent = async (messNumber) => {
        if (window.confirm(`Are you sure you want to remove student ${messNumber}? This cannot be undone.`)) {
            const result = await removeStudent(messNumber);
            if (!result.success) {
                alert('Failed to remove student: ' + result.error);
            }
        }
    };

    const handleUpdateMealPreference = async (messNumber, type) => {
        const result = await updateStudentMessType(messNumber, type);
        if (!result.success) {
            alert('Failed to update meal preference: ' + result.error);
        }
    };

    const openDropdown = (e, studentId) => {
        if (dropdownState?.id === studentId) {
            setDropdownState(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setDropdownState({
            id: studentId,
            top: rect.bottom + window.scrollY + 4,
            right: window.innerWidth - rect.right,
        });
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Student Registry</h1>
                    <p className="text-gray-500 mt-2">Manage student access and mess status.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                        <span className="text-sm text-gray-500">View Status For:</span>
                        <input
                            type="date"
                            className="text-sm outline-none text-gray-700"
                            value={formatDateKey(selectedDate)}
                            onChange={(e) => setSelectedDate(new Date(e.target.value))}
                        />
                    </div>
                    <Button onClick={() => setShowAddModal(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <UserPlus className="w-4 h-4" /> Add Student
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-1 items-center bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent max-w-sm transition-all">
                    <Search className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
                    <input
                        type="text"
                        placeholder="Search students (Name, Mess No)..."
                        className="w-full bg-transparent outline-none text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {['All', 'Active', 'On Leave'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                                filter === f
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <span className="ml-2 text-gray-500">Loading students...</span>
                </div>
            ) : (
                /* Table */
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[800px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Mess No</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Name</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Phone</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Type</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                                    <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map((student, index) => (
                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{student.messNumber}</td>
                                        <td className="px-6 py-4 text-gray-700 font-medium">{student.name}</td>
                                        <td className="px-6 py-4 text-gray-500">{student.phone}</td>
                                        <td className="px-6 py-4">
                                            <Badge 
                                                variant="outline" 
                                                className={
                                                    student.messType === 'Veg' 
                                                        ? 'text-green-600 border-green-200 bg-green-50' 
                                                        : student.messType === 'Veg+C'
                                                        ? 'text-amber-600 border-amber-200 bg-amber-50'
                                                        : 'text-red-600 border-red-200 bg-red-50'
                                                }
                                            >
                                                {student.messType || 'Veg'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={student.status === 'Active' ? 'success' : 'warning'} className="rounded-full">
                                                {student.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                                onClick={(e) => openDropdown(e, student.id)}
                                                title="Actions"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStudents.length === 0 && (
                            <div className="p-12 text-center text-gray-500">
                                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>No students found matching your criteria.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Fixed-position Actions Dropdown — renders outside overflow context */}
            {dropdownState && (() => {
                const student = filteredStudents.find(s => s.id === dropdownState.id);
                if (!student) return null;
                return (
                    <>
                        {/* Backdrop to close on outside click */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setDropdownState(null)}
                        />
                        <div
                            className="fixed z-50 w-48 rounded-lg shadow-xl bg-white border border-gray-100 ring-1 ring-black ring-opacity-5 overflow-hidden"
                            style={{ top: dropdownState.top, right: dropdownState.right }}
                        >
                            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50 border-b border-gray-100">
                                Meal Preference
                            </div>
                            <div className="py-1">
                                {['Veg', 'Non-Veg', 'Veg+C'].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => {
                                            handleUpdateMealPreference(student.messNumber, type);
                                            setDropdownState(null);
                                        }}
                                        className={cn(
                                            "flex items-center w-full text-left px-4 py-2 text-sm transition-colors",
                                            student.messType === type
                                                ? "bg-indigo-50 text-indigo-700 font-semibold"
                                                : "text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        {type} {student.messType === type && "✓"}
                                    </button>
                                ))}
                            </div>
                            <div className="border-t border-gray-100" />
                            <div className="py-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleRemoveStudent(student.messNumber);
                                        setDropdownState(null);
                                    }}
                                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                                >
                                    <Trash2 className="w-4 h-4 mr-2 shrink-0" /> Remove Student
                                </button>
                            </div>
                        </div>
                    </>
                );
            })()}

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <UserPlus className="w-4 h-4 text-indigo-600" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">Add New Student</h2>
                            </div>
                            <button onClick={() => { setShowAddModal(false); setAddError(''); }} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleAddStudent} className="p-6 space-y-5">
                            <p className="text-sm text-gray-500">
                                The student will log in with their <strong>Mess Number</strong> as username and <strong>Phone Number</strong> as password.
                            </p>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Student Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Arjun Kumar"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                    value={newStudent.name}
                                    onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                                    autoFocus
                                />
                            </div>

                            {/* Mess Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mess Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. MESS-001"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm uppercase"
                                    value={newStudent.messNumber}
                                    onChange={(e) => setNewStudent(prev => ({ ...prev, messNumber: e.target.value }))}
                                />
                                <p className="text-xs text-gray-400 mt-1">This will be the login username</p>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                                <input
                                    type="tel"
                                    placeholder="e.g. 9876543210"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                    value={newStudent.phone}
                                    onChange={(e) => setNewStudent(prev => ({ ...prev, phone: e.target.value }))}
                                />
                                <p className="text-xs text-gray-400 mt-1">This will be the login password</p>
                            </div>

                            {/* Mess Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mess Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Veg', 'Non-Veg', 'Veg+C'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNewStudent(prev => ({ ...prev, messType: type }))}
                                            className={cn(
                                                "px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium border transition-all",
                                                newStudent.messType === type
                                                    ? type === 'Veg'
                                                        ? "bg-green-50 text-green-700 border-green-300 ring-2 ring-green-200"
                                                        : type === 'Veg+C'
                                                        ? "bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-200"
                                                        : "bg-red-50 text-red-700 border-red-300 ring-2 ring-red-200"
                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Error Message */}
                            {addError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                    {addError}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setAddError(''); }}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isAdding} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                                    {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isAdding ? 'Adding...' : 'Add Student'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
