import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { jobCancel, jobDownload, jobStatus, type JobState, type Saved } from "../lib/api";

export type JobCtl = {
  job: JobState | null;
  saved: Saved | null;
  error: string | null;
  busy: boolean;
  start: (id: string) => void;
  cancel: () => Promise<void>;
  clear: () => void;
};

const Ctx = createContext<JobCtl | null>(null);
const LS_KEY = "serverpult.activeJob";

export function JobProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<JobState | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const downloadedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const poll = useCallback(
    async (id: string) => {
      try {
        const st = await jobStatus(id);
        setJob(st);
        if (st.state === "done") {
          stopPolling();
          if (!downloadedRef.current) {
            downloadedRef.current = true;
            try {
              setSaved(await jobDownload(id));
            } catch (e) {
              setError(String(e));
            }
          }
          localStorage.removeItem(LS_KEY);
        } else if (st.state === "failed" || st.state === "cancelled") {
          stopPolling();
          localStorage.removeItem(LS_KEY);
        }
      } catch (e) {
        setError(String(e));
        stopPolling();
      }
    },
    [stopPolling],
  );

  const start = useCallback(
    (id: string) => {
      setSaved(null);
      setError(null);
      setJob(null);
      downloadedRef.current = false;
      localStorage.setItem(LS_KEY, id);
      stopPolling();
      poll(id);
      timer.current = window.setInterval(() => poll(id), 3000);
    },
    [poll, stopPolling],
  );

  const cancel = useCallback(async () => {
    const id = job?.id ?? localStorage.getItem(LS_KEY);
    if (!id) return;
    try {
      await jobCancel(id);
    } catch (e) {
      setError(String(e));
    }
  }, [job]);

  const clear = useCallback(() => {
    setJob(null);
    setSaved(null);
    setError(null);
    localStorage.removeItem(LS_KEY);
  }, []);

  // При запуске приложения — подхватить активное задание, если оно было.
  useEffect(() => {
    const id = localStorage.getItem(LS_KEY);
    if (id) start(id);
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = job !== null && (job.state === "queued" || job.state === "running");

  return (
    <Ctx.Provider value={{ job, saved, error, busy, start, cancel, clear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGlobalJob(): JobCtl {
  const c = useContext(Ctx);
  if (!c) throw new Error("JobProvider отсутствует");
  return c;
}
