import { useState } from "react";
import employeeApi from "../lib/employeeApi";

// Two realms share this hook. Employees and managers hold the employee JWT and
// must hit /api/employee/auth/change-password, which employeeApi targets and
// authenticates. Tutors hold the platform token and still use
// /api/auth/change-password, so the caller has to say which one it is;
// defaulting to the employee realm would silently break the tutor screen.
export const useChangePassword = (realm: "employee" | "platform" = "employee") => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (realm === "employee") {
        await employeeApi.put("/auth/change-password", { currentPassword, newPassword });
      } else {
        const { default: axios } = await import("axios");
        const token = localStorage.getItem("token");
        await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/api/auth/change-password`,
          { currentPassword, newPassword },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      setSuccess(true);
      return true;
    } catch (err: any) {
      console.error("Failed to change password", err);
      setError(err.response?.data?.message || "Failed to update password. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { changePassword, loading, error, success };
};
