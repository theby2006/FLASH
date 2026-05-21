import axios from "axios";
import { auth } from "./firebase";

import { API_BASE_URL } from "../utils/constants";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30_000,
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
    let message =
      error?.response?.data?.message ?? error.message ?? "Something went wrong";

    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      message =
        "Cannot reach the server. Start the backend: cd server && npm run dev (port 5001)";
    }

    console.error("[API Error]", message);
    return Promise.reject(new Error(message));
  }
);

export default api;
