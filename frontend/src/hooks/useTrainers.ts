import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface Trainer {
  _id: string;
  name: string;
  image?: string;
  language?: string;
  [key: string]: unknown;
}

type UseTrainersParams = {
  page?: string | number;
  limit?: string | number;
};

function extractList(payload: unknown): Trainer[] {
  if (Array.isArray(payload)) return payload as Trainer[];

  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    for (const key of ["trainers", "data", "results", "docs"]) {
      if (Array.isArray(data[key])) return data[key] as Trainer[];
    }
  }

  return [];
}

export function useTrainers({ page = 1, limit = 100 }: UseTrainersParams = {}) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchTrainers = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/api/admin/trainers`, {
          params: { page, limit },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (active) setTrainers(extractList(res.data));
      } catch (err) {
        console.error("Failed to fetch trainers:", err);
        if (active) {
          setError(
            axios.isAxiosError(err)
              ? err.response?.data?.message || err.message
              : "Failed to load trainers.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTrainers();

    return () => {
      active = false;
    };
  }, [page, limit]);

  return { trainers, loading, error };
}
