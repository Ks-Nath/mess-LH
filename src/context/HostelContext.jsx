import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const HostelContext = createContext(null);

export function HostelProvider({ children }) {
    const { user } = useAuth();
    const [hostelSettings, setHostelSettings] = useState({
        messRate: 140, // Default fallback
        cutoffTime: 20, // Default fallback (8 PM)
        hostelName: '',
        loading: true,
    });

    useEffect(() => {
        const fetchHostelSettings = async () => {
            if (!user?.hostelId) {
                setHostelSettings(prev => ({ ...prev, loading: false }));
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('hostels')
                    .select('name, mess_rate, cutoff_time')
                    .eq('id', user.hostelId)
                    .single();

                if (error) {
                    console.error('Error fetching hostel settings:', error);
                    // Keep defaults but stop loading
                    setHostelSettings(prev => ({ ...prev, loading: false }));
                    return;
                }

                if (data) {
                    setHostelSettings({
                        messRate: data.mess_rate,
                        cutoffTime: data.cutoff_time,
                        hostelName: data.name,
                        loading: false,
                    });
                }
            } catch (err) {
                console.error('Unexpected error fetching hostel settings:', err);
                setHostelSettings(prev => ({ ...prev, loading: false }));
            }
        };

        fetchHostelSettings();
    }, [user?.hostelId]);

    // Function to update settings (for Admin)
    const updateSettings = async (newSettings) => {
        if (!user?.hostelId) return { success: false, error: 'No hostel ID found for user' };

        try {
            const { error } = await supabase
                .from('hostels')
                .update({
                    mess_rate: newSettings.messRate,
                    cutoff_time: newSettings.cutoffTime,
                })
                .eq('id', user.hostelId);

            if (error) throw error;

            // Optimistically update local state
            setHostelSettings(prev => ({
                ...prev,
                messRate: newSettings.messRate,
                cutoffTime: newSettings.cutoffTime,
            }));

            return { success: true };
        } catch (err) {
            console.error('Error updating hostel settings:', err);
            return { success: false, error: err.message };
        }
    };

    return (
        <HostelContext.Provider value={{ ...hostelSettings, updateSettings }}>
            {children}
        </HostelContext.Provider>
    );
}

export function useHostel() {
    const context = useContext(HostelContext);
    if (!context) {
        throw new Error('useHostel must be used within a HostelProvider');
    }
    return context;
}
