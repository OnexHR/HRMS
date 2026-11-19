import { useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type CreateHeroTutorPayload = {
  tutor: string;
};

export function useCreateHeroTutor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createHeroTutor = async (payload: CreateHeroTutorPayload) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE_URL}/api/admin/hero-tutors`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return true;
    } catch (err) {
      console.error("Failed to create hero tutor:", err);
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : "Failed to add hero tutor.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { createHeroTutor, loading, error };
}
