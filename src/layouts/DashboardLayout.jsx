import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import { LayoutDashboard, UtensilsCrossed, CalendarOff, Receipt, User, Landmark } from 'lucide-react';

export default function DashboardLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/dashboard/menu', label: 'Mess Menu', icon: UtensilsCrossed },
        { to: '/dashboard/leave', label: 'Leave', icon: CalendarOff },
        { to: '/dashboard/bill', label: 'Mess Bill', icon: Receipt },
        { to: '/dashboard/establishment', label: 'Establishment', icon: Landmark },
        { to: '/dashboard/profile', label: 'Profile', icon: User },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            {/* Mobile Navigation Drawer */}
            <MobileNav
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                links={navItems}
                type="student"
            />

            {/* Sidebar - Desktop Only */}
            <Sidebar />

            <div className="flex-1 flex flex-col min-h-screen">
                <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />
                {/* Main Content Wrapper - Constrained Width */}
                <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
