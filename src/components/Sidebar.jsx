import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    UtensilsCrossed,
    CalendarOff,
    Receipt,
    LogOut,
    ChefHat,
    User,
    Landmark,
} from 'lucide-react';

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/dashboard/menu', label: 'Mess Menu', icon: UtensilsCrossed },
    { to: '/dashboard/leave', label: 'Leave', icon: CalendarOff },
    { to: '/dashboard/bill', label: 'Mess Bill', icon: Receipt },
    { to: '/dashboard/establishment', label: 'Establishment', icon: Landmark },
    { to: '/dashboard/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
    return (
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen sticky top-0 h-screen">
            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1">
                <div className="px-4 mb-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</p>
                </div>
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/dashboard'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                        }
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
