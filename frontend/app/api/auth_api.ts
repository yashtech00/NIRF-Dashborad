import { axiosInstance } from "./axiosInstances";

type AuthResponseData = {
    accessToken?: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
    message?: string;
    success?: boolean;
};

const extractToken = (data: AuthResponseData, headers: Record<string, string | undefined>) => {
    const headerToken = headers?.authorization;
    const bodyToken = data?.accessToken;
    const token = headerToken || bodyToken;

    return token ? token.replace("Bearer ", "") : null;
};

export const register = async (name: string, email: string, password: string) => {
    const res = await axiosInstance.post("/api/auth/register", { name, email, password });
    const token = extractToken(res.data, res.headers as Record<string, string | undefined>);

    if (token) {
        localStorage.setItem("token", token);
    }

    return {
        ...res.data,
        accessToken: token,
        success: Boolean(token || res.data?.user),
    };
}

export const login = async (email: string, password: string) => {
    const res = await axiosInstance.post("/api/auth/login", { email, password });
    const token = extractToken(res.data, res.headers as Record<string, string | undefined>);

    if (token) {
        localStorage.setItem("token", token);
    }

    return {
        ...res.data,
        accessToken: token,
        success: Boolean(token || res.data?.user),
    };
}

export const logout = async () => {
    const res = await axiosInstance.post("/api/auth/logout");
    localStorage.removeItem("token");
    return res.data;
}

export const refreshAccessToken = async () => {
    const res = await axiosInstance.post("/api/auth/refresh");
    const token = extractToken(res.data, res.headers as Record<string, string | undefined>);

    if (token) {
        localStorage.setItem("token", token);
    }

    return {
        ...res.data,
        accessToken: token,
        success: Boolean(token),
    };
}
