"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "../app/api/auth_api";

export default function NavBar() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        setIsAuthenticated(!!token);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            setIsAuthenticated(false);
            router.push("/");
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
            <nav className="flex w-full max-w-5xl items-center justify-between rounded-full border border-gray-200/80 bg-white/80 px-6 py-3 shadow-md backdrop-blur-md">
                <div className="flex items-center">
                    <Link href="/" className="text-xl font-extrabold tracking-tight text-gray-900">
                        NIRF<span className="text-blue-600">Analytics</span>
                    </Link>
                </div>

                <div className="flex items-center gap-6">
                    {isAuthenticated ? (
                        <>
                            <Link
                                href="/pages/dashboard"
                                className="text-sm font-semibold text-gray-600 transition-colors hover:text-gray-900"
                            >
                                Dashboard
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
                            >
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/pages/auth/login"
                                className="text-sm font-semibold text-gray-600 transition-colors hover:text-gray-900"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/pages/auth/signup"
                                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow"
                            >
                                Sign up
                            </Link>
                        </>
                    )}
                </div>
            </nav>
        </div>
    );
}