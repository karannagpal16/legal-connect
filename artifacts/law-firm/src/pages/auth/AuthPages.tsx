import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, BadgeCheck, CheckCircle2, FileText, Lock, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { createDemoUser, getPortalForRole, getPostLoginRoute, getStoredSession, isRoleAllowedForPortal, normaliseApiUser, portalCopy, setStoredSession } from "@/lib/authFlow";
import type { Portal } from "@/lib/authFlow";

const pageBg = "min-h-screen bg-[#08111F] text-[#F3EAD7]";
const shell = "mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8";
const panel = "w-full max-w-md rounded-xl border border-[#CDA45E3D] bg-[#101B2DEB] p-6 shadow-2xl";
const input = "h-11 w-full rounded-lg border border-[#CDA45E33] bg-[#08111F] px-3 text-sm text-[#F3EAD7] outline-none transition placeholder:text-[#C9BEA8]/55 focus:border-[#E2C27B] focus:ring-2 focus:ring-[#CDA45E33]";
const button = "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#CDA45E] px-4 text-sm font-bold text-[#08111F] transition hover:bg-[#E2C27B]";
const ghostButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#CDA45E33] bg-[#0F1D31] px-4 text-sm font-semibold text-[#F3EAD7] transition hover:border-[#E2C27B] hover:bg-[#142338]";

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className={pageBg}>
      <div className={shell}>{children}</div>
    </main>
  );
}

