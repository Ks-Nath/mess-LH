import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Returns a Date object representing the current time in IST (Asia/Kolkata),
 * but mapped into the local system's date object for easy comparisons.
 */
export function getISTDate() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    }).formatToParts(now);

    const map = {};
    parts.forEach(p => map[p.type] = p.value);
    
    // Construct local date numbers matching IST
    return new Date(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
}

/**
 * Returns the current date in IST as a 'YYYY-MM-DD' string.
 */
export function getISTDateString() {
    const date = getISTDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
