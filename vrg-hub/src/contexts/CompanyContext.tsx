import React from 'react';

// Stub for single-tenant mode
export const CompanyContext = React.createContext<any>(null);

export function useCompanyContext() {
  return {
    selectedCompany: null,
    setSelectedCompany: () => {},
  };
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  return <CompanyContext.Provider value={null}>{children}</CompanyContext.Provider>;
}
