import { useMemo, useState, type FormEvent } from "react";
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

export function Login() {
  const [, setLocation] = useLocation();
  const { session, login, register, demoLogin } = useAuth();
  const params = useMemo(
    () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
    [],
  );
  const requestedRole = normaliseRole(params.get("role"));
  const [mode, setMode] = useState<"login" | "register">(
    params.get("mode") === "register" ? "register" : "login",
  );
  const [role, setRole] = useState<AppRole>(requestedRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const selectMode = (next: "login" | "register") => {
    setMode(next);
    if (next === "register" && role === "admin") setRole("client");
    setError("");
  };

  const enterSession = (next: Awaited<ReturnType<typeof login>>) => {
    window.location.assign(roleHome(next.user.role));
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
        enterSession(await login({ email, password }));
      } else {
        enterSession(await register({
          name,
          email,
          password,
          role: role as Exclude<AppRole, "admin">,
        }));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sign in.");
    } finally {
      setBusy(null);
    }
  };

  const handleDemo = async (demoRole: AppRole) => {
    setError("");
    setBusy(demoRole);
    try {
      enterSession(await demoLogin(demoRole));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Demo login is unavailable.");
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
            <p>{mode === "login" ? "Use your registered email and password." : "Choose a role and complete the three fields below."}</p>
          </div>

          <div className="lc-role-picker" aria-label="Select a role">
            {roles.filter((item) => mode === "login" || item.role !== "admin").map((item) => (
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
              <label>
                <span>Full name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" autoComplete="name" required />
              </label>
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
            {mode === "register" && (
              <label className="lc-consent-field">
                <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                <span>I agree to the privacy notice and secure processing of my account information.</span>
              </label>
            )}
            {error && <div className="lc-form-error" role="alert">{error}</div>}
            <button className="lc-button lc-button-primary lc-button-full" disabled={Boolean(busy)}>
              {busy === "form" ? <Loader2 className="lc-spin" /> : null}
              {mode === "login" ? "Sign in to dashboard" : "Create account"}
              {busy !== "form" ? <ArrowRight /> : null}
            </button>
          </form>

          <div className="lc-demo-divider"><span>or open a demo workspace</span></div>
          <div className="lc-demo-grid">
            {roles.map((item) => (
              <button key={item.role} onClick={() => handleDemo(item.role)} disabled={Boolean(busy)}>
                {busy === item.role ? <Loader2 className="lc-spin" /> : <item.icon />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <p className="lc-demo-note">Demo workspaces use sample data and never charge real money.</p>
        </div>
      </main>
    </div>
  );
}
