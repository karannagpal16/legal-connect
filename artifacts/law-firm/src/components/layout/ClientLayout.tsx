import type { ReactNode } from "react";
import { PortalLayout } from "./PortalLayout";

export function ClientLayout({ children }: { children: ReactNode }) {
  return <PortalLayout role="client">{children}</PortalLayout>;
}
