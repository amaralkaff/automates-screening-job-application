import Bull from 'bull';
import IORedis from 'ioredis';
import type { Job } from '../types';
import type { EvaluationPipeline } from './evaluation-pipeline';

interface JobData extends Omit<Job, 'id' | 'createdAt' | 'updatedAt'> {
  // Bull job data
}

export class BullJobQueue {
  private queue: Bull.Queue<JobData>;
  private redis: IORedis;
  private evaluationPipeline?: EvaluationPipeline;

  constructor() {
    // Initialize Redis connection
    this.redis = new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

      // Configure Bull queue
    this.queue = new Bull('evaluation', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: null, // Disable for Bun compatibility
        enableReadyCheck: false,        // Disable for Bun compatibility
      },
      settings: {
        stalledInterval: 30 * 1000, // 30 seconds
        maxStalledCount: 1,
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
        attempts: 3,           // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000,         // Start with 2 second delay
        },
      }
    });

    this.setupProcessors();
    this.setupEventListeners();
  }

  private setupProcessors(): void {
    // Process evaluation jobs with concurrency limit
    this.queue.process('evaluation', 3, async (bullJob) => {
      const { jobTitle, cvDocumentId, projectReportId } = bullJob.data;
      const id = bullJob.id!.toString();

      try {
        console.log(`🔄 Processing evaluation job ${id} for ${jobTitle}`);

        // Update job status to processing
        await this.updateJobStatus(id, 'processing', 10);

        if (!this.evaluationPipeline) {
          throw new Error('Evaluation pipeline not initialized');
        }

        // Run the evaluation pipeline and return result
        const result = await this.evaluationPipeline.processEvaluation(
          id,
          jobTitle,
          cvDocumentId,
          projectReportId
        );

        // Update job with result
        await this.updateJobStatus(id, 'completed', 100, { result });

        console.log(`✅ Job ${id} completed successfully`);

        // Return result for Bull to store
        return result;
      } catch (error) {
        console.error(`❌ Job ${id} failed:`, error);

        await this.updateJobStatus(id, 'failed', 0, {
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });

        throw error; // Re-throw to trigger Bull's retry mechanism
      }
    });
  }

  private setupEventListeners(): void {
    this.queue.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    this.queue.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, err.message);
    });

    this.queue.on('stalled', (job) => {
      console.warn(`⚠️ Job ${job.id} stalled`);
    });

    this.queue.on('progress', (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`);
    });

    // Redis connection events
    this.redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    this.redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });

    this.redis.on('close', () => {
      console.log('🔌 Redis connection closed');
    });
  }

  setEvaluationPipeline(pipeline: EvaluationPipeline): void {
    this.evaluationPipeline = pipeline;
  }

  async addJob(jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
    const bullJob = await this.queue.add('evaluation', {
      ...jobData
    }, {
      // Job options
      priority: jobData.priority || 0,
      delay: jobData.delay || 0,
      attempts: jobData.attempts || 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    // Convert Bull job to our Job interface
    const job: Job = {
      id: bullJob.id!.toString(),
      jobTitle: jobData.jobTitle,
      cvDocumentId: jobData.cvDocumentId,
      projectReportId: jobData.projectReportId,
      status: 'queued',
      progress: 0,
      createdAt: new Date(bullJob.opts.timestamp!),
      updatedAt: new Date(bullJob.opts.timestamp!),
    };

    return job;
  }

  async getJob(jobId: string): Promise<Job | null> {
    try {
      const bullJob = await this.queue.getJob(jobId);
      if (!bullJob) {
        return null;
      }

      const state = await bullJob.getState();

      return {
        id: bullJob.id!.toString(),
        jobTitle: bullJob.data.jobTitle,
        cvDocumentId: bullJob.data.cvDocumentId,
        projectReportId: bullJob.data.projectReportId,
        status: this.mapBullStateToJobStatus(state),
        progress: bullJob.progress() || 0,
        result: bullJob.returnvalue,
        error: bullJob.failedReason,
        createdAt: new Date(bullJob.opts.timestamp!),
        updatedAt: new Date(bullJob.timestamp || bullJob.opts.timestamp!),
      };
    } catch (error) {
      console.error('Error getting job:', error);
      return null;
    }
  }

  async updateJob(
    jobId: string,
    updates: Partial<Pick<Job, 'status' | 'progress' | 'result' | 'error'>>
  ): Promise<Job | null> {
    try {
      const bullJob = await this.queue.getJob(jobId);
      if (!bullJob) {
        return null;
      }

      // Update job progress
      if (updates.progress !== undefined) {
        await bullJob.progress(updates.progress);
      }

      // Note: Bull doesn't support updating job data directly after creation
      // Status updates are handled through job state transitions

      return await this.getJob(jobId);
    } catch (error) {
      console.error('Error updating job:', error);
      return null;
    }
  }

  async updateJobStatus(
    jobId: string,
    status: Job['status'],
    progress?: number,
    updates?: Partial<Pick<Job, 'result' | 'error'>>
  ): Promise<void> {
    try {
      const bullJob = await this.queue.getJob(jobId);
      if (!bullJob) {
        return;
      }

      if (progress !== undefined) {
        await bullJob.progress(progress);
      }

      // Store additional data in Redis for status tracking
      const statusKey = `job:${jobId}:status`;
      const statusData = {
        status,
        progress,
        result: updates?.result,
        error: updates?.error,
        updatedAt: new Date().toISOString(),
      };

      await this.redis.setex(statusKey, 86400, JSON.stringify(statusData)); // 24 hours TTL
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  }

  async getAllJobs(limit: number = 50, offset: number = 0): Promise<Job[]> {
    try {
      const jobs = await this.queue.getJobs(['waiting', 'active', 'completed', 'failed'], offset, limit, true);

      const jobPromises = jobs.map(async (bullJob) => {
        const state = await bullJob.getState();
        return {
          id: bullJob.id!.toString(),
          jobTitle: bullJob.data.jobTitle,
          cvDocumentId: bullJob.data.cvDocumentId,
          projectReportId: bullJob.data.projectReportId,
          status: this.mapBullStateToJobStatus(state),
          progress: bullJob.progress() || 0,
          result: bullJob.returnvalue,
          error: bullJob.failedReason,
          createdAt: new Date(bullJob.opts.timestamp!),
          updatedAt: new Date(bullJob.timestamp || bullJob.opts.timestamp!),
        };
      });

      return await Promise.all(jobPromises);
    } catch (error) {
      console.error('Error getting all jobs:', error);
      return [];
    }
  }

  async getJobsByStatus(status: Job['status'], limit: number = 20): Promise<Job[]> {
    try {
      const bullStatus = this.mapJobStatusToBullState(status);
      const jobs = await this.queue.getJobs([bullStatus], 0, limit, true);

      return jobs.map(bullJob => ({
        id: bullJob.id!.toString(),
        jobTitle: bullJob.data.jobTitle,
        cvDocumentId: bullJob.data.cvDocumentId,
        projectReportId: bullJob.data.projectReportId,
        status,
        progress: bullJob.progress() || 0,
        result: bullJob.returnvalue,
        error: bullJob.failedReason,
        createdAt: new Date(bullJob.opts.timestamp!),
        updatedAt: new Date(bullJob.timestamp || bullJob.opts.timestamp!),
      }));
    } catch (error) {
      console.error('Error getting jobs by status:', error);
      return [];
    }
  }

  async getQueueStats(): Promise<{
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    active: number;
  }> {
    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const completed = await this.queue.getCompleted();
      const failed = await this.queue.getFailed();

      return {
        total: waiting.length + active.length + completed.length + failed.length,
        queued: waiting.length,
        processing: active.length,
        completed: completed.length,
        failed: failed.length,
        active: active.length,
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return {
        total: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        active: 0,
      };
    }
  }

  async deleteJob(jobId: string): Promise<boolean> {
    try {
      const bullJob = await this.queue.getJob(jobId);
      if (!bullJob) {
        return false;
      }

      await bullJob.remove();

      // Clean up Redis status data
      const statusKey = `job:${jobId}:status`;
      await this.redis.del(statusKey);

      return true;
    } catch (error) {
      console.error('Error deleting job:', error);
      return false;
    }
  }

  async clearQueue(): Promise<void> {
    try {
      await this.queue.clean(0, 'completed');
      await this.queue.clean(0, 'failed');
    } catch (error) {
      console.error('Error clearing queue:', error);
    }
  }

  async pauseQueue(): Promise<void> {
    await this.queue.pause();
  }

  async resumeQueue(): Promise<void> {
    await this.queue.resume();
  }

  async close(): Promise<void> {
    try {
      await this.queue.close();
      await this.redis.quit();
    } catch (error) {
      console.error('Error closing queue:', error);
    }
  }

  private mapBullStateToJobStatus(state: Bull.JobStatus): Job['status'] {
    switch (state) {
      case 'waiting':
        return 'queued';
      case 'active':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'queued';
    }
  }

  private mapJobStatusToBullState(status: Job['status']): Bull.JobStatus {
    switch (status) {
      case 'queued':
        return 'waiting';
      case 'processing':
        return 'active';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'waiting';
    }
  }
}