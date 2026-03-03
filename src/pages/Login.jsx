import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChefHat, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError(role === 'user' ? 'Please enter your Username and Password' : 'Please enter your Email and Password');
            return;
        }

        setIsLoading(true);

        // Simulate API delay
        await new Promise((r) => setTimeout(r, 600));

        const result = await login(username.trim(), password.trim(), role);
        setIsLoading(false);

        if (result.success) {
            if (result.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <div className="w-full max-w-[400px] animate-fade-in">
                {/* Minimal Logo Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-pink-400 shadow-sm shadow-pink-200 mb-4">
                        <ChefHat className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">MessLH</h1>
                    <p className="text-sm text-gray-500 mt-2">Sign in to your account</p>
                </div>

                {/* Clean Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Role Selector */}
                        <div className="p-1 bg-gray-50 rounded-lg grid grid-cols-2 gap-1 border border-gray-100">
                            {['user', 'admin'].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => {
                                        setRole(r);
                                        setError('');
                                        setUsername('');
                                        setPassword('');
                                    }}
                                    className={cn(
                                        "py-2 text-sm font-medium rounded-md transition-all capitalize",
                                        role === r
                                            ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    {r === 'user' ? 'Student' : 'Admin'}
                                </button>
                            ))}
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg animate-fade-in">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                <span className="text-sm text-red-700">{error}</span>
                            </div>
                        )}

                        {/* Inputs — change based on role */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="username" className="text-sm font-medium text-gray-700">
                                    {role === 'user' ? 'Username' : 'Email Address'}
                                </label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                                    placeholder={role === 'user' ? 'Enter your username' : 'name@university.edu'}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors placeholder:text-gray-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white transition-all shadow-none"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>


                </div>

                {/* Footer */}
                <div className="text-center text-[10px] text-gray-300 mt-8 font-mono">
                    System v2.0 • Secure Login
                </div>
            </div>
        </div>
    );
}
