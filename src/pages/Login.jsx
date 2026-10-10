import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";

import { logoutUser, saveAuthentication, } from "../services/authService.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api/v1";

export default function Login() {
  const navigate = useNavigate();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    if (!normalizedUsername || !normalizedPassword) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        {
          username: normalizedUsername,
          password,
        }
      );

      const authData = response.data;

      if (!authData?.token || !authData?.role) {
        throw new Error(
          "Invalid authentication response received from the server."
        );
      }

      saveAuthentication(authData);

      const normalizedRole =
        authData.role.toUpperCase();

      if (normalizedRole === "ADMIN") {
        navigate("/admin/dashboard", {
          replace: true,
        });

        return;
      }

      if (normalizedRole === "TENANT") {
        navigate("/tenant/dashboard", {
          replace: true,
        });

        return;
      }

      logoutUser();

      setError(
        "Your account does not have a supported role."
      );
    } catch (loginError) {
      console.error("Login error:", loginError);

      const backendMessage =
        loginError.response?.data?.message;

      if (!loginError.response) {
        setError(
          "Unable to connect to the server. Please verify that the backend is running."
        );
      } else if (loginError.response.status === 401) {
        setError(
          backendMessage ||
          "Invalid username or password."
        );
      } else if (loginError.response.status === 403) {
        setError(
          backendMessage ||
          "Your account is not allowed to sign in."
        );
      } else {
        setError(
          backendMessage ||
          "Unable to sign in. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5F5F0] px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-stone-300/25 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-rose-200/20 blur-3xl"
      />

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-[2rem] border border-stone-200/70 bg-white p-6 shadow-[0_25px_70px_-30px_rgba(28,25,23,0.32)] sm:p-10">
          <div className="mb-8 text-center">
            <Link
              to="/"
              aria-label="Return to Nandu PG home page"
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 shadow-sm transition-transform hover:scale-105"
            >
              <img
                src="/nandu-logo.svg"
                alt="Nandu PG"
                className="h-9 w-9 object-contain"
              />
            </Link>

            <h1 className="text-3xl font-black uppercase tracking-tighter text-stone-900">
              Nandu
            </h1>

            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.28em] text-stone-400">
              Premium PG
            </p>

            <div className="mt-6">
              <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-stone-600">
                Private Access Portal
              </span>
            </div>

            <h2 className="mt-6 text-3xl font-black tracking-tighter text-stone-900">
              Welcome back
            </h2>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-stone-500">
              Sign in to access your Nandu PG account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500"
              >
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                disabled={isLoading}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-stone-500"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  disabled={isLoading}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 pr-20 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:bg-white focus:ring-4 focus:ring-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 px-4 text-[9px] font-black uppercase tracking-widest text-stone-500 transition-colors hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-stone-900 px-6 py-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-sm transition-all hover:bg-stone-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="mt-8 border-t border-stone-100 pt-6 text-center">
            <Link
              to="/"
              className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-900"
            >
              Back to Nandu PG
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-widest text-stone-400">
          Secure access for authorized residents and management
        </p>
      </motion.section>
    </main>
  );
}
