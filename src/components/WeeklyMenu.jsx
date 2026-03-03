import { Coffee, Sun, Moon } from 'lucide-react';

const mealIcons = {
    breakfast: Coffee,
    lunch: Sun,
    dinner: Moon,
};

const mealColors = {
    breakfast: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
    lunch: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' },
    dinner: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
};

export default function WeeklyMenu({ dayMenu }) {
    if (!dayMenu) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['breakfast', 'lunch', 'dinner'].map((meal) => {
                const Icon = mealIcons[meal];
                const colors = mealColors[meal];

                return (
                    <div
                        key={meal}
                        className={`rounded-2xl border ${colors.border} ${colors.bg} p-5 hover:shadow-md transition-smooth`}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm`}>
                                <Icon className={`w-5 h-5 ${colors.icon}`} />
                            </div>
                            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${colors.badge} capitalize`}>
                                {meal}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {dayMenu[meal]?.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-white/60"
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${colors.icon.replace('text-', 'bg-')}`}></span>
                                    <span className="text-sm text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
