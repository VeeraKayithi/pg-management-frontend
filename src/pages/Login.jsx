
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import axios from "axios";

import {
  logoutUser,
  saveAuthentication,
} from "../services/authService.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api/v1";

const LOGO = "/nandu_group_of_hostels_logo.svg";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Sign-in transition
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [redirectPath, setRedirectPath] = useState(null);

  useEffect(() => {
    if (!redirectPath) return;

    const timer = setTimeout(() => {
      navigate(redirectPath, { replace: true });
    }, 1500);

    return () => clearTimeout(timer);
  }, [redirectPath, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading || isSigningIn) return;

    setError("");

    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
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

      const normalizedRole = authData.role
        .replace(/^ROLE_/i, "")
        .toUpperCase();

      const managementRoles = [
        "ADMIN",
        "BUILDING_ADMIN",
        "SUPERVISOR",
      ];

      let destination = null;

      if (managementRoles.includes(normalizedRole)) {
        destination = "/admin/dashboard";
      } else if (normalizedRole === "TENANT") {
        destination = "/tenant/dashboard";
      }

      if (!destination) {
        setError(
          "Your account does not have a supported role."
        );
        return;
      }

      saveAuthentication({
        ...authData,
        role: normalizedRole,
      });

      setIsSigningIn(true);
      setRedirectPath(destination);
    } catch (loginError) {
      console.error("Login error:", loginError);

      const backendMessage =
        loginError.response?.data?.message;

      if (!loginError.response && loginError.message?.startsWith("Invalid authentication")) {
        setError(loginError.message);
      } else if (!loginError.response) {
        setError(
          "Unable to connect to the server. Please verify that the backend is running."
        );
      } else if (loginError.response.status === 401) {
        setError(
          backendMessage || "Invalid username or password."
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
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#F7F5EF] px-4 py-10 text-[#183B5B] sm:px-6">

      {/* NANDU Background Logo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <img
          src={LOGO}
          alt=""
          className="w-[650px] max-w-none object-contain opacity-[0.07] sm:w-[850px] lg:w-[1050px]"
        />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[420px]">

        <section className="rounded-2xl border border-white/70 bg-white/65 px-6 py-8 shadow-[0_16px_45px_rgba(24,59,91,0.10)] backdrop-blur-md sm:px-8">

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-[26px] font-bold tracking-tight text-[#183B5B]">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-[#78716C]">
              Sign in to your account
            </p>
          </div>

          {/* Account Activated */}
          {searchParams.get("activated") === "true" && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            >
              Your account is activated. Please sign in.
            </div>
          )}

          {/* Session Expired */}
          {searchParams.get("sessionExpired") === "true" && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              Your session has expired. Please sign in again.
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5"
          >

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-[13px] font-semibold text-[#183B5B]"
              >
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                disabled={isLoading || isSigningIn}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="h-12 w-full rounded-lg border border-[#DDDCD7] bg-white/70 px-4 text-sm text-[#183B5B] outline-none transition placeholder:text-[#A8A29E] focus:border-[#63849B] focus:ring-2 focus:ring-[#63849B]/15 disabled:opacity-60"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[13px] font-semibold text-[#183B5B]"
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
                  disabled={isLoading || isSigningIn}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="h-12 w-full rounded-lg border border-[#DDDCD7] bg-white/70 px-4 pr-12 text-sm text-[#183B5B] outline-none transition placeholder:text-[#A8A29E] focus:border-[#63849B] focus:ring-2 focus:ring-[#63849B]/15 disabled:opacity-60"
                />

                <button
                  type="button"
                  disabled={isLoading || isSigningIn}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#78716C] hover:text-[#183B5B]"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Login Error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
                <span>{error}</span>
              </div>
            )}

            {/* Sign In */}
            <button
              type="submit"
              disabled={isLoading || isSigningIn}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#183B5B] text-sm font-semibold text-white transition hover:bg-[#102F4B] disabled:cursor-wait disabled:opacity-60"
            >
              {isLoading || isSigningIn ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <LogIn size={18} />
              )}

              {isLoading || isSigningIn
                ? "Signing in..."
                : "Sign in"}
            </button>
          </form>
        </section>
      </div>

      {/* Successful Sign-In Animation */}
      {isSigningIn && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F7F5EF]"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <img
              src={LOGO}
              alt="NANDU"
              className="h-[130px] w-[130px] object-contain sm:h-[150px] sm:w-[150px]"
            />

            <h2 className="mt-6 text-xl font-bold text-[#183B5B]">
              Welcome to NANDU
            </h2>

            <p className="mt-2 text-sm text-[#71889A]">
              Opening your workspace...
            </p>

            <div className="mt-6 h-1 w-36 overflow-hidden rounded-full bg-[#E0E8EF]">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: 1.3,
                  ease: "easeInOut",
                }}
                className="h-full rounded-full bg-[#183B5B]"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </main>
  );
}
