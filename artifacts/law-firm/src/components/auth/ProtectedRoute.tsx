import { useEffect } from "react";
import { useLocation } from "wouter";
import { getPostLoginRoute, getStoredSession } from "@/lib/authFlow";
import type { AuthUser, UserRole } from "@/lib/authFlow";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  requireVerification?: boolean;
};

export function ProtectedRoute({ children, allowedRoles, requireVerification = false }: ProtectedRouteProps) {
  const [, navigate] = useLocation();
  const user = getStoredSession();

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      navigate("/access-denied");
      return;
    }

    if (user.accountStatus === "suspended") {
      navigate("/account-restricted");
      return;
    }

    if (requireVerification && user.verificationStatus !== "verified") {
      navigate(getPostLoginRoute(user as AuthUser));
    }
  }, [allowedRoles, navigate, requireVerification, user]);

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  if (requireVerification && user.verificationStatus !== "verified") {
    return null;
  }

  return <>{children}</>;
}
