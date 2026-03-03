import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChefHat, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

export default function Navbar({ onMenuClick }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200/60 backdrop-blur-sm supports-[backdrop-filter]:bg-white/80">
            {/* Navbar Container to match Dashboard Layout Width */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo & Mobile Menu */}
                <div className="flex items-center gap-3">
                    <button
                        className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={onMenuClick}
                        aria-label="Open menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-pink-400 flex items-center justify-center shadow-sm shadow-pink-200">
                            <ChefHat className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-gray-900 tracking-tight hidden sm:block">MessLH</span>
                    </div>
                </div>

                {/* User & Logout */}
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3 bg-gray-50/50 p-1.5 pr-4 rounded-full border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold text-xs border border-indigo-100">
                            {user?.name?.charAt(0)}
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900 leading-none">{user?.name?.split(' ')[0]}</p>
                        </div>
                    </div>

                    <Separator orientation="vertical" className="h-6 hidden sm:block" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                    >
                        <LogOut className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
