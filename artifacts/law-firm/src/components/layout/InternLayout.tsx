import type { ReactNode } from "react";
import { PortalLayout } from "./PortalLayout";

export function InternLayout({ children }: { children: ReactNode }) {
  return <PortalLayout role="intern">{children}</PortalLayout>;
}
