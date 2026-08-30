import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  Gavel,
  LayoutDashboard,
  Loader2,
  Scale,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  normaliseRole,
  roleHome,
  useAuth,
  type AppRole,
} from "@/lib/auth";

const roles: Array<{
  role: AppRole;
  label: string;
  detail: string;
  icon: typeof Scale;
}> = [
  { role: "client", label: "Client", detail: "Cases and legal help", icon: UserRound },
  { role: "advocate", label: "Advocate", detail: "Practice workspace", icon: Gavel },
  { role: "intern", label: "Intern", detail: "Quests and learning", icon: BookOpen },
  { role: "admin", label: "Admin", detail: "Platform control", icon: LayoutDashboard },
];

const OWNER_EMAIL = "karannagpal16@gmail.com";
const OWNER_DESK_KEY = "lc_owner_desk";

function readOwnerDeskUnlocked(params: URLSearchParams) {
  if (typeof window === "undefined") return false;
  if (params.get("owner") === "1" || params.get("ops") === "1") {
    try {
      window.sessionStorage.setItem(OWNER_DESK_KEY, "1");
    } catch {
      /* ignore */
    }
    return true;
  }
  try {
    return window.sessionStorage.getItem(OWNER_DESK_KEY) === "1";
  } catch {
    return false;
  }
}

