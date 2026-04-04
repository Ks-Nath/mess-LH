import { useState, useEffect } from 'react';
import { useHostel } from '../context/HostelContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Save, Settings, DatabaseBackup, Download } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

export default function AdminSettings() {
    const { messRate, cutoffTime, hostelName, updateSettings, loading } = useHostel();

    const [rate, setRate] = useState(messRate);
    const [cutoff, setCutoff] = useState(cutoffTime);
    const [isSaving, setIsSaving] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);

    // Sync state when context loads
    useEffect(() => {
        setRate(messRate);
        setCutoff(cutoffTime);
    }, [messRate, cutoffTime]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const result = await updateSettings({
            messRate: parseInt(rate),
            cutoffTime: parseInt(cutoff),
        });

        if (result.success) {
            toast.success('Settings updated successfully');
        } else {
            toast.error('Failed to update settings: ' + result.error);
        }
        setIsSaving(false);
    };

    const handleBackup = async () => {
        if (!confirm('Download a full backup of your data?')) return;

        setIsBackingUp(true);
        const toastId = toast.loading('Generating backup...');

        try {
            // Fetch data from main tables
            const tables = ['students', 'leaves', 'weekly_menu'];
            const backupData = {
                timestamp: new Date().toISOString(),
                hostelName,
                data: {}
            };

            for (const table of tables) {
                const { data, error } = await supabase.from(table).select('*');
                if (error) throw error;
                backupData.data[table] = data;
            }

            // Create and download file
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mess_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Backup downloaded successfully', { id: toastId });
        } catch (error) {
            console.error('Backup error:', error);
            toast.error('Backup failed: ' + error.message, { id: toastId });
        } finally {
            setIsBackingUp(false);
        }
    };

    // Remove full-page loader to use skeletons instead
    // if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
            <Toaster />

            {/* Page Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hostel Settings</h1>
                <p className="text-gray-500 text-base">Manage configuration for {hostelName || 'your hostel'}</p>
            </div>

            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <Settings className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">General Configuration</CardTitle>
                            <CardDescription className="mt-0.5">Update rates and timing restrictions.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-6">
                    <form onSubmit={handleSave} className="space-y-8">

                        {/* Mess Rate */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700">Daily Mess Rate</label>
                            <div className="relative max-w-xs">
                                {loading ? (
                                    <div className="h-11 w-full bg-gray-100 rounded-xl animate-pulse" />
                                ) : (
                                    <>
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm pointer-events-none">₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={rate}
                                            onChange={(e) => setRate(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
                                            required
                                        />
                                    </>
                                )}
                            </div>
                            <p className="text-xs text-gray-400">Amount charged per student per day.</p>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* Cutoff Time */}
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700">Leave Cutoff Time</label>
                            <div className="max-w-xs">
                                {loading ? (
                                    <div className="h-11 w-full bg-gray-100 rounded-xl animate-pulse" />
                                ) : (
                                    <select
                                        value={cutoff}
                                        onChange={(e) => setCutoff(parseInt(e.target.value))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all appearance-none cursor-pointer"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '20px 20px' }}
                                    >
                                        {Array.from({ length: 24 }).map((_, i) => (
                                            <option key={i} value={i}>
                                                {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                                                {i === 20 && ' (Default)'}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <p className="text-xs text-gray-400">
                                Students cannot apply for next-day leave after this time.
                            </p>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* Save */}
                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={isSaving} className="gap-2 px-6">
                                <Save className="w-4 h-4" />
                                {isSaving ? 'Saving...' : 'Save Configuration'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Data Backup Section */}
            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <DatabaseBackup className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Data Backup</CardTitle>
                            <CardDescription className="mt-0.5">Download a complete copy of your data for safekeeping.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 pt-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h4 className="font-medium text-gray-900">Export All Data</h4>
                            <p className="text-sm text-gray-500 max-w-md">
                                Generates a JSON file containing all Students, Leaves, Menu, and Bills.
                                Save this file locally to prevent data loss.
                            </p>
                        </div>
                        <Button
                            onClick={handleBackup}
                            disabled={isBackingUp}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {isBackingUp ? 'Exporting...' : 'Download Backup'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
