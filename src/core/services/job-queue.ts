import type { Job } from '../../shared/types';
import type { EvaluationPipeline } from './evaluation-pipeline';

export class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private isProcessing = false;
  private evaluationPipeline?: EvaluationPipeline;

  setEvaluationPipeline(pipeline: EvaluationPipeline): void {
    this.evaluationPipeline = pipeline;
  }

  async addJob(jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
    const job: Job = {
      id: crypto.randomUUID(),
      ...jobData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(job.id, job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
    
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
  async cleanupOldJobs(maxAgeHours = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt < cutoffTime) {
        this.jobs.delete(jobId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
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

  // Start processing jobs in the queue
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (true) {
      const queuedJobs = await this.getQueuedJobs();
      
      if (queuedJobs.length === 0) {
        this.isProcessing = false;
        break;
      }

      const job = queuedJobs[0];
      if (job) {
        await this.processJob(job);
      }
    }
  }

  // Process a single job
  private async processJob(job: Job): Promise<void> {
    try {
      if (!this.evaluationPipeline) {
        throw new Error('Evaluation pipeline not initialized');
      }

      console.log(`🔄 Processing job ${job.id} for ${job.jobTitle}`);
      
      // Run the evaluation pipeline (it will handle status updates)
      await this.evaluationPipeline.processEvaluation(
        job.id,
        job.jobTitle,
        job.cvDocumentId,
        job.projectReportId
      );

      console.log(`✅ Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      
      await this.updateJob(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}