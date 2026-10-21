import { Link } from "react-router-dom";
import { ShieldX, ArrowLeft, LogIn } from "lucide-react";
import { getRole } from "../services/authService.js";

export default function Unauthorized() {
  const role = getRole()?.toUpperCase();
  const destination = ["ADMIN", "BUILDING_ADMIN", "SUPERVISOR"].includes(role)
    ? "/admin/dashboard" : role === "TENANT" ? "/tenant/dashboard" : "/login";
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3F6F8] px-4 py-10 text-[#183B5B]">
      <section className="w-full max-w-[490px] rounded-xl border border-[#D8E3EB] bg-white p-7 shadow-[0_16px_50px_rgba(24,59,91,0.07)] sm:p-10">
        <div className="mb-8 flex items-center gap-3"><img src="/nandu_group_of_hostels_logo.svg" alt="NANDU" className="h-12 w-12 rounded-lg border border-[#E2EAF0] p-1"/><div><p className="text-sm font-extrabold tracking-wide">NANDU</p><p className="text-xs text-[#7A8C99]">GROUP OF HOSTELS</p></div></div>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#FCECEC] text-[#B04444]"><ShieldX size={28}/></div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B6470]">Access restricted · 403</p><h1 className="mt-2 text-3xl font-bold tracking-tight">You don't have access</h1><p className="mt-3 text-sm leading-6 text-[#647C8E]">Your account doesn't have permission to view this page. Contact your administrator if you believe this is a mistake.</p>
        <Link to={destination} className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#183B5B] px-5 text-sm font-semibold text-white transition hover:bg-[#102F4B]">{destination === "/login" ? <LogIn size={17}/> : <ArrowLeft size={17}/>} {destination === "/login" ? "Return to sign in" : "Back to dashboard"}</Link>
      </section>
    </main>
  );
}
