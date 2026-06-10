import { useEffect } from "react";

const HEALTH_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1")
  .replace(/\/api\/v1$/, "") + "/health";

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function useKeepAlive() {
  useEffect(() => {
    const ping = () => fetch(HEALTH_URL, { method: "GET" }).catch(() => undefined);
    ping();
    const id = setInterval(ping, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
