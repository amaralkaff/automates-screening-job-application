import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { DocumentProcessor } from './services/document-processor';
import { EvaluationPipeline } from './services/evaluation-pipeline';
import { JobQueue } from './services/job-queue';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger());

// Initialize services
const documentProcessor = new DocumentProcessor();
const evaluationPipeline = new EvaluationPipeline();
const jobQueue = new JobQueue();

// Ensure uploads directory exists
const UPLOAD_DIR = './uploads';
if (!existsSync(UPLOAD_DIR)) {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

// Schemas for validation
const uploadSchema = z.object({
  cv: z.instanceof(File).refine(file => file.type === 'application/pdf', {
    message: 'CV must be a PDF file',
  }),
  projectReport: z.instanceof(File).refine(file => file.type === 'application/pdf', {
    message: 'Project report must be a PDF file',
  }),
});

const evaluationSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  cvDocumentId: z.string().min(1, 'CV document ID is required'),
  projectReportId: z.string().min(1, 'Project report ID is required'),
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// POST /upload - Accept CV and Project Report PDFs
app.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const cv = body.cv as File;
    const projectReport = body['project-report'] as File;

    // Validate files
    if (!cv || cv.type !== 'application/pdf') {
      return c.json({ error: 'CV must be a PDF file' }, 400);
    }
    if (!projectReport || projectReport.type !== 'application/pdf') {
      return c.json({ error: 'Project report must be a PDF file' }, 400);
    }

    // Generate unique IDs
    const cvId = nanoid();
    const projectReportId = nanoid();

    // Save files
    const cvPath = join(UPLOAD_DIR, `${cvId}.pdf`);
    const projectReportPath = join(UPLOAD_DIR, `${projectReportId}.pdf`);

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

// POST /evaluate - Trigger evaluation pipeline
app.post('/evaluate', zValidator('json', evaluationSchema), async (c) => {
  try {
    const { jobTitle, cvDocumentId, projectReportId } = c.req.valid('json');

    // Generate job ID
    const jobId = nanoid();

    // Add to job queue
    await jobQueue.addJob({
      jobTitle,
      cvDocumentId,
      projectReportId,
      status: 'queued',
    });

    // Start async processing
    evaluationPipeline.processEvaluation(jobId, jobTitle, cvDocumentId, projectReportId)
      .catch(error => console.error('Pipeline error:', error));

    return c.json({
      jobId,
      status: 'queued',
      message: 'Evaluation started. Use jobId to track progress.'
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    return c.json({ error: 'Failed to start evaluation' }, 500);
  }
});

// GET /status/:jobId - Get job status and results
app.get('/status/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const job = await jobQueue.getJob(jobId);

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    return c.json(job);
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({ error: 'Failed to get job status' }, 500);
  }
});

// GET /jobs - List all jobs (for debugging)
app.get('/jobs', async (c) => {
  try {
    const jobs = await jobQueue.getAllJobs();
    return c.json({ jobs });
  } catch (error) {
    console.error('List jobs error:', error);
    return c.json({ error: 'Failed to list jobs' }, 500);
  }
});

const port = parseInt(process.env.PORT || '3001');
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});