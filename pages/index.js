"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useRouter } from "next/router";
import { Bounce, ToastContainer, toast } from 'react-toastify';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    Sentry.addBreadcrumb({
      category: "auth",
      message: "User attempting login",
      level: "info",
    });

    try {
      if (isLogin) {
        // LOGIN
        const res = await fetch("/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Login failed", {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
            transition: Bounce,
          });
          console.error("Login error:", data.error);
          Sentry.captureMessage("Login failed", {
            level: "warning",
            tags: {
              module: "auth-login",
            },
            extra: {
              email: formData.email,
              status: res.status,
              apiMessage: data.error, // only the message
            },
          });
          setIsLoading(false);
          return;
        }

        console.log("Login successful:", data.user);
        toast.success("Login successful!");

        // Fetch full user info
        if (data.user && data.user.id) {
          Sentry.setUser({
            id: data.user.id,
            email: data.user.email,
          });

          try {
            const userRes = await fetch(`/api/users/me?userId=${data.user.id}`);
            const userData = await userRes.json();

            if (userData.success && userData.user) {
              // Store complete user object in localStorage
              localStorage.setItem("user", JSON.stringify(userData.user));
              console.log("User data stored in localStorage:", userData.user);

              // Redirect to dashboard
              setTimeout(() => router.push("/dashboard"), 500);
            } else {
              console.error("Failed to fetch user details");
              toast.error("Failed to load user data");
              setIsLoading(false);
            }
          } catch (fetchError) {
            console.error("Error fetching user details:", fetchError);
            toast.error("Error loading user data");
            setIsLoading(false);
          }
        } else {
          toast.error("Invalid login response");
          setIsLoading(false);
        }

      } else {
        // SIGNUP
        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords do not match", {
            position: "top-right",
            autoClose: 5000,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
          });
          setIsLoading(false);
          return;
        }

        const res = await fetch("/api/users/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login: {
              fullName: formData.name,
              email: formData.email,
              password: formData.password,
            },
            personalDetails: {},
            fitnessGoals: {},
            schedule: {},
            progress: {
              workoutsCompleted: 0,
              caloriesBurned: 0,
              achievements: []
            },
            hydration: {
              dailyGoal: 2500,
              currentProgress: 0,
              workoutIntensity: 'moderate',
              notificationInterval: 45,
              reminder: false
            },
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Signup failed", {
            position: "top-right",
            autoClose: 5000,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
          });
          console.error("Signup error:", data.error);
          Sentry.captureMessage("Signup failed", {
            level: "warning",
            tags: {
              module: "auth-signup",
            },
            extra: {
              email: formData.email,
              status: res.status,
              apiMessage: data.error, // only the message
            },
          });
          setIsLoading(false);
          return;
        }

        console.log("Signup successful:", data.user);
        toast.success("Sign up successful!");

        // Store user data and redirect
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          console.log("User data stored in localStorage:", data.user);
          setTimeout(() => router.push("/dashboard"), 500);
        } else {
          setIsLoading(false);
        }
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: {
          module: "auth-system",
        },
      });

      toast.error(err.message || "An error occurred");
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <ToastContainer />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* Logo/Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isLogin ? "Sign in to continue" : "Sign up to get started"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl border text-gray-700 border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Enter your name"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border text-gray-700 border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border text-gray-700 border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="Enter your password"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-xl border text-gray-700 border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Confirm your password"
                  required={!isLogin}
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    disabled={isLoading}
                    className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-400 disabled:cursor-not-allowed"
                  />
                  <span className="ml-2 text-gray-600">Remember me</span>
                </label>
                <a
                  href="#"
                  className="text-cyan-500 hover:text-cyan-600 font-medium"
                >
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white py-3 rounded-xl font-medium hover:from-cyan-500 hover:to-blue-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isLogin ? "Signing In..." : "Signing Up..."}</span>
                </>
              ) : (
                <span>{isLogin ? "Sign In" : "Sign Up"}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">
                or continue with
              </span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="ml-2 text-sm font-medium text-gray-700">
                Google
              </span>
            </button>
            <button
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="ml-2 text-sm font-medium text-gray-700">
                Facebook
              </span>
            </button>
          </div>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                disabled={isLoading}
                className="text-cyan-500 hover:text-cyan-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-gray-500 mt-6">
          By continuing, you agree to our{" "}
          <a href="#" className="text-cyan-500 hover:text-cyan-600">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-cyan-500 hover:text-cyan-600">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}