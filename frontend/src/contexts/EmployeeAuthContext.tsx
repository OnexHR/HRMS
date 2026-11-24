import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { EmployeeUser } from "../types/Employee";

type EmployeeAuthValue = {
  employee: EmployeeUser | null;
  setEmployee: (employee: EmployeeUser | null) => void;
  logout: () => void;
  refreshEmployee: () => Promise<void>;
};

const EmployeeAuthContext = createContext<EmployeeAuthValue>({
  employee: null,
  setEmployee: () => {},
  logout: () => {},
  refreshEmployee: async () => {},
});

export function EmployeeAuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<EmployeeUser | null>(() => {
    try {
      const stored = localStorage.getItem("employee");
      return stored ? JSON.parse(stored) as EmployeeUser : null;
    } catch {
      return null;
    }
  });

  const value = useMemo<EmployeeAuthValue>(() => ({
    employee,
    setEmployee: (next) => {
      setEmployee(next);
      if (next) localStorage.setItem("employee", JSON.stringify(next));
      else localStorage.removeItem("employee");
    },
    logout: () => {
      setEmployee(null);
      localStorage.removeItem("employee");
      localStorage.removeItem("employeeToken");
    },
    refreshEmployee: async () => {},
  }), [employee]);

  return (
    <EmployeeAuthContext.Provider value={value}>
      {children}
    </EmployeeAuthContext.Provider>
  );
}

export function useEmployeeAuth() {
  return useContext(EmployeeAuthContext);
}
