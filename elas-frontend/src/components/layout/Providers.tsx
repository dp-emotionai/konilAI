"use client";

import React, { createContext, useContext } from "react";
import { useUIStore } from "@/lib/store/uiStore";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthRestore } from "./AuthRestore";

const UIContext = createContext<ReturnType<typeof useUIStore> | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const store = useUIStore();
  return (
    <UIContext.Provider value={store}>
      <AuthRestore />
      <ToastProvider>{children}</ToastProvider>
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside UIProvider");
  return ctx;
}
