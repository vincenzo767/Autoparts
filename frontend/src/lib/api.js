import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  withXSRFToken: true,
  timeout: 20000,
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    // A CSRF failure means the token cookie is missing or stale: fetch a fresh one and retry once.
    if (response?.status === 403 && response.data?.message === "CSRF" && config && !config._csrfRetried) {
      config._csrfRetried = true;
      await api.get("/auth/session").catch(() => {});
      return api(config);
    }
    if (response?.status === 401 && config && !String(config.url || "").startsWith("/auth/")) {
      window.dispatchEvent(new Event("ra:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export default api;

export function errorMessage(e, fallback = "Something went wrong. Please try again.") {
  if (!e?.response || e.code === "ECONNABORTED") {
    return "We couldn't reach the shop. Check your connection and try again.";
  }
  return e.response.data?.message || fallback;
}

export const fieldErrors = (e) => e?.response?.data?.fields || {};

export async function uploadImage(path, file, onProgress) {
  const body = new FormData();
  body.append("file", file);
  const { data } = await api.post(path, body, {
    timeout: 60000,
    onUploadProgress: (ev) => {
      if (onProgress && ev.total) onProgress(Math.round((ev.loaded / ev.total) * 100));
    },
  });
  return data;
}
