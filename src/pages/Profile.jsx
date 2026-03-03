import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { User, Phone, Key, ShieldCheck, Hash, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export default function Profile() {
    const { user } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('students')
                .update({ password: newPassword })
                .eq('id', user.id);

            if (error) throw error;

            toast.success('Password updated successfully! Next time, login with your new password.');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Error updating password:', error);
            toast.error('Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <Toaster position="bottom-center" />

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Profile</h1>
                <p className="text-gray-500 mt-2">View your details and manage account security.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* ID Card Section */}
                <Card className="md:col-span-2 border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="w-5 h-5 text-gray-500" />
                                Student Details
                            </CardTitle>
                            <Badge variant={user.messStatus === 'Active' ? 'success' : 'warning'}>
                                {user.messStatus}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</label>
                                <p className="text-lg font-medium text-gray-900">{user.name}</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Hash className="w-3 h-3" /> Mess Number
                                </label>
                                <p className="text-lg font-medium text-gray-900 font-mono">{user.messNumber}</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Home className="w-3 h-3" /> Room Number
                                </label>
                                <p className="text-lg font-medium text-gray-900">{user.roomNo}</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Phone Number
                                </label>
                                <p className="text-lg font-medium text-gray-900 font-mono">{user.phone}</p>
                            </div>

                            <div className="space-y-1 sm:col-span-2 pt-4 border-t border-gray-100">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mess Type</label>
                                <p className="text-base text-gray-700">{user.messType}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Security Section */}
                <Card className="border-gray-200 shadow-sm h-fit">
                    <CardHeader className="bg-indigo-50 border-b border-indigo-100 pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
                            <ShieldCheck className="w-5 h-5 text-indigo-600" />
                            Security
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="text-sm text-gray-600 mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                            <p><strong>Note:</strong> Setting a custom password will disable login via phone number.</p>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">New Password</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="Min 6 characters"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="Repeat password"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full mt-2"
                                disabled={isLoading || !newPassword || !confirmPassword}
                            >
                                {isLoading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
