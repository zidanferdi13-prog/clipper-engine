'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import toast from 'react-hot-toast';

export function useJobProgress(jobId) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');
  const { on } = useWebSocket();

  useEffect(() => {
    if (!jobId) return;

    // Listen for job progress updates
    const unsubProgress = on('job:progress', (data) => {
      if (data.jobId === jobId) {
        setProgress(data.progress);
        setStatus(data.status);
        setMessage(data.message);
      }
    });

    // Listen for job completed
    const unsubCompleted = on('job:completed', (data) => {
      if (data.jobId === jobId) {
        setProgress(100);
        setStatus('completed');
        setMessage(`Job completed! ${data.clipsCount} clips generated.`);
        toast.success(`Job completed! ${data.clipsCount} clips ready to download.`);
      }
    });

    // Listen for job failed
    const unsubFailed = on('job:failed', (data) => {
      if (data.jobId === jobId) {
        setStatus('failed');
        setMessage(data.error);
        toast.error(`Job failed: ${data.error}`);
      }
    });

    // Listen for clip rendered
    const unsubClip = on('clip:rendered', (data) => {
      if (data.jobId === jobId) {
        toast.success(`Clip ${data.clipIndex}/${data.totalClips} rendered!`);
      }
    });

    return () => {
      unsubProgress?.();
      unsubCompleted?.();
      unsubFailed?.();
      unsubClip?.();
    };
  }, [jobId, on]);

  return { progress, status, message };
}
