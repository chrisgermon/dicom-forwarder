import { ReactNode } from "react";
import { ProtectedRoute } from "./ProtectedRoute";
import { Layout } from "./Layout";

interface ProtectedLayoutRouteProps {
  children: ReactNode;
  requiredRole?: string[];
}

export function ProtectedLayoutRoute({ children, requiredRole }: ProtectedLayoutRouteProps) {
  return (
    <ProtectedRoute requiredRole={requiredRole}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}
