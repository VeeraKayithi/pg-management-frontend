import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, LogIn, AlertCircle, LoaderCircle } from "lucide-react";
import axios from "axios";

import { logoutUser, saveAuthentication, } from "../services/authService.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api/v1";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedUsername = username.trim();
    const normalizedPassword = password;

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
          password: normalizedPassword
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

      const managementRoles = [
        "ADMIN",
        "BUILDING_ADMIN",
        "SUPERVISOR",
      ];

      if (managementRoles.includes(normalizedRole)) {
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
  <main className="min-h-screen bg-[#F3F6F8] text-[#183B5B] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)]">
    <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#123653] px-12 py-12 text-white lg:flex xl:px-20">
      <div className="relative z-10 flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white p-2"><img src="/nandu_group_of_hostels_logo.svg" alt="NANDU" className="h-full w-full object-contain" /></div><div><p className="text-sm font-bold tracking-[0.15em]">NANDU</p><p className="text-xs text-slate-300">GROUP OF HOSTELS</p></div></div>
      <div className="relative z-10 max-w-xl"><p className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-[#9EC1DC]">NANDU · OPERATIONS WORKSPACE</p><h2 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">Every property.<br/>One connected workspace.</h2><p className="mt-5 max-w-md text-base leading-7 text-slate-300">Your secure access to buildings, rooms, residents, staff, and day-to-day operations.</p><div className="mt-9 h-1 w-20 rounded-full bg-[#8DB6D5]" /></div>
      <p className="relative z-10 text-xs text-slate-400">NANDU Group of Hostels · Internal portal</p>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-44 h-[550px] w-[550px] rounded-full border border-white/10"/><div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-28 h-[380px] w-[380px] rounded-full border border-white/10" />
    </aside>
    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
      <div className="w-full max-w-[410px]">
        <div className="mb-9 flex items-center gap-3 lg:hidden"><img src="/nandu_group_of_hostels_logo.svg" alt="NANDU" className="h-12 w-12 rounded-lg bg-white p-1.5"/><span className="text-sm font-extrabold tracking-wide">NANDU · WORKSPACE</span></div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#63849B]">Secure sign in</p><h1 className="mt-3 text-[32px] font-bold tracking-tight text-[#123653]">Welcome back</h1><p className="mt-2 text-sm text-[#6B7F8F]">Sign in with your assigned portal credentials.</p>
        {searchParams.get("activated") === "true" && <div role="status" className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Your account is activated. Please sign in.</div>}
        <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
          <div><label htmlFor="username" className="mb-2 block text-sm font-semibold">Username</label><input id="username" name="username" type="text" autoComplete="username" value={username} disabled={isLoading} onChange={e=>setUsername(e.target.value)} placeholder="Enter username" className="h-12 w-full rounded-lg border border-[#D4E0E8] bg-white px-4 text-sm text-[#183B5B] outline-none transition focus:border-[#477A9E] focus:ring-2 focus:ring-[#477A9E]/15 disabled:opacity-60" /></div>
          <div><label htmlFor="password" className="mb-2 block text-sm font-semibold">Password</label><div className="relative"><input id="password" name="password" type={showPassword?"text":"password"} autoComplete="current-password" value={password} disabled={isLoading} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" className="h-12 w-full rounded-lg border border-[#D4E0E8] bg-white px-4 pr-12 text-sm text-[#183B5B] outline-none transition focus:border-[#477A9E] focus:ring-2 focus:ring-[#477A9E]/15 disabled:opacity-60"/><button type="button" disabled={isLoading} onClick={()=>setShowPassword(v=>!v)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#6B8292] hover:text-[#183B5B]" aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></div>
          {error && <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{error}</div>}
          <button type="submit" disabled={isLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#183B5B] px-5 text-sm font-semibold text-white transition hover:bg-[#102F4B] disabled:cursor-wait disabled:opacity-60">{isLoading?<LoaderCircle className="animate-spin" size={18}/>:<LogIn size={18}/>} {isLoading?"Signing in...":"Sign in"}</button>
        </form>
        <div className="mt-8 border-t border-[#D8E3EB] pt-5 text-center text-xs text-[#728696]"><LockKeyhole size={14} className="mr-1 inline-block align-[-2px]"/> Authorized team members and residents only</div>
      </div>
    </section>
  </main>
);
}
