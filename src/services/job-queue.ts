import { Job } from '../types';

export class JobQueue {
  private jobs: Map<string, Job> = new Map();

  async addJob(jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
    const job: Job = {
      ...jobData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(job.id, job);
    console.log(`Job ${job.id} added to queue`);
    return job;
  }

  async getJob(jobId: string): Promise<Job | null> {
    const job = this.jobs.get(jobId);
    return job || null;
  }

  async updateJob(
    jobId: string,
    updates: Partial<Pick<Job, 'status' | 'progress' | 'result' | 'error'>>
  ): Promise<Job | null> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, updatedJob);
    console.log(`Job ${jobId} updated: ${JSON.stringify(updates)}`);
    return updatedJob;
  }

  async getAllJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async deleteJob(jobId: string): Promise<boolean> {
    const deleted = this.jobs.delete(jobId);
    if (deleted) {
      console.log(`Job ${jobId} deleted from queue`);
    }
    return deleted;
  }

  async getJobsByStatus(status: Job['status']): Promise<Job[]> {
    return Array.from(this.jobs.values())
      .filter(job => job.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getQueuedJobs(): Promise<Job[]> {
    return this.getJobsByStatus('queued');
  }

  async getProcessingJobs(): Promise<Job[]> {
    return this.getJobsByStatus('processing');
  }

  async getCompletedJobs(): Promise<Job[]> {
    return this.getJobsByStatus('completed');
  }

  async getFailedJobs(): Promise<Job[]> {
    return this.getJobsByStatus('failed');
  }

  // Cleanup old jobs (older than specified hours)
  async cleanupOldJobs(maxAgeHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt < cutoffTime) {
        this.jobs.delete(jobId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old jobs`);
    }

    return deletedCount;
  }

  // Get queue statistics
  async getStats(): Promise<{
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const jobs = Array.from(this.jobs.values());

    return {
      total: jobs.length,
      queued: jobs.filter(job => job.status === 'queued').length,
      processing: jobs.filter(job => job.status === 'processing').length,
      completed: jobs.filter(job => job.status === 'completed').length,
      failed: jobs.filter(job => job.status === 'failed').length,
    };
  }
}