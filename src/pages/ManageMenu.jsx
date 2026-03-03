import { useState, useEffect } from 'react';
import { useMenu } from '../context/MenuContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { UtensilsCrossed, Calendar, Save, Trash2, Plus, Loader } from 'lucide-react';
import { cn } from '../lib/utils';
import toast, { Toaster } from 'react-hot-toast';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ManageMenu() {
    const { weeklyMenu, updateDayMenu, loading } = useMenu();
    const [selectedDay, setSelectedDay] = useState('Monday');

    // Local state to manage edits before save (optional, but requested flow was direct save? 
    // Actually, let's edit local copy of the day and save meal by meal or day by day.
    // The previous code had a 'Save' button. Let's maintain that feel.)
    // However, context updates are async. Let's just state that we are editing the *selectedDay* from context.

    // But we need a local buffer if we want "Save Changes" button to commit everything. 
    // Or we commit on every add/remove? 
    // The previous mock implementation had a `handleSave`.
    // Let's implement immediate updates for simplicity and better UX in this context, 
    // OR local buffer. Let's do local buffer for the selected day to avoid excessive DB writes while typing/adding.

    const [localDayMenu, setLocalDayMenu] = useState(null);

    useEffect(() => {
        if (weeklyMenu[selectedDay]) {
            setLocalDayMenu(weeklyMenu[selectedDay]);
        }
    }, [weeklyMenu, selectedDay]);

    const handleSave = async () => {
        if (!localDayMenu) return;

        toast.loading('Saving menu...', { id: 'saving-menu' });
        try {
            // Update all 3 meals for the day
            await updateDayMenu(selectedDay, 'breakfast', localDayMenu.breakfast);
            await updateDayMenu(selectedDay, 'lunch', localDayMenu.lunch);
            await updateDayMenu(selectedDay, 'snack', localDayMenu.snack || []);
            await updateDayMenu(selectedDay, 'dinner', localDayMenu.dinner);

            toast.success(`Menu for ${selectedDay} updated successfully`, { id: 'saving-menu' });
        } catch (error) {
            console.error(error);
            toast.error('Failed to update menu', { id: 'saving-menu' });
        }
    };

    const [inputs, setInputs] = useState({});

    const handleAddItem = (mealType) => {
        const val = inputs[mealType]?.trim();
        if (val && localDayMenu) {
            setLocalDayMenu(prev => ({
                ...prev,
                [mealType]: [...(prev[mealType] || []), val]
            }));
            setInputs(prev => ({ ...prev, [mealType]: '' }));
        }
    };

    const removeItem = (mealType, index) => {
        if (localDayMenu) {
            setLocalDayMenu(prev => ({
                ...prev,
                [mealType]: prev[mealType].filter((_, i) => i !== index)
            }));
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    // Default empty structure if day not found yet
    const displayMenu = localDayMenu || { breakfast: [], lunch: [], snack: [], dinner: [] };

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
            <Toaster />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Manage Menu</h1>
                    <p className="text-gray-500 mt-2">Edit weekly meal plans.</p>
                </div>
                <Button onClick={handleSave} className="gap-2">
                    <Save className="w-4 h-4" /> Save Changes
                </Button>
            </div>

            {/* Day Selection */}
            <div className="flex overflow-x-auto gap-2 pb-4 border-b border-gray-200 px-1 scrollbar-hide">
                {days.map(day => (
                    <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                            selectedDay === day
                                ? "bg-indigo-600 text-white shadow-md"
                                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                        )}
                    >
                        {day}
                    </button>
                ))}
            </div>

            {/* Meal Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {['breakfast', 'lunch', 'snack', 'dinner'].map(mealType => (
                    <Card key={mealType} className="border-gray-200 shadow-sm relative group flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gray-50/50">
                            <CardTitle className="capitalize text-lg font-bold text-gray-800">{mealType}</CardTitle>
                            <Badge variant="secondary" className="bg-white border-gray-200">{displayMenu[mealType]?.length || 0}</Badge>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col pt-4">
                            <ul className="space-y-2 mb-4 flex-1">
                                {displayMenu[mealType]?.map((item, idx) => (
                                    <li key={idx} className="flex items-center justify-between p-2 rounded bg-gray-50 text-sm text-gray-700 group/item hover:bg-gray-100 transition-colors">
                                        <span className="truncate mr-2">{item}</span>
                                        <button
                                            onClick={() => removeItem(mealType, idx)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                                {(!displayMenu[mealType] || displayMenu[mealType].length === 0) && (
                                    <li className="text-gray-400 text-sm italic p-2 text-center">No items</li>
                                )}
                            </ul>

                            <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                                <input
                                    type="text"
                                    placeholder="Add item..."
                                    className="flex-1 px-3 py-1.5 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={inputs[mealType] || ''}
                                    onChange={(e) => setInputs(prev => ({ ...prev, [mealType]: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem(mealType)}
                                />
                                <Button
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200"
                                    onClick={() => handleAddItem(mealType)}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
