import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Users, AlertCircle, UtensilsCrossed, Loader2 } from 'lucide-react';
import { useStudents } from '../context/StudentContext';
import { useLeaves } from '../context/LeaveContext';
import { getISTDateString } from '../lib/utils';

export default function AdminDashboard() {
    const { students, loading: studentsLoading } = useStudents();
    const { getLeavesByDate, loading: leavesLoading } = useLeaves();

    const isLoading = studentsLoading || leavesLoading;

    // Calculate stats
    // toLocaleDateString('en-CA') replaced with IST utility
    const today = getISTDateString();
    const totalStudents = students.length;
    const leavesToday = (getLeavesByDate(today) || []).length;
    const activeToday = totalStudents - leavesToday;
    const attendancePercentage = totalStudents > 0 ? Math.round((activeToday / totalStudents) * 100) : 0;

    const stats = [
        {
            label: 'Total Students',
            value: totalStudents,
            desc: 'Registered students',
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            label: 'Active Today',
            value: activeToday,
            desc: `${attendancePercentage}% attendance`,
            icon: UtensilsCrossed,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            label: 'Leave Today',
            value: leavesToday,
            desc: 'Students on leave',
            icon: AlertCircle,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
                <p className="text-gray-500 mt-2">Welcome back, Admin. Here's today's summary.</p>
            </div>

            {/* Stats Grid - Simplified to 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.label} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                                {isLoading ? (
                                    <div className="h-9 w-20 bg-gray-200 rounded-md animate-pulse mt-1 mb-1" />
                                ) : (
                                    <h3 className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</h3>
                                )}
                                {isLoading ? (
                                    <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mt-1" />
                                ) : (
                                    <p className="text-xs text-gray-400 mt-1">{stat.desc}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
