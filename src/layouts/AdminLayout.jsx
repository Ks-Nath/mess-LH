import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import MobileNav from '../components/MobileNav';
import { Bell, LayoutDashboard, UtensilsCrossed, Users, Menu, FileSpreadsheet, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function AdminLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/menu', label: 'Manage Menu', icon: UtensilsCrossed },
        { to: '/admin/students', label: 'Students', icon: Users },
        { to: '/admin/leaves', label: 'Leave Reports', icon: Bell },
        { to: '/admin/bills', label: 'Finance', icon: FileSpreadsheet },
        { to: '/admin/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            {/* Mobile Navigation Drawer */}
            <MobileNav
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                links={navItems}
                type="admin"
            />

            {/* Admin Sidebar */}
            <AdminSidebar />

            <div className="flex-1 flex flex-col min-h-screen">
                {/* Admin Navbar */}
                <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4 lg:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-semibold text-gray-800">MessPro Admin</h2>
                    </div>
                    {/* Spacer for desktop alignment if needed */}
                    <div className="hidden lg:block"></div>

                    <div className="ml-auto flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </Button>
                    </div>
                </header>

                {/* Main Content Wrapper - Constrained Width */}
                <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
