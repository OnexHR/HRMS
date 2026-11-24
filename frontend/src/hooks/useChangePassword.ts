import { useState } from "react";
import employeeApi from "../lib/employeeApi";

export function useChangePassword(_role: "employee" | "manager" = "employee") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await employeeApi.put("/me/password", { currentPassword, newPassword });
      setSuccess(true);
      return true;
    } catch (err: unknown) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      setError(response?.data?.message ?? "Could not update password.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(false);
  };

  return { changePassword, loading, error, success, reset };
}
