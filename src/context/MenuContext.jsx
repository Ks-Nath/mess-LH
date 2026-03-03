import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const MenuContext = createContext(null);

export function MenuProvider({ children }) {
    const [weeklyMenu, setWeeklyMenu] = useState({});
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (user?.hostelId) {
            fetchMenu();

            // ONLY Admins get real-time updates for menu
            if (user.role === 'admin') {
                const subscription = supabase
                    .channel('menu-channel')
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'weekly_menu',
                            filter: `hostel_id=eq.${user.hostelId}`
                        },
                        () => {
                            fetchMenu();
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(subscription);
                };
            }
        } else {
            setWeeklyMenu({});
        }
    }, [user?.hostelId]);

    const fetchMenu = async () => {
        if (!user?.hostelId) return;

        // 1. Try to load from LocalStorage first
        const cached = localStorage.getItem(`menu_${user.hostelId}`);
        if (cached) {
            setWeeklyMenu(JSON.parse(cached));
            setLoading(false);
            // We can optionally fetch in background to validity check, but for now we trust cache + realtime
        }

        try {
            const { data, error } = await supabase
                .from('weekly_menu')
                .select('*')
                .eq('hostel_id', user.hostelId);

            if (error) throw error;

            // Transform array [{ day_of_week: 'Monday', ... }] to object { 'Monday': { ... } }
            const menuMap = {};
            data.forEach(item => {
                menuMap[item.day_of_week] = {
                    breakfast: item.breakfast || [],
                    lunch: item.lunch || [],
                    snack: item.snack || [],
                    dinner: item.dinner || []
                };
            });

            setWeeklyMenu(menuMap);
            localStorage.setItem(`menu_${user.hostelId}`, JSON.stringify(menuMap));

        } catch (error) {
            console.error('Error fetching menu:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateDayMenu = async (day, mealType, newItems) => {
        if (!user?.hostelId) return { success: false, error: 'No hostel assigned' };

        // Optimistic update
        setWeeklyMenu(prev => {
            const updated = {
                ...prev,
                [day]: {
                    ...prev[day],
                    [mealType]: newItems
                }
            };
            // Update LocalStorage immediately
            localStorage.setItem(`menu_${user.hostelId}`, JSON.stringify(updated));
            return updated;
        });

        // DB Update
        const { error } = await supabase
            .from('weekly_menu')
            .update({ [mealType]: newItems })
            .eq('day_of_week', day)
            .eq('hostel_id', user.hostelId);

        if (error) {
            console.error('Error updating menu:', error);
            fetchMenu(); // Revert
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    return (
        <MenuContext.Provider value={{ weeklyMenu, updateDayMenu, loading }}>
            {children}
        </MenuContext.Provider>
    );
}

export function useMenu() {
    const ctx = useContext(MenuContext);
    if (!ctx) throw new Error('useMenu must be used within a MenuProvider');
    return ctx;
}
