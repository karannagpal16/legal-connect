export type Portal = "advocate" | "client" | "intern" | "admin";
export type UserRole = Portal | "rna";
export type AccountStatus = "active" | "suspended";
export type VerificationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "additional_information_required"
  | "verified"
  | "rejected"
  | "suspended";

export type AuthUser = {
  id: string;
  fullName: string;
  name?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  verificationStatus: VerificationStatus;
  onboardingCompleted: boolean;
  permissions: string[];
  token?: string;
  isDemoAccount?: boolean;
  emailMasked?: string;
  phoneMasked?: string;
};

export const portalRoles: Record<Portal, UserRole[]> = {
  advocate: ["advocate", "rna"],
  client: ["client"],
  intern: ["intern"],
  admin: ["admin"],
};

export const portalCopy: Record<Portal, {
  label: string;
  loginHeading: string;
  createHeading: string;
  dashboard: string;
  onboarding: string;
  pending?: string;
}> = {
  advocate: {
    label: "Advocate",
    loginHeading: "Welcome to your Litigation Command Centre",
    createHeading: "You are creating an Advocate Account",
    dashboard: "/advocate",
    onboarding: "/advocate",
    pending: "/advocate",
  },
  client: {
    label: "Client",
    loginHeading: "Welcome to your Personal Legal Hub",
    createHeading: "You are creating a Client Account",
    dashboard: "/client",
    onboarding: "/client",
  },
  intern: {
    label: "Intern",
    loginHeading: "Welcome to Internverse",
    createHeading: "You are creating an Internverse Account",
    dashboard: "/intern",
    onboarding: "/intern",
    pending: "/intern",
  },
  admin: {
    label: "Administrator",
    loginHeading: "Legal Connect Administration",
    createHeading: "Administrator accounts are invitation only",
    dashboard: "/admin",
    onboarding: "/admin",
  },
};

const sessionKey = "legal-connect-session";

const rolePermissions: Record<UserRole, string[]> = {
  client: ["case:create", "case:view", "booking:create", "lawbot:use"],
  advocate: ["case:create", "case:view", "case:update", "diary:manage", "judgment:view", "lawbot:use", "booking:accept"],
  rna: ["case:create", "case:view", "case:update", "diary:manage", "judgment:view", "lawbot:use", "booking:accept", "proxy_task:accept", "internal_matter:view"],
  intern: ["learning:view", "intern_mission:explore", "lawbot:use"],
  admin: ["user:verify", "user:suspend", "source:approve", "audit:view", "admin:user_verify"],
};

export function createDemoUser(role: UserRole, overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: `user_${role}_demo`,
    fullName: role === "admin" ? "Legal Connect Admin" : "Demo User",
    role,
    accountStatus: "active",
    verificationStatus: role === "client" || role === "admin" ? "verified" : "under_review",
    onboardingCompleted: role === "client" || role === "admin",
    permissions: rolePermissions[role],
    ...overrides,
  };
}

export function getStoredSession(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(sessionKey);
    return raw ? JSON.parse(raw) as AuthUser : null;
  } catch {
    return null;
  }
}

export function setStoredSession(user: AuthUser) {
  window.localStorage.setItem(sessionKey, JSON.stringify(user));
  if (user.token) {
    window.localStorage.setItem("legal-connect-token", user.token);
  }
}

export function clearStoredSession() {
  window.localStorage.removeItem(sessionKey);
  window.localStorage.removeItem("legal-connect-token");
}

export function isRoleAllowedForPortal(role: UserRole, portal: Portal) {
  return portalRoles[portal].includes(role);
}

export function getPostLoginRoute(user: AuthUser) {
  if (user.accountStatus === "suspended") {
    return "/account-restricted";
  }

  // Launch: send every healthy role to its live portal home.
  // Legacy /dashboard, /onboarding, and /verification-pending URLs redirect in App.tsx.
  switch (user.role) {
    case "client":
      return "/client";
    case "advocate":
    case "rna":
      return "/advocate";
    case "intern":
      return "/intern";
    case "admin":
      return "/admin";
    default:
      return "/access-denied";
  }
}

export function getPortalForRole(role: UserRole): Portal {
  return role === "rna" ? "advocate" : role;
}

export function normaliseApiUser(user: Partial<AuthUser> & { name?: string }, token?: string): AuthUser {
  const role = (user.role && portalRoles.advocate.concat(portalRoles.client, portalRoles.intern, portalRoles.admin).includes(user.role)
    ? user.role
    : "client") as UserRole;

  return createDemoUser(role, {
    ...user,
    fullName: user.fullName || user.name || "Legal Connect User",
    accountStatus: user.accountStatus || "active",
    verificationStatus: user.verificationStatus || "verified",
    onboardingCompleted: user.onboardingCompleted ?? true,
    token,
    isDemoAccount: false,
  });
}
