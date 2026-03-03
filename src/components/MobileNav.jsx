import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { X, LogOut, ChefHat, User } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

export default function MobileNav({ isOpen, onClose, links, type = 'student' }) {
    const { user, logout } = useAuth();

    // Lock body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const isStudent = type === 'student';
    const bgClass = isStudent ? 'bg-white' : 'bg-slate-900 text-white';
    const textClass = isStudent ? 'text-gray-900' : 'text-white';
    const itemHoverClass = isStudent ? 'hover:bg-gray-50' : 'hover:bg-slate-800';
    const activeClass = isStudent ? 'bg-indigo-50 text-indigo-700' : 'bg-indigo-600 text-white';

    return (
        <div className="fixed inset-0 z-50 lg:hidden font-sans">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`absolute top-0 left-0 bottom-0 w-3/4 max-w-xs ${bgClass} shadow-xl transform transition-transform duration-300 ease-in-out`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className={`h-16 flex items-center justify-between px-6 border-b ${isStudent ? 'border-gray-100' : 'border-slate-800'}`}>
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg ${isStudent ? 'bg-indigo-600' : 'bg-indigo-500'} flex items-center justify-center`}>
                                <ChefHat className="w-5 h-5 text-white" />
                            </div>
                            <span className={`font-bold text-lg ${textClass}`}>MessPro</span>
                        </div>
                        <button onClick={onClose} className={`p-1 rounded-md ${isStudent ? 'text-gray-400 hover:bg-gray-100' : 'text-slate-400 hover:bg-slate-800'}`}>
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Links */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        <div className="px-4 mb-4">
                            <p className={`text-xs font-bold uppercase tracking-wider ${isStudent ? 'text-gray-400' : 'text-slate-500'}`}>Menu</p>
                        </div>
                        {links.map(({ to, label, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                onClick={onClose}
                                end={to === '/dashboard' || to === '/admin'}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                        ? activeClass
                                        : `${isStudent ? 'text-gray-600' : 'text-slate-400'} ${itemHoverClass}`
                                    }`
                                }
                            >
                                <Icon className="w-5 h-5" />
                                {label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Footer / Logout */}
                    <div className={`p-4 border-t ${isStudent ? 'border-gray-100' : 'border-slate-800'}`}>
                        <div className="flex items-center gap-3 px-2 py-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${isStudent ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-700 text-slate-300'}`}>
                                {user?.name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${textClass}`}>{user?.name}</p>
                                <p className={`text-xs truncate ${isStudent ? 'text-gray-500' : 'text-slate-500'}`}>{user?.email}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            className={`w-full mt-4 justify-start ${isStudent ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : 'text-red-400 hover:bg-slate-800 hover:text-red-300'}`}
                            onClick={() => {
                                logout();
                                onClose();
                            }}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
