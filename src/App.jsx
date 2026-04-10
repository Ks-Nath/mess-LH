import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MessMenu from './pages/MessMenu';
import LeaveSelection from './pages/LeaveSelection';
import MessBill from './pages/MessBill';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import ManageMenu from './pages/ManageMenu';
import ManageStudents from './pages/ManageStudents';
import ManageLeaves from './pages/ManageLeaves';
import AdminBills from './pages/AdminBills';
import AdminSettings from './pages/AdminSettings';
import VegList from './pages/admin/VegList';
import Establishment from './pages/Establishment';
import AdminEstablishment from './pages/admin/Establishment';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* User Routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute requiredRole="user">
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="menu" element={<MessMenu />} />
                <Route path="leave" element={<LeaveSelection />} />
                <Route path="bill" element={<MessBill />} />
                <Route path="establishment" element={<Establishment />} />
                <Route path="profile" element={<Profile />} />
            </Route>

            {/* Admin Routes */}
            <Route
                path="/admin"
                element={
                    <ProtectedRoute requiredRole="admin">
                        <AdminLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<AdminDashboard />} />
                <Route path="menu" element={<ManageMenu />} />
                <Route path="students" element={<ManageStudents />} />
                <Route path="leaves" element={<ManageLeaves />} />
                <Route path="veg-list" element={<VegList />} />
                <Route path="bills" element={<AdminBills />} />
                <Route path="establishment" element={<AdminEstablishment />} />
                <Route path="settings" element={<AdminSettings />} />
            </Route>
        </Routes>
    );
}
