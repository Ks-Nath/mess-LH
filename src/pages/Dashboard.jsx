import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UtensilsCrossed, CalendarOff, Receipt, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useLeaves } from '../context/LeaveContext';

export default function Dashboard() {
    const { user } = useAuth();
    const { isStudentOnLeave, loading: leavesLoading } = useLeaves();
    const navigate = useNavigate();
    
    // Today's date (YYYY-MM-DD)
    const todayStr = new Date().toLocaleDateString('en-CA');
    const onLeaveToday = isStudentOnLeave(user?.messNumber, todayStr);


    const actions = [
        {
            title: 'View Weekly Menu',
            description: 'Check breakfast, lunch, and dinner menus for the entire week.',
            icon: UtensilsCrossed,
            path: '/dashboard/menu',
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            border: 'hover:border-orange-200',
        },
        {
            title: 'Apply for Leave',
            description: 'Mark dates you won\'t be eating. Remember the 8 PM cutoff.',
            icon: CalendarOff,
            path: '/dashboard/leave',
            color: 'text-red-600',
            bg: 'bg-red-50',
            border: 'hover:border-red-200',
        },
        {
            title: 'View Monthly Bill',
            description: 'Track your expenses, attendance, and total payable amount.',
            icon: Receipt,
            path: '/dashboard/bill',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'hover:border-emerald-200',
        },
    ];

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Minimal Header */}
            <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight break-words">
                    Welcome back, <br className="block sm:hidden" /> {user?.name?.split(' ')[0]}
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <p className="text-lg text-gray-500">What would you like to do today?</p>
                    <div className="flex">
                        {leavesLoading ? (
                            <div className="h-6 w-32 bg-gray-100 rounded-full animate-pulse" />
                        ) : (
                            !onLeaveToday ? (
                                <Badge variant="success" className="rounded-full px-3">Mess Active</Badge>
                            ) : (
                                <Badge variant="warning" className="rounded-full px-3">On Leave Today</Badge>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* 3 Large Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {actions.map((action) => (
                    <button
                        key={action.title}
                        onClick={() => navigate(action.path)}
                        className={`group text-left h-full transition-all duration-300 hover:-translate-y-1 focus:outline-none`}
                    >
                        <Card className={`h-full border-gray-200 transition-colors ${action.border} shadow-sm hover:shadow-md`}>
                            <CardContent className="p-8 flex flex-col h-full">
                                <div className={`w-14 h-14 rounded-2xl ${action.bg} flex items-center justify-center mb-6 transition-transform group-hover:scale-110`}>
                                    <action.icon className={`w-7 h-7 ${action.color}`} />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-700 transition-colors">
                                    {action.title}
                                </h3>

                                <p className="text-gray-500 leading-relaxed mb-8 flex-1">
                                    {action.description}
                                </p>

                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 group-hover:text-primary-700 group-hover:gap-3 transition-all">
                                    Open {action.title.split(' ').pop()}
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </CardContent>
                        </Card>
                    </button>
                ))}
            </div>
        </div>
    );
}
