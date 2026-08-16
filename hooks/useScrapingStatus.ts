import { useEffect, useState } from 'react'

type ScrapingStatus = {
  status: 'running' | 'completed' | 'unknown'
  lastRun: string | null;
  categoriesCount: number;
};

export function useScrapingStatus(pollWhenRunning = true) {
  const [data, setData] = useState<ScrapingStatus>({ status: 'unknown', lastRun: null, categoriesCount: 0 });

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/scraping-status');
        const json = await res.json();
        setData(json);
      } catch {}
    };

    check();

    // Poll toutes les 15s si un scraping est en cours
    if (pollWhenRunning && data.status === 'running') {
      const interval = setInterval(check, 15000);
      return () => clearInterval(interval);
    }
  }, [data.status, pollWhenRunning]);

  return data;
}
