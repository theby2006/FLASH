import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000",
  withCredentials: true,
});

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error?.response?.data?.message ?? error.message ?? "Something went wrong";
    console.error("[API Error]", message);
    return Promise.reject(new Error(message));
  }
);

export default api;