export function Login() {
  const [, setLocation] = useLocation();
  const { session, login, register } = useAuth();
  const params = useMemo(
    () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
    [],
  );
  const requestedRole = normaliseRole(params.get("role"));
  const [ownerDesk, setOwnerDesk] = useState(false);
  const [mode, setMode] = useState<"login" | "register">(
    params.get("mode") === "register" ? "register" : "login",
  );
  const [role, setRole] = useState<AppRole>(requestedRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [stateBarCouncil, setStateBarCouncil] = useState("");
  const [practiceCourts, setPracticeCourts] = useState("");
  const [practiceAreas, setPracticeAreas] = useState("");
  const [yearsPractice, setYearsPractice] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [lawSchool, setLawSchool] = useState("");
  const [studyYear, setStudyYear] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const unlocked = readOwnerDeskUnlocked(params);
    setOwnerDesk(unlocked);
    if (unlocked) {
      setEmail(OWNER_EMAIL);
    } else if (requestedRole === "admin") {
      setRole("client");
    }
  }, [params, requestedRole]);

  const selectMode = (next: "login" | "register") => {
    setMode(next);
    if (next === "register" && role === "admin") setRole("client");
    setError("");
  };

  const enterSession = (next: Awaited<ReturnType<typeof login>>) => {
    window.location.assign(roleHome(next.user.role));
  };

  const handleOwnerPortal = async (portalRole: AppRole) => {
    setError("");
    if (!password.trim()) {
      setError("Enter your owner password, then choose a portal.");
      return;
    }
    setBusy(portalRole);
    setRole(portalRole);
    try {
      enterSession(await login({
        email: OWNER_EMAIL,
        password,
        role: portalRole,
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Owner portal login is unavailable.");
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "register" && !consent) {
      setError("Please accept the privacy notice to create your account.");
      return;
    }
    setBusy("form");
    try {
      if (mode === "login") {
        enterSession(await login({ email, password, role }));
      } else {
        enterSession(await register({
          name,
          email,
          password,
          role: role as Exclude<AppRole, "admin">,
          phone,
          address,
          aadhaarNumber,
          enrollmentNo,
          stateBarCouncil,
          practiceCourts,
          practiceAreas,
          yearsPractice,
          officeAddress,
          collegeId,
          lawSchool,
          studyYear,
        }));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sign in.");
    } finally {
      setBusy(null);
    }
  };

  if (session) {
    return (
      <div className="lc-auth-loading">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <h1>You are already signed in</h1>
        <button className="lc-button lc-button-primary" onClick={() => setLocation(roleHome(session.user.role))}>
          Open dashboard <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="lc-login-page">
      <section className="lc-login-visual" aria-label="Legal Connect">
        <div className="lc-login-visual-content">
          <Link href="/" className="lc-login-brand">
            <span className="lc-brand-symbol"><Scale /></span>
            <span><strong>Legal Connect</strong><small>India's Legal OS</small></span>
          </Link>
          <div className="lc-login-promise">
            <span className="lc-kicker">ONE ACCOUNT. ONE WORKSPACE.</span>
            <h1>Legal work without the confusion.</h1>
            <p>Sign in once and reach the dashboard built for your role.</p>
          </div>
          <div className="lc-login-trust">
            <span><ShieldCheck /> Role-protected access</span>
            <span><Scale /> Clear activity trail</span>
          </div>
        </div>
      </section>

      <main className="lc-login-main">
        <div className="lc-login-card">
          <Link href="/" className="lc-login-back">← Back to home</Link>
          <div className="lc-auth-tabs" role="tablist" aria-label="Account mode">
            <button className={mode === "login" ? "active" : ""} onClick={() => selectMode("login")}>Sign in</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => selectMode("register")}>Create account</button>
          </div>

          <div className="lc-login-heading">
            <span className="lc-kicker">SECURE ACCESS</span>
            <h2>{mode === "login" ? "Welcome back" : "Create your workspace"}</h2>
            <p>
              {mode === "login"
                ? "Pick a portal role, then sign in with your Legal Connect credentials."
                : "Complete the identity fields for your role. Legal Connect reviews professional credentials."}
            </p>
          </div>

          <div className="lc-role-picker" aria-label="Select a role">
            {roles.filter((item) => item.role !== "admin" || ownerDesk).map((item) => (
              <button
                key={item.role}
                type="button"
                className={role === item.role ? "active" : ""}
                onClick={() => setRole(item.role)}
              >
                <item.icon />
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              </button>
            ))}
          </div>

          <form className="lc-login-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <div className="lc-form-grid">
                <label>
                  <span>Full legal name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="As shown on your identity record" autoComplete="name" required />
                </label>
                <label>
                  <span>Mobile number</span>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" inputMode="tel" autoComplete="tel" />
                </label>
              </div>
            )}
            <label>
              <span>Email address</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" required />
            </label>
            <label>
              <span>Password</span>
              <div className="lc-password-field">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
            {mode === "register" && role === "client" && (
              <fieldset className="lc-role-fields">
                <legend>Client identity</legend>
                <div className="lc-form-grid">
                  <label>
                    <span>Aadhaar number</span>
                    <input
                      value={aadhaarNumber}
                      onChange={(event) => setAadhaarNumber(event.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="12-digit number"
                      inputMode="numeric"
                      autoComplete="off"
                      required
                    />
                  </label>
                  <label>
                    <span>Residential address</span>
                    <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="City, State" autoComplete="street-address" required />
                  </label>
                </div>
                <p><ShieldCheck /> The raw Aadhaar number is never retained. We store a one-way verification hash and masked last four digits.</p>
              </fieldset>
            )}
            {mode === "register" && role === "advocate" && (
              <fieldset className="lc-role-fields">
                <legend>Professional credentials</legend>
                <div className="lc-form-grid">
                  <label>
                    <span>Bar enrollment number</span>
                    <input value={enrollmentNo} onChange={(event) => setEnrollmentNo(event.target.value)} placeholder="D/1234/2020" required />
                  </label>
                  <label>
                    <span>State Bar Council</span>
                    <input value={stateBarCouncil} onChange={(event) => setStateBarCouncil(event.target.value)} placeholder="Bar Council of Delhi" required />
                  </label>
                  <label>
                    <span>Practising courts</span>
                    <input value={practiceCourts} onChange={(event) => setPracticeCourts(event.target.value)} placeholder="Delhi HC, Tis Hazari" required />
                  </label>
                  <label>
                    <span>Years in practice</span>
                    <input value={yearsPractice} onChange={(event) => setYearsPractice(event.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="6" inputMode="numeric" />
                  </label>
                  <label>
                    <span>Practice areas</span>
                    <input value={practiceAreas} onChange={(event) => setPracticeAreas(event.target.value)} placeholder="Criminal, civil, consumer" />
                  </label>
                  <label>
                    <span>Office address</span>
                    <input value={officeAddress} onChange={(event) => setOfficeAddress(event.target.value)} placeholder="Chamber / office address" />
                  </label>
                </div>
                <p><ShieldCheck /> Enrollment details are encrypted in transit and visible only to authorised Legal Connect administrators.</p>
              </fieldset>
            )}
            {mode === "register" && role === "intern" && (
              <fieldset className="lc-role-fields">
                <legend>Academic credentials</legend>
                <div className="lc-form-grid">
                  <label>
                    <span>College ID number</span>
                    <input value={collegeId} onChange={(event) => setCollegeId(event.target.value)} placeholder="University ID" required />
                  </label>
                  <label>
                    <span>Law school</span>
                    <input value={lawSchool} onChange={(event) => setLawSchool(event.target.value)} placeholder="College / university name" required />
                  </label>
                  <label>
                    <span>Current year</span>
                    <select value={studyYear} onChange={(event) => setStudyYear(event.target.value)} required>
                      <option value="">Select year</option>
                      <option value="1">Year 1</option>
                      <option value="2">Year 2</option>
                      <option value="3">Year 3</option>
                      <option value="4">Year 4</option>
                      <option value="5">Year 5</option>
                    </select>
                  </label>
                </div>
                <p><ShieldCheck /> Academic identity is placed in the admin verification queue before chamber work is assigned.</p>
              </fieldset>
            )}
            {mode === "login" && role === "admin" && (
              <div className="lc-admin-access-note"><ShieldCheck /> Admin credentials are issued directly by Legal Connect. Public admin registration is disabled.</div>
            )}
            {mode === "register" && (
              <label className="lc-consent-field">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                <span>
                  I agree to the{" "}
                  <Link href="/privacy">privacy notice</Link>
                  {" "}and{" "}
                  <Link href="/terms">terms of use</Link>
                  {" "}for secure processing of my account information.
                </span>
              </label>
            )}
            {error && <div className="lc-form-error" role="alert">{error}</div>}
            <button className="lc-button lc-button-primary lc-button-full" disabled={Boolean(busy)}>
              {busy === "form" ? <Loader2 className="lc-spin" /> : null}
              {mode === "login" ? "Sign in to dashboard" : "Create account"}
              {busy !== "form" ? <ArrowRight /> : null}
            </button>
          </form>

          {ownerDesk && mode === "login" ? (
            <>
              <div className="lc-demo-divider"><span>owner desk · private</span></div>
              <div className="lc-demo-grid">
                {roles.map((item) => (
                  <button key={item.role} onClick={() => handleOwnerPortal(item.role)} disabled={Boolean(busy)}>
                    {busy === item.role ? <Loader2 className="lc-spin" /> : <item.icon />}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <p className="lc-demo-note">
                Owner desk only. Enter your password above, then open any portal. Paid features stay free on this account.
              </p>
            </>
          ) : null}

          <p className="lc-demo-note">
            <Link href="/privacy">Privacy</Link>
            {" · "}
            <Link href="/terms">Terms</Link>
            {" · "}
            <Link href="/refund">Refunds</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
