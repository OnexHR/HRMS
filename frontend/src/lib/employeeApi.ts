import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const employeeApi = axios.create({
  baseURL: `${baseURL}/api`,
  headers: { "Content-Type": "application/json" },
});

employeeApi.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("employeeToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("hrms.demo.accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const employeeAdminApi = axios.create({
  baseURL: `${baseURL}/api`,
  headers: { "Content-Type": "application/json" },
});

employeeAdminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default employeeApi;
