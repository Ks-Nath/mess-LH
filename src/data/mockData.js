// Student accounts — username: messNumber, password: phone
export const mockStudents = [
    {
        id: 1,
        name: 'Arjun Kumar',
        messNumber: 'MESS-001',
        phone: '9876543210',
        role: 'user',
        roomNo: 'A-204',
        messStatus: 'Active',
        messType: 'Veg',
        joinDate: '2025-07-15',
    },
    {
        id: 2,
        name: 'Priya Sharma',
        messNumber: 'MESS-002',
        phone: '9876543211',
        role: 'user',
        roomNo: 'B-112',
        messStatus: 'Active',
        messType: 'Non-Veg',
        joinDate: '2025-07-20',
    },
    {
        id: 3,
        name: 'Rahul Verma',
        messNumber: 'MESS-003',
        phone: '9876543212',
        role: 'user',
        roomNo: 'C-305',
        messStatus: 'On Leave Today',
        messType: 'Veg',
        joinDate: '2025-08-01',
    },
    {
        id: 4,
        name: 'Sneha Reddy',
        messNumber: 'MESS-004',
        phone: '9876543213',
        role: 'user',
        roomNo: 'A-108',
        messStatus: 'Active',
        messType: 'Non-Veg',
        joinDate: '2025-07-18',
    },
    {
        id: 5,
        name: 'Karthik Nair',
        messNumber: 'MESS-005',
        phone: '9876543214',
        role: 'user',
        roomNo: 'D-201',
        messStatus: 'Active',
        messType: 'Veg',
        joinDate: '2025-08-10',
    },
];

// Admin account — login with email + password
export const mockAdmin = {
    id: 100,
    name: 'Mess Admin',
    email: 'admin@mess.in',
    // password: REMOVED (See .env for credentials)
    role: 'admin',
    messId: 'MESS-001',
    designation: 'Administrator',
};

export const weeklyMenu = {
    Monday: {
        breakfast: ['Idli', 'Sambar', 'Coconut Chutney', 'Tea/Coffee'],
        lunch: ['Rice', 'Dal Tadka', 'Aloo Gobi', 'Curd', 'Pickle'],
        dinner: ['Chapati', 'Paneer Butter Masala', 'Jeera Rice', 'Salad'],
    },
    Tuesday: {
        breakfast: ['Poha', 'Boiled Eggs', 'Toast & Butter', 'Tea/Coffee'],
        lunch: ['Rice', 'Rajma', 'Mixed Veg', 'Raita', 'Papad'],
        dinner: ['Chapati', 'Chicken Curry', 'Fried Rice', 'Soup'],
    },
    Wednesday: {
        breakfast: ['Dosa', 'Sambar', 'Tomato Chutney', 'Tea/Coffee'],
        lunch: ['Rice', 'Sambar', 'Bhindi Fry', 'Buttermilk', 'Pickle'],
        dinner: ['Chapati', 'Chole', 'Pulao', 'Salad'],
    },
    Thursday: {
        breakfast: ['Paratha', 'Curd', 'Pickle', 'Tea/Coffee'],
        lunch: ['Rice', 'Dal Fry', 'Egg Curry', 'Cucumber Salad', 'Papad'],
        dinner: ['Chapati', 'Mutton Curry', 'Steamed Rice', 'Gulab Jamun'],
    },
    Friday: {
        breakfast: ['Upma', 'Vada', 'Coconut Chutney', 'Tea/Coffee'],
        lunch: ['Biryani', 'Raita', 'Mirchi Ka Salan', 'Onion Salad'],
        dinner: ['Chapati', 'Palak Paneer', 'Jeera Rice', 'Ice Cream'],
    },
    Saturday: {
        breakfast: ['Puri Bhaji', 'Sprouts', 'Tea/Coffee'],
        lunch: ['Rice', 'Kadhi', 'Aloo Matar', 'Pickle', 'Papad'],
        dinner: ['Chapati', 'Fish Curry', 'Fried Rice', 'Salad'],
    },
    Sunday: {
        breakfast: ['Chole Bhature', 'Lassi', 'Tea/Coffee'],
        lunch: ['Special Biryani', 'Chicken 65', 'Raita', 'Sweet'],
        dinner: ['Chapati', 'Mixed Dal', 'Veg Pulao', 'Kheer'],
    },
};

export const billConfig = {
    costPerDay: 140,
    month: 'February',
    year: 2026,
    totalDaysInMonth: 28,
};

export const initialLeaves = [
    // Pre-selected leave dates (ISO strings, just dates)
    '2026-02-05',
    '2026-02-06',
    '2026-02-15',
];

export const LEAVE_CUTOFF_HOUR = 20; // 8 PM
export const MAX_LEAVES_PER_MONTH = 10; // Max leave days allowed per calendar month
