"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, User, Lock } from "lucide-react";
import { register, login } from "@/app/api/auth_api";
import { useRouter } from "next/navigation";

interface UniqueFormProps {
  mode: "login" | "signup";
}

export default function UniqueForm({ mode }: UniqueFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const response = await register(name, email, password);
        if (response?.success || response?.accessToken) {
          console.log("Registration successful:", response);
          router.push("/pages/dashboard");
        } else {
          setError(response?.message || "Registration failed");
        }
      } else {
        const response = await login(email, password);
        if (response?.success) {
          console.log("Login successful:", response);
          router.push("/pages/dashboard");
        } else {
          setError(response?.message || "Login failed");
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Card className="w-full max-w-md shadow-2xl rounded-3xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            {mode === "login" ? (
              <Lock className="w-8 h-8 text-white" />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            {mode === "login" ? "Welcome Back" : "Create Your Account"}
          </CardTitle>
          <p className="text-center text-sm text-gray-500 mt-3">
            {mode === "login"
              ? "Enter your credentials to access your account."
              : "Sign up and start exploring features tailored just for you."}
          </p>
        </CardHeader>
        <CardContent className="px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Full Name</Label>
                <div className="flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50/50 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-200">
                  <User className="w-5 h-5 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none bg-transparent text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address</Label>
              <div className="flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50/50 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-200">
                <Mail className="w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none bg-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
              <div className="flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 py-3 bg-gray-50/50 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all duration-200">
                <Lock className="w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none bg-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl hover:cursor-pointer text-white font-semibold shadow-lg shadow-blue-500/30 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 py-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                mode === "login" ? "Sign In" : "Get Started"
              )}
            </Button>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                {error}
              </div>
            )}
          </form>

          {mode === "signup" && (
            <p className="text-xs text-gray-500 text-center mt-6 leading-relaxed">
              By continuing, you agree to our{" "}
              <span className="text-blue-600 font-semibold cursor-pointer hover:underline transition-colors">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-blue-600 font-semibold cursor-pointer hover:underline transition-colors">
                Privacy Policy
              </span>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
