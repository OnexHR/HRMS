import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useDeleteCourse() {
  const deleteCourse = async (id: string) => {
    const token = localStorage.getItem("token");
    await axios.delete(`${API_BASE_URL}/api/admin/courses/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return true;
  };
  return { deleteCourse };
}
