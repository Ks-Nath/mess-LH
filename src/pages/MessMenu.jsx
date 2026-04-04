import { useState } from 'react';
import { useMenu } from '../context/MenuContext';
import { UtensilsCrossed, Coffee, Sun, Moon, Loader, Cookie } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const mealConfig = {
    breakfast: { icon: Coffee, label: 'Breakfast', color: 'text-amber-600', bg: 'bg-amber-50' },
    lunch: { icon: Sun, label: 'Lunch', color: 'text-orange-600', bg: 'bg-orange-50' },
    snack: { icon: Cookie, label: 'Snack', color: 'text-pink-600', bg: 'bg-pink-50' },
    dinner: { icon: Moon, label: 'Dinner', color: 'text-indigo-600', bg: 'bg-indigo-50' },
};

export default function MessMenu() {
    const { weeklyMenu, loading } = useMenu();
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today.getDay()];
    const [selectedDay, setSelectedDay] = useState(todayName);

    const currentMenu = weeklyMenu[selectedDay];

    // if (loading) {
    //     return (
    //         <div className="flex h-[50vh] items-center justify-center">
    //             <Loader className="w-8 h-8 animate-spin text-primary-600" />
    //         </div>
    //     );
    // }


    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Weekly Menu</h1>
                <p className="text-gray-500 text-lg">Check what's cooking this week.</p>
            </div>

            {/* Day Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex overflow-x-auto gap-6 sm:gap-8 scrollbar-hide pb-1">
                    {days.map((day) => (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={cn(
                                "relative pb-3 text-sm font-medium transition-colors whitespace-nowrap",
                                selectedDay === day
                                    ? "text-primary-600 font-semibold"
                                    : "text-gray-500 hover:text-gray-800"
                            )}
                        >
                            {day}
                            {selectedDay === day && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
                            )}
                            {day === todayName && (
                                <span className="ml-1.5 text-xs text-primary-500 font-normal opacity-70">• Today</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
                {['breakfast', 'lunch', 'snack', 'dinner'].map((mealType) => {
                    const config = mealConfig[mealType];
                    const items = currentMenu?.[mealType] || [];

                    return (
                        <Card key={mealType} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config.bg)}>
                                        <config.icon className={cn("w-5 h-5", config.color)} />
                                    </div>
                                    {loading ? (
                                        <div className="h-5 w-12 bg-gray-100 rounded animate-pulse" />
                                    ) : (
                                        <Badge variant="secondary" className="bg-gray-50 text-gray-500 font-normal">
                                            {items.length} items
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="mt-4 text-lg">{config.label}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-3">
                                        <div className="h-3 w-full bg-gray-50 rounded animate-pulse" />
                                        <div className="h-3 w-3/4 bg-gray-50 rounded animate-pulse" />
                                        <div className="h-3 w-5/6 bg-gray-50 rounded animate-pulse" />
                                    </div>
                                ) : (
                                    <ul className="space-y-3">
                                        {items.map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                                <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", config.bg.replace('bg-', 'bg-').replace('50', '400'))} />
                                                <span className="leading-relaxed">{item}</span>
                                            </li>
                                        ))}
                                        {items.length === 0 && (
                                            <li className="text-gray-400 text-sm italic py-2">No items listed</li>
                                        )}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
