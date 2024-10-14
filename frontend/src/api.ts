import axios from 'axios';

export const apiInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL ?? '/api',
    timeout: 5000,
});
