import { useCallback, useRef, useState } from "react";

import { jobCancel, jobDownload, jobStatus, type JobState, type Saved } from "../lib/api";

export function useJob() {
  const [job, setJob] = useState<JobState | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(
    (id: string) => {
      setJob(null);
      setSaved(null);
      setError(null);
      stop();
      const tick = async () => {
        try {
          const st = await jobStatus(id);
          setJob(st);
          if (st.state === "done") {
            stop();
            try {
              const r = await jobDownload(id);
              setSaved(r);
            } catch (e) {
              setError(String(e));
            }
          } else if (st.state === "failed" || st.state === "cancelled") {
            stop();
          }
        } catch (e) {
          setError(String(e));
          stop();
        }
      };
      tick();
      timer.current = window.setInterval(tick, 3000);
    },
    [stop],
  );

  const cancel = useCallback(async () => {
    if (!job) return;
    try {
      await jobCancel(job.id);
    } catch (e) {
      setError(String(e));
    }
  }, [job]);

  const busy =
    job !== null && (job.state === "queued" || job.state === "running");

  return { job, saved, error, busy, start, stop, cancel };
}
