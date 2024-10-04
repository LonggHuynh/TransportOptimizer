// Set up API call here

import axios from 'axios';

export const instance = axios.create({
    baseURL: 'http://localhost:3000',
});
