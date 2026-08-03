import { Link } from "wouter";
import { ShieldAlert, ShieldOff } from "lucide-react";

export function AccessDeniedPage() {
  return (
    <main className="lc-access-page" role="main">
      <ShieldOff aria-hidden />
      <h1>Access denied</h1>
      <p>This workspace is not available for your account role. Sign in again or open the portal that matches your role.</p>
      <div className="lc-access-actions">
        <Link className="lc-button lc-button-primary" href="/login">Sign in</Link>
        <Link className="lc-button" href="/">Back to home</Link>
      </div>
    </main>
  );
}

export function AccountRestrictedPage() {
  return (
    <main className="lc-access-page" role="main">
      <ShieldAlert aria-hidden />
      <h1>Account restricted</h1>
      <p>Your Legal Connect account is suspended or limited. Contact support if you believe this is a mistake.</p>
      <div className="lc-access-actions">
        <Link className="lc-button lc-button-primary" href="/login">Sign in</Link>
        <a className="lc-button" href="mailto:support@legal-connect.in">Email support</a>
      </div>
    </main>
  );
}
