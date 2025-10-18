import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { config } from '../../config';
import { DocumentProcessor } from '../../core/services/document-processor';
import { EvaluationPipeline } from '../../core/services/evaluation-pipeline';
import { requireAuth } from '../middleware/auth';
import { evaluationLimiter, generalApiLimiter } from '../middleware/rate-limiter';
import { db } from '../../infrastructure/database';
import type { User } from '../../shared/types';

type AuthContext = {
  Variables: {
    user: User;
  };
};

const router = new Hono<AuthContext>();

// Apply general API rate limiting to all routes
router.use('*', generalApiLimiter);

// Initialize services
const documentProcessor = new DocumentProcessor();
const evaluationPipeline = new EvaluationPipeline();

// Ensure uploads directory exists
if (!existsSync(config.env.UPLOAD_DIR)) {
  await writeFile(config.env.UPLOAD_DIR, new Uint8Array(), { flag: 'w' });
}

// POST /upload - Accept CV and Project Report PDFs (protected)
router.post('/upload', requireAuth, async (c) => {
  try {
    const body = await c.req.parseBody();
    const cv = body.cv as File;
    const projectReport = body['project-report'] as File;

    // Validate files
    if (!cv || !config.allowedMimeTypes.includes(cv.type)) {
      return c.json({ error: 'CV must be a PDF or text file' }, 400);
    }
    if (!projectReport || !config.allowedMimeTypes.includes(projectReport.type)) {
      return c.json({ error: 'Project report must be a PDF or text file' }, 400);
    }

    // Generate unique IDs
    const cvId = nanoid();
    const projectReportId = nanoid();

    // Save files with .pdf extension
    const cvPath = join(config.env.UPLOAD_DIR, `${cvId}.pdf`);
    const projectReportPath = join(config.env.UPLOAD_DIR, `${projectReportId}.pdf`);

    await writeFile(cvPath, Buffer.from(await cv.arrayBuffer()));
    await writeFile(projectReportPath, Buffer.from(await projectReport.arrayBuffer()));

    // Process and store in vector database
    await documentProcessor.processDocument(cvPath, cvId, 'cv');
    await documentProcessor.processDocument(projectReportPath, projectReportId, 'project_report');

    return c.json({
      cvDocumentId: cvId,
      projectReportId: projectReportId,
      message: 'Files uploaded and processed successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to upload files' }, 500);
  }
});

// POST /evaluate - Trigger evaluation pipeline (protected, rate limited)
router.post('/evaluate', evaluationLimiter, requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { jobTitle, cvDocumentId, projectReportId } = body;

    if (!jobTitle || !cvDocumentId || !projectReportId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get user from context
    const user = c.get('user');

    // Create job in PostgreSQL database
    const job = await db.createJob({
      userId: user.id,
      jobTitle,
      cvDocumentId,
      projectReportId,
      status: 'processing'  // Start directly in processing status
    });

    console.log('🔄 Starting direct evaluation for job:', job.id);

    // Start evaluation in background (non-blocking)
    setImmediate(async () => {
      try {
        await evaluationPipeline.processEvaluation(
          job.id,
          jobTitle,
          cvDocumentId,
          projectReportId
        );
        console.log('✅ Direct evaluation completed for job:', job.id);
      } catch (error) {
        console.error('❌ Direct evaluation failed for job:', job.id, error);
        await db.updateJobStatus(job.id, 'failed', 0, undefined, error instanceof Error ? error.message : 'Unknown error');
      }
    });

    const response = {
      jobId: job.id,
      status: 'processing',
      message: 'Evaluation started immediately. Use jobId to track progress.'
    };

    return c.json(response);
  } catch (error) {
    console.error('Evaluation error:', error);
    return c.json({ error: 'Failed to start evaluation' }, 500);
  }
});

// GET /status/:jobId - Get job status and results (protected)
router.get('/status/:jobId', requireAuth, async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const job = await db.getJobById(jobId);

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Check if user owns this job
    const user = c.get('user') as User;
    if (job.userId && job.userId !== user.id) {
      // For now, we'll allow access to all jobs in development
      // In production, you might want to enforce ownership
    }

    console.log('Job object keys:', Object.keys(job));
    console.log('Job result exists:', !!job.result);
    console.log('Job result type:', typeof job.result);
    console.log('Full job object:', JSON.stringify(job, null, 2));

    return c.json(job);
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({ error: 'Failed to get job status' }, 500);
  }
});

// GET /jobs - List all jobs (for debugging, protected)
router.get('/jobs', requireAuth, async (c) => {
  try {
    const user = c.get('user');

    // Get jobs for the current user
    const jobs = await db.getJobsByUserId(user.id);

    return c.json({ jobs });
  } catch (error) {
    console.error('List jobs error:', error);
    return c.json({ error: 'Failed to list jobs' }, 500);
  }
});

export default router;