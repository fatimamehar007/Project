import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date with optional format string
export function formatDate(date: Date | string, formatStr = 'PPP') {
  return format(new Date(date), formatStr);
}

// Format file size
export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Truncate text with ellipsis
export function truncateText(text: string, length: number) {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

// Validate Aadhaar number
export function isValidAadhaar(aadhaar: string) {
  const aadhaarRegex = /^\d{12}$/;
  return aadhaarRegex.test(aadhaar);
}

// Validate phone number
export function isValidPhone(phone: string) {
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// Get initials from name
export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Calculate confidence score color
export function getConfidenceColor(score: number) {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
}

// Format percentage
export function formatPercentage(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
) {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Generate random ID
export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Check if object is empty
export function isEmpty(obj: object) {
  return Object.keys(obj).length === 0;
}

// Convert object to query string
export function toQueryString(obj: Record<string, any>) {
  return Object.entries(obj)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join('&');
}

// Parse query string
export function parseQueryString(queryString: string) {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
} 