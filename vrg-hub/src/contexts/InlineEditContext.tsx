import React, { createContext, useContext, useState } from "react";

interface InlineEditContextValue {
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
}

const InlineEditContext = createContext<InlineEditContextValue | undefined>(undefined);

export const useInlineEdit = () => {
  const context = useContext(InlineEditContext);
  if (!context) {
    throw new Error("useInlineEdit must be used within InlineEditProvider");
  }
  return context;
};

export function InlineEditProvider({ children }: { children: React.ReactNode }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <InlineEditContext.Provider value={{ isEditing, setIsEditing }}>
      {children}
    </InlineEditContext.Provider>
  );
}
