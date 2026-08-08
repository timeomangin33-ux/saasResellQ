'use client';

import { useScrapingStatus } from '@/hooks/useScrapingStatus';
import { useEffect, useState } from 'react';

export function ScrapingStatusBadge() {
  const { status, lastRun, categoriesCount } = useScrapingStatus();
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastRun) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const last = new Date(lastRun);
      const diffMs = now.getTime() - last.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) setTimeAgo('À l\'instant');
      else if (diffMins < 60) setTimeAgo(`Il y a ${diffMins}m`);
      else if (diffHours < 24) setTimeAgo(`Il y a ${diffHours}h`);
      else setTimeAgo(`Il y a ${diffDays}j`);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000);
    return () => clearInterval(interval);
  }, [lastRun]);

  if (status === 'unknown') {
    return (
      <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-xs font-medium">
        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
        Statut inconnu
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-medium">
        <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mr-2 animate-pulse"></div>
        Scraping en cours... ({categoriesCount}/14)
      </div>
    );
  }

  return (
    <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
      <span className="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full mr-2"></span>
      Mis à jour {timeAgo}
    </div>
  );
}
