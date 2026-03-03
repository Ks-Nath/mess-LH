import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize state from localStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('messArgUser');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('messArgUser');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password, role) => {
        if (role === 'admin') {
            try {
                const { data, error } = await supabase
                    .from('admins')
                    .select('*')
                    .eq('email', username)
                    .eq('password', password) // Note: Production apps should use hashed passwords
                    .single();

                if (error || !data) {
                    return { success: false, error: 'Invalid admin credentials' };
                }

                const adminUser = {
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    role: 'admin',
                    hostelId: data.hostel_id,
                };

                setUser(adminUser);
                localStorage.setItem('messArgUser', JSON.stringify(adminUser));
                return { success: true, role: 'admin' };
            } catch (err) {
                console.error("Admin login error:", err);
                return { success: false, error: 'Admin login failed due to system error' };
            }
        }

        // Student: messNumber (case-insensitive) + (password OR phone)
        try {
            // Fetch ALL students with this mess number (in case of duplicates across hostels)
            const { data: students, error } = await supabase
                .from('students')
                .select('*')
                .eq('mess_number', username.toUpperCase());

            if (error || !students || students.length === 0) {
                return { success: false, error: 'Invalid mess number' };
            }

            // Iterate through all found students to see if credentials match ANY of them
            let validStudent = null;
            let failureReason = 'Invalid credentials';

            for (const student of students) {
                let isMatch = false;

                if (student.password && student.password.trim() !== '') {
                    // Has custom password -> Must match
                    if (student.password === password) {
                        isMatch = true;
                    }
                } else {
                    // No custom password -> Check phone
                    if (student.phone === password) {
                        isMatch = true;
                    }
                }

                if (isMatch) {
                    validStudent = student;
                    break; // Found the correct user, stop checking
                }
            }

            if (!validStudent) {
                // If we found students but none matched credentials
                // If there was only one student found and it failed, we can be more specific,
                // but for security it's often better to just say "Invalid credentials"
                // However to match previous behavior for single users we can try:
                if (students.length === 1) {
                    const s = students[0];
                    if (s.password && s.password.trim() !== '') {
                        return { success: false, error: 'Invalid password (custom password is set)' };
                    } else {
                        return { success: false, error: 'Invalid phone number (default password)' };
                    }
                }
                return { success: false, error: 'Invalid credentials' };
            }

            // Map DB to User object
            const studentUser = {
                id: validStudent.id,
                name: validStudent.name,
                messNumber: validStudent.mess_number,
                phone: validStudent.phone,
                role: 'user',
                roomNo: validStudent.room_no,
                messStatus: validStudent.mess_status,
                messType: validStudent.mess_type,
                joinDate: validStudent.join_date,
                hostelId: validStudent.hostel_id,
                hasCustomPassword: !!(validStudent.password && validStudent.password.trim() !== '') // Helper flag
            };

            setUser(studentUser);
            localStorage.setItem('messArgUser', JSON.stringify(studentUser));
            return { success: true, role: 'user' };

        } catch (err) {
            console.error("Login error:", err);
            return { success: false, error: 'Login failed due to system error' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('messArgUser');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
