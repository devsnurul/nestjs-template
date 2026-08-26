export interface JobData<T = unknown> {
  payload: T;
  metadata?: {
    userId?: string;
    requestId?: string;
    timestamp?: number;
  };
}

export interface QueueJobResult<T = unknown> {
  jobId: string;
  name: string;
  data?: T;
  status: 'completed' | 'failed' | 'waiting' | 'active' | 'delayed';
  progress?: number | object;
  returnValue?: unknown;
  failedReason?: string;
  finishedOn?: number;
  processedOn?: number;
  timestamp: number;
}
