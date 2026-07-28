import type { ReactNode } from "react";
import { PortalLayout } from "./PortalLayout";

export function Layout({ children }: { children: ReactNode }) {
  return <PortalLayout role="admin">{children}</PortalLayout>;
}
