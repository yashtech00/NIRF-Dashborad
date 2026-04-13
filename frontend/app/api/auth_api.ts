import { axiosInstance } from "./axiosInstances";

export const register = async (name: string, email: string, password: string) => {
    try{
        const res = await axiosInstance.post("/api/auth/register", { name, email, password });
        const token = res.headers.authorization || res.data.accessToken;
        if (token) {
            localStorage.setItem("token", token.replace("Bearer ", ""));
        }
        return res.data;
    }catch(e){
        console.log(e);
    }
}

export const login = async (email: string, password: string) => {
    try{
        const res = await axiosInstance.post("/api/auth/login", { email, password });
        const token = res.headers.authorization || res.data.accessToken;
        if (token) {
            localStorage.setItem("token", token.replace("Bearer ", ""));
        }
        return res.data;
    }catch(e){
        console.log(e);
    }
}

export const logout = async () => {
    try{
        const res = await axiosInstance.post("/api/auth/logout");
        localStorage.removeItem("token");
        return res.data;
    }catch(e){
        console.log(e);
    }
}

export const refreshAccessToken = async () => {
    try{
        const res = await axiosInstance.post("/api/auth/refresh");
        return res.data;
    }catch(e){
        console.log(e);
    }
}