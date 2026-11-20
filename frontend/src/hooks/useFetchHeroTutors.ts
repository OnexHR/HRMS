import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface HeroTutor {
  id: string;
  name: string;
  imgUrl?: string;
  subject?: string;
  [key: string]: unknown;
}

function normalizeTutor(item: Record<string, unknown>): HeroTutor {
  return {
    ...item,
    id: String(item.id ?? item._id ?? ""),
    name: String(item.name ?? "Unknown"),
    imgUrl: (item.imgUrl ?? item.image ?? item.profile) as string | undefined,
    subject: (item.subject ?? item.language) as string | undefined,
  };
}

function extractTutors(payload: unknown): HeroTutor[] {
  let list: unknown[] = [];

  if (Array.isArray(payload)) {
    list = payload;
  } else if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    for (const key of ["heroTutors", "tutors", "data", "results", "docs"]) {
      if (Array.isArray(data[key])) {
        list = data[key] as unknown[];
        break;
      }
    }
  }

  return list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(normalizeTutor);
}

export function useFetchHeroTutors() {
  const [heroTutors, setHeroTutors] = useState<HeroTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/admin/hero-tutors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      setHeroTutors(extractTutors(res.data));
    } catch (err) {
      console.error("Failed to fetch hero tutors:", err);
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || err.message
          : "Failed to load hero tutors.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { heroTutors, loading, error, refetch };
}
