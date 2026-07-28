import type { ReactNode } from "react";
import { PortalLayout } from "./PortalLayout";

export function AdvocateLayout({ children }: { children: ReactNode }) {
  return <PortalLayout role="advocate">{children}</PortalLayout>;
}
