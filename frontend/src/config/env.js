// Environment configuration
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'ScholarBridge'
};
