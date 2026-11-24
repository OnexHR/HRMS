import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import type { Course } from "../types/Course";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useCourses(_options: Record<string, unknown>) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get<Course[] | { courses: Course[] }>(
        `${API_BASE_URL}/api/admin/courses`,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      );
      setCourses(Array.isArray(response.data)
        ? response.data
        : response.data.courses ?? []);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { courses, loading, refetch };
}
