import axios from 'axios';

// Create an axios instance
const axiosClient = axios.create({
    baseURL: process.env.REACT_APP_BASE_URL
})

// Intercept requests
axiosClient.interceptors.request.use( 
    (config) => {
        const token = localStorage.getItem('token');
        if(token){
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Intercept responses
axiosClient.interceptors.response.use(
    (response) => {
        // Any status code that lie within the range of 2xx cause this function to trigger
        // Do something with response data
        return response;
    },  
    (error) => {
        // Any status codes that falls outside the range of 2xx cause this function to trigger
        // Do something with response error
    return Promise.reject(error)}
);

export default axiosClient;