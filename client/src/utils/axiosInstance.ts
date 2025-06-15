import axios from "axios";
import { store } from "../store/store";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL, 
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// axiosInstance.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response) {
//       console.error("API Error:", error.response.data);
//     } else if (error.request) {
//       console.error("No response from server.");
//     } else {
//       console.error("Error:", error.message);
//     }
//     return Promise.reject(error);
//   }
// );

export default axiosInstance;