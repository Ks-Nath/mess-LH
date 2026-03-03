import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    UtensilsCrossed,
    Users,
    LogOut,
    ChefHat,
    Bell,
    FileSpreadsheet,
    Settings
} from 'lucide-react';
import { Separator } from './ui/separator';

const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/menu', label: 'Manage Menu', icon: UtensilsCrossed },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/leaves', label: 'Leave Reports', icon: Bell },
    { to: '/admin/bills', label: 'Finance', icon: FileSpreadsheet },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 min-h-screen sticky top-0 h-screen text-slate-100">
            {/* Brand */}
            <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                    <ChefHat className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight text-white">MessPro Admin</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1">
                <div className="px-4 mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Management</p>
                </div>
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/admin'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`
                        }
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Profile */}
            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-semibold text-sm">
                        {user?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
