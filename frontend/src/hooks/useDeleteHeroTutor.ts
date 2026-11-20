import { useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useDeleteHeroTutor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteHeroTutor = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/admin/hero-tutors/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return true;
    } catch (err) {
      console.error("Failed to delete hero tutor:", err);
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : "Failed to delete hero tutor.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { deleteHeroTutor, loading, error };
}
