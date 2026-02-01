"use client";

import { createContext, useContext, useState } from "react";

type Views = "chat" | "threads" | "projects" | "settings";

interface ViewContextProps {
  view: Views;
  setView: (view: Views) => void;

  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
}

const ViewContext = createContext<ViewContextProps | undefined>(undefined);

export const ViewProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [view, setView] = useState<Views>("chat");
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);

  return (
    <ViewContext.Provider
      value={{ view, setView, sidebarExpanded, setSidebarExpanded }}
    >
      {children}
    </ViewContext.Provider>
  );
};

export const useView = (): ViewContextProps => {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error("useView must be used within a ViewProvider");
  }

  return context;
};
