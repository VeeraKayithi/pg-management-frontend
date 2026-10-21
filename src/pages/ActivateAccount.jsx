import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, ArrowLeft, LoaderCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  completeAccountActivation,
  validateActivationToken,
} from "../services/accountActivationService.js";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

function getErrorMessage(error, fallback) {
  const data = error.response?.data;

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (data && typeof data === "object") {
    const messages = Object.values(data).filter(
      (value) => typeof value === "string"
    );

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return fallback;
}

export default function ActivateAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [validation, setValidation] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setError("The activation link is missing its token.");
        setIsValidating(false);
        return;
      }

      try {
        const response = await validateActivationToken(token);
        setValidation(response);

        if (!response.valid) {
          setError(response.message || "This activation link is invalid.");
        }
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "This activation link is invalid or has expired."
          )
        );
      } finally {
        setIsValidating(false);
      }
    };

    validate();
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!PASSWORD_PATTERN.test(newPassword)) {
      setError(
        "Password must be 8 to 72 characters and contain uppercase, lowercase, and a number."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await completeAccountActivation({
        token,
        newPassword,
        confirmPassword,
      });

      setSuccessMessage(
        response.message ||
          "Account activated successfully. You can now sign in."
      );

      window.setTimeout(() => {
        navigate("/login?activated=true", { replace: true });
      }, 1800);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to activate your account."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3F6F8] px-4 py-10 text-[#183B5B]">
      <section className="w-full max-w-[490px] overflow-hidden rounded-xl border border-[#D8E3EB] bg-white shadow-[0_16px_50px_rgba(24,59,91,0.07)]">
        <div className="h-1.5 bg-[#183B5B]" />
        <div className="p-6 sm:p-9">
          <div className="mb-6 flex items-center gap-3"><img src="/nandu_group_of_hostels_logo.svg" alt="NANDU" className="h-12 w-12 rounded-lg border border-[#E2EAF0] p-1"/><div><p className="text-sm font-extrabold tracking-wide">NANDU</p><p className="text-xs text-[#7A8C99]">GROUP OF HOSTELS</p></div></div>
          <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-lg bg-[#E9F1F7] text-[#183B5B]"><KeyRound size={22}/></div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#66849A]">Account activation</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Create your password</h1>
          <p className="mt-2 text-sm leading-6 text-[#6A7F8E]">Verify your invitation and activate your portal account.</p>
          {isValidating ? <div role="status" className="mt-7 flex items-center gap-3 rounded-lg bg-[#F2F6F9] px-4 py-5 text-sm text-[#5F7789]"><LoaderCircle size={18} className="animate-spin"/> Verifying activation link...</div> : <>
            {validation?.valid && <div className="mt-6 rounded-lg border border-[#D8E3EB] bg-[#F6F9FB] px-4 py-3"><p className="text-xs font-semibold text-[#6B8394]">Activating account for</p><p className="mt-1 text-sm font-semibold">{validation.tenantName || validation.username}</p><p className="mt-1 text-xs text-[#6B8394]">Username: {validation.username}</p></div>}
            {error && <div role="alert" className="mt-5 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={18} className="shrink-0"/>{error}</div>}
            {successMessage && <div role="status" className="mt-5 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 size={18} className="shrink-0"/>{successMessage}</div>}
            {validation?.valid && !successMessage && <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div><label htmlFor="newPassword" className="mb-2 block text-sm font-semibold">New password</label><div className="relative"><input id="newPassword" type={showPassword?"text":"password"} value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password" placeholder="Create a password" disabled={isSubmitting} className="h-12 w-full rounded-lg border border-[#D4E0E8] bg-white px-4 pr-12 text-sm outline-none focus:border-[#477A9E] focus:ring-2 focus:ring-[#477A9E]/15"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide passwords":"Show passwords"} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#728899]">{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></div>
              <div><label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold">Confirm password</label><input id="confirmPassword" type={showPassword?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Re-enter password" disabled={isSubmitting} className="h-12 w-full rounded-lg border border-[#D4E0E8] bg-white px-4 text-sm outline-none focus:border-[#477A9E] focus:ring-2 focus:ring-[#477A9E]/15"/></div>
              <p className="text-xs leading-5 text-[#6A7F8E]">8–72 characters, including uppercase, lowercase, and a number.</p>
              <button type="submit" disabled={isSubmitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#183B5B] px-5 text-sm font-semibold text-white transition hover:bg-[#102F4B] disabled:opacity-60">{isSubmitting && <LoaderCircle size={18} className="animate-spin"/>}{isSubmitting?"Activating...":"Activate account"}</button>
            </form>}
            {!validation?.valid && <p className="mt-5 text-sm text-[#6A7F8E]">Ask your administrator to resend the activation email.</p>}
          </>}
          <Link to="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#315E7D] hover:text-[#123653]"><ArrowLeft size={16}/> Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
