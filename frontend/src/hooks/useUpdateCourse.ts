import { useState } from "react";
import axios from "axios";
import type { Course, CoursePayload } from "../types/Course";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useUpdateCourse() {
  const [loading, setLoading] = useState(false);
  const updateCourse = async (id: string, payload: CoursePayload): Promise<{ ok: boolean; course?: Course; error?: string }> => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put<{ course: Course } | Course>(
        `${API_BASE_URL}/api/admin/courses/${id}`,
        payload,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      );
      return { ok: true, course: "course" in response.data ? response.data.course : response.data };
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      return { ok: false, error: message ?? "Failed to update course." };
    } finally {
      setLoading(false);
    }
  };
  return { updateCourse, loading };
}
