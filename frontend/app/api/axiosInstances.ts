import axios from "axios";

// Clean the baseURL to ensure it's not empty and has a protocol
let baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Ensure baseURL starts with http/https to prevent relative path issues in Axios
if (baseURL && !baseURL.startsWith("http")) {
    baseURL = `https://${baseURL}`;
}

export const axiosInstance = axios.create({
    baseURL: baseURL.replace(/\/$/, ""), // Remove trailing slash if present
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add request interceptor to include token from localStorage (client-side only)
axiosInstance.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
    
