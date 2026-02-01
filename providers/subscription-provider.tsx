"use client";

import { createContext, useContext } from "react";

interface SubscriptionContextProps {}

const SubscriptionContext = createContext<SubscriptionContextProps | undefined>(
  undefined,
);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <SubscriptionContext.Provider value={{}}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextProps => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider",
    );
  }
  return context;
};