export function PortalLogin({ portal }: { portal: Portal }) {
  const [, navigate] = useLocation();
  const copy = portalCopy[portal];
  const [mode, setMode] = useState<"otp" | "password">("otp");
  const [status, setStatus] = useState("Ready for secure sign in");
  const [name, setName] = useState("Legal Connect User");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  async function apiRequest(path: string, body?: Record<string, unknown>) {
    const response = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || data.message || data.error_message || "Request failed.");
    }
    return data;
  }

  async function requestOtp() {
    setLoading(true);
    try {
      const result = await apiRequest("/api/auth/request-code", { email, phone: mobile });
      setStatus(result.devCode ? `Development OTP: ${result.devCode}` : `OTP sent to ${result.destinationMasked || "your contact"}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    try {
      await apiRequest("/api/auth/verify-code", { email, phone: mobile, code: otp });
      setOtpVerified(true);
      setStatus("OTP verified. Continue to open your private dashboard.");
    } catch (error) {
      setOtpVerified(false);
      setStatus(error instanceof Error ? error.message : "OTP could not be verified.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "otp" && !otpVerified) {
        setStatus("Verify the OTP before opening the dashboard.");
        return;
      }

      const path = mode === "password" ? "/api/auth/strict/login" : "/api/auth/login";
      const payload = mode === "password"
        ? { email, password }
        : { name, email, phone: mobile, role: portal, portal, privacyConsent: true };
      const result = await apiRequest(path, payload);
      const user = normaliseApiUser(result.user || {}, result.token);
      setStoredSession(user);
      navigate(result.postLoginRoute || getPostLoginRoute(user));
    } catch (error) {
      const allowDemoFallback = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === "true";
      if (allowDemoFallback) {
        const user = createDemoUser(portal === "admin" ? "admin" : portal, { isDemoAccount: true });
        setStoredSession(user);
        setStatus("Backend login is unavailable, so a clearly marked local demo session was opened.");
        navigate(getPostLoginRoute(user));
        return;
      }
      setStatus(error instanceof Error ? error.message : "Login could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <section className={panel}>
        <Link href="/">
          <button className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#C9BEA8] hover:text-[#F3EAD7]">
            <ArrowLeft className="h-4 w-4" /> Return to Homepage
          </button>
        </Link>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[#CDA45E4D] bg-[#CDA45E1F] text-[#E2C27B]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#CDA45E]">Legal Connect</p>
          <h1 className="mt-2 text-2xl font-black text-[#F3EAD7]">{copy.loginHeading}</h1>
          <p className="mt-2 text-sm text-[#C9BEA8]">{copy.label} portal authentication</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-[#CDA45E24] bg-[#08111F] p-1">
          <button type="button" onClick={() => setMode("otp")} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "otp" ? "bg-[#CDA45E] text-[#08111F] shadow-sm" : "text-[#C9BEA8]"}`}>
            Mobile OTP
          </button>
          <button type="button" onClick={() => setMode("password")} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "password" ? "bg-[#CDA45E] text-[#08111F] shadow-sm" : "text-[#C9BEA8]"}`}>
            Email Password
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "otp" && (
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#C9BEA8]">
                <UserRound className="h-3.5 w-3.5" /> Full Name
              </span>
              <input className={input} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
          )}
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#C9BEA8]">
              {mode === "otp" ? <Phone className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
              {mode === "otp" ? "Mobile Number" : "Email Address"}
            </span>
            <input className={input} value={mode === "otp" ? mobile : email} onChange={(event) => mode === "otp" ? setMobile(event.target.value) : setEmail(event.target.value)} placeholder={mode === "otp" ? "+91 98765 43210" : "you@example.com"} />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#C9BEA8]">
              <Lock className="h-3.5 w-3.5" /> {mode === "otp" ? "OTP" : "Password"}
            </span>
            <input className={input} value={mode === "otp" ? otp : password} onChange={(event) => mode === "otp" ? setOtp(event.target.value) : setPassword(event.target.value)} type={mode === "otp" ? "text" : "password"} placeholder={mode === "otp" ? "Enter 6 digit OTP" : "Enter password"} />
          </label>
          {mode === "otp" && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={requestOtp} disabled={loading} className={ghostButton}>Send OTP</button>
              <button type="button" onClick={verifyOtp} disabled={loading} className={ghostButton}>Verify OTP</button>
            </div>
          )}
          <button disabled={loading} className={button}>{loading ? "Please wait" : "Continue"} <CheckCircle2 className="h-4 w-4" /></button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button type="button" className="font-semibold text-[#C9BEA8] hover:text-[#F3EAD7]">Forgot Password</button>
          {portal !== "admin" && (
            <Link href={`/${portal}/register`}>
              <button className="font-semibold text-[#E2C27B] hover:text-[#F3EAD7]">Create New Account</button>
            </Link>
          )}
        </div>

        <p className="mt-5 rounded-lg border border-[#CDA45E24] bg-[#08111F] px-3 py-2 text-xs font-medium text-[#C9BEA8]">{status}</p>
      </section>
    </AuthFrame>
  );
}

export function PortalRegister({ portal }: { portal: Exclude<Portal, "admin"> }) {
  const [, navigate] = useLocation();
  const copy = portalCopy[portal];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = createDemoUser(portal, { verificationStatus: "draft", onboardingCompleted: false });
    setStoredSession(user);
    navigate(`/${portal}/onboarding`);
  }

  return (
    <AuthFrame>
      <section className={panel}>
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#CDA45E]">Portal Confirmation</p>
          <h1 className="mt-2 text-2xl font-black text-[#F3EAD7]">{copy.createHeading}</h1>
          <Link href="/">
            <button className="mt-3 text-sm font-semibold text-[#C9BEA8] hover:text-[#F3EAD7]">Change account type</button>
          </Link>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {["Full Name", "Mobile Number", "Email Address", "Password", "Confirm Password"].map((field) => (
            <label key={field} className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#C9BEA8]">{field}</span>
              <input className={input} type={field.includes("Password") ? "password" : "text"} />
            </label>
          ))}
          <label className="flex items-start gap-2 rounded-lg border border-[#CDA45E24] bg-[#08111F] p-3 text-xs font-medium text-[#C9BEA8]">
            <input type="checkbox" className="mt-0.5" required />
            I accept the Terms and Privacy Policy.
          </label>
          <button className={button}>Verify and continue</button>
        </form>
      </section>
    </AuthFrame>
  );
}

const onboardingFields: Record<Exclude<Portal, "admin">, string[]> = {
  advocate: ["Bar Council Enrollment Number", "State Bar Council", "Enrollment Year", "Years of Practice", "Primary Courts", "Practice Areas", "Professional Address"],
  client: ["City", "Preferred Language", "Address", "Alternate Contact"],
  intern: ["College or University", "Degree", "Current Year or Semester", "Expected Graduation Year", "Areas of Interest"],
};

export function OnboardingPage({ portal }: { portal: Exclude<Portal, "admin"> }) {
  const [, navigate] = useLocation();
  const user = getStoredSession();
  const needsDocuments = portal !== "client";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextUser = createDemoUser(user?.role ?? portal, {
      ...user,
      onboardingCompleted: true,
      verificationStatus: portal === "client" ? "verified" : "under_review",
    });
    setStoredSession(nextUser);
    navigate(getPostLoginRoute(nextUser));
  }

  return (
    <AuthFrame>
      <section className="w-full max-w-3xl rounded-xl border border-[#CDA45E3D] bg-[#101B2DEB] p-6 shadow-2xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#CDA45E]">{portalCopy[portal].label} Onboarding</p>
            <h1 className="mt-2 text-2xl font-black text-[#F3EAD7]">Complete your profile</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#C9BEA8]">
              {portal === "client" ? "Client setup stays light so legal help is not delayed." : "Verification keeps bookings, missions, and sensitive legal work protected."}
            </p>
          </div>
          <Link href="/">
            <button className={ghostButton}>Change account type</button>
          </Link>
        </div>

        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {onboardingFields[portal].map((field) => (
            <label key={field} className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#C9BEA8]">{field}</span>
              <input className={input} />
            </label>
          ))}
          {needsDocuments && (
            <div className="sm:col-span-2 rounded-lg border border-dashed border-[#CDA45E66] bg-[#08111F] p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-1 h-5 w-5 text-[#E2C27B]" />
                <div>
                  <p className="font-bold text-[#F3EAD7]">Verification documents</p>
                  <p className="mt-1 text-sm text-[#C9BEA8]">
                    Upload controls are represented here for Bar ID, identity proof, student ID, bonafide certificate, or enrolment letter.
                  </p>
                </div>
              </div>
            </div>
          )}
          <button className={`${button} sm:col-span-2`}>
            {portal === "client" ? "Enter Client Dashboard" : "Submit for verification"}
          </button>
        </form>
      </section>
    </AuthFrame>
  );
}

export function VerificationPending({ portal }: { portal: "advocate" | "intern" }) {
  return (
    <AuthFrame>
      <section className={panel}>
        <BadgeCheck className="mb-4 h-10 w-10 text-[#E2C27B]" />
        <h1 className="text-2xl font-black text-[#F3EAD7]">Your professional verification is under review.</h1>
        <p className="mt-3 text-sm leading-6 text-[#C9BEA8]">
          You can complete your profile and explore limited platform features. Client bookings, paid court assignments,
          real supervised missions, verified XP, certificates, and rewards become available after verification.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link href={portal === "advocate" ? "/advocate/dashboard" : "/intern/dashboard"}>
            <button className={button}>Explore limited dashboard</button>
          </Link>
          <Link href="/">
            <button className={ghostButton}>Return to Homepage</button>
          </Link>
        </div>
      </section>
    </AuthFrame>
  );
}

export function PortalMismatch() {
  const current = getStoredSession();
  const currentPortal = current ? getPortalForRole(current.role) : "client";

  return (
    <AuthFrame>
      <section className={panel}>
        <UserRound className="mb-4 h-10 w-10 text-[#D16666]" />
        <h1 className="text-2xl font-black text-[#F3EAD7]">This account is registered as a {currentPortal}.</h1>
        <p className="mt-3 text-sm leading-6 text-[#C9BEA8]">The selected portal requires a different authorised account. The platform will not convert an existing account automatically.</p>
        <div className="mt-5 flex flex-col gap-2">
          {current && (
            <Link href={getPostLoginRoute(current)}>
              <button className={button}>Continue to {portalCopy[currentPortal].label} Dashboard</button>
            </Link>
          )}
          <Link href="/">
            <button className={ghostButton}>Switch Account</button>
          </Link>
        </div>
      </section>
    </AuthFrame>
  );
}

export function StatusPage({ type }: { type: "restricted" | "denied" | "admin" }) {
  const content = useMemo(() => {
    if (type === "restricted") {
      return ["Account restricted", "Your account status is restricted. You can view general account information and contact support or appeal."];
    }
    if (type === "admin") {
      return ["Admin Dashboard", "Verification queue, user suspension, source approval, and audit review controls live here."];
    }
    return ["Access denied", "Your current role does not have permission to open this workspace."];
  }, [type]);

  return (
    <AuthFrame>
      <section className={panel}>
        <ShieldCheck className="mb-4 h-10 w-10 text-[#E2C27B]" />
        <h1 className="text-2xl font-black text-[#F3EAD7]">{content[0]}</h1>
        <p className="mt-3 text-sm leading-6 text-[#C9BEA8]">{content[1]}</p>
        <Link href="/">
          <button className={`${ghostButton} mt-5`}>Return to Homepage</button>
        </Link>
      </section>
    </AuthFrame>
  );
}

export function enterPortal(portal: Portal, navigate: (path: string) => void) {
  const session = getStoredSession();

  if (!session) {
    navigate(`/${portal}/login`);
    return;
  }

  if (isRoleAllowedForPortal(session.role, portal)) {
    navigate(getPostLoginRoute(session));
    return;
  }

  navigate("/portal-mismatch");
}
