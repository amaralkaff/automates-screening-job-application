import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { swaggerUI } from '@hono/swagger-ui';
import { nanoid } from 'nanoid';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { DocumentProcessor } from './services/document-processor';
import { EvaluationPipeline } from './services/evaluation-pipeline';
import { BullJobQueue } from './services/bull-job-queue';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://34.101.92.66:3000',
    'http://34.101.92.66:3001',
    'http://34.101.92.66',
    'http://localhost:3001'
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use('*', logger());

// Initialize services
const documentProcessor = new DocumentProcessor();
const jobQueue = new BullJobQueue();
const evaluationPipeline = new EvaluationPipeline(jobQueue);
// Connect the services
jobQueue.setEvaluationPipeline(evaluationPipeline);

// Ensure uploads directory exists
const UPLOAD_DIR = './uploads';
if (!existsSync(UPLOAD_DIR)) {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

// OpenAPI specification
const openAPISpec = {
  openapi: '3.0.0',
  info: {
    title: 'AI CV Evaluation System API',
    version: '1.0.0',
    description: 'Backend service that automates the initial screening of job applications using AI',
  },
  servers: [
    {
      url: 'http://34.101.92.66',
      description: 'Production server',
    },
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Check if the system is running',
        responses: {
          '200': {
            description: 'System is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', example: '2025-01-01T00:00:00.000Z' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/upload': {
      post: {
        tags: ['Documents'],
        summary: 'Upload CV and Project Report',
        description: 'Upload candidate CV and project report PDFs for evaluation',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['cv', 'project-report'],
                properties: {
                  cv: {
                    type: 'string',
                    format: 'binary',
                    description: 'Candidate CV (PDF file)',
                  },
                  'project-report': {
                    type: 'string',
                    format: 'binary',
                    description: 'Project report (PDF file)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Files uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cvDocumentId: { type: 'string', example: 'abc123def456' },
                    projectReportId: { type: 'string', example: 'xyz789ghi012' },
                    message: { type: 'string', example: 'Files uploaded and processed successfully' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid file format',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'CV must be a PDF file' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/evaluate': {
      post: {
        tags: ['Evaluation'],
        summary: 'Start evaluation job',
        description: 'Trigger the AI evaluation pipeline for uploaded documents',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['jobTitle', 'cvDocumentId', 'projectReportId'],
                properties: {
                  jobTitle: {
                    type: 'string',
                    example: 'Product Engineer (Backend)',
                    description: 'The job title being applied for',
                  },
                  cvDocumentId: {
                    type: 'string',
                    example: 'abc123def456',
                    description: 'CV document ID from upload response',
                  },
                  projectReportId: {
                    type: 'string',
                    example: 'xyz789ghi012',
                    description: 'Project report ID from upload response',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Evaluation job started',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobId: { type: 'string', example: 'job_abc123' },
                    status: { type: 'string', example: 'queued' },
                    message: { type: 'string', example: 'Evaluation started. Use jobId to track progress.' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/status/{jobId}': {
      get: {
        tags: ['Evaluation'],
        summary: 'Get job status',
        description: 'Retrieve the status and results of an evaluation job',
        parameters: [
          {
            name: 'jobId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The job ID returned from /evaluate endpoint',
            example: 'job_abc123',
          },
        ],
        responses: {
          '200': {
            description: 'Job status retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: {
                      type: 'string',
                      enum: ['queued', 'processing', 'completed', 'failed'],
                    },
                    progress: { type: 'number', example: 75 },
                    result: {
                      type: 'object',
                      properties: {
                        cvEvaluation: {
                          type: 'object',
                          properties: {
                            technicalSkillsMatch: {
                              type: 'object',
                              properties: {
                                score: { type: 'number', example: 4 },
                                details: { type: 'string' },
                              },
                            },
                            experienceLevel: {
                              type: 'object',
                              properties: {
                                score: { type: 'number', example: 3 },
                                details: { type: 'string' },
                              },
                            },
                            relevantAchievements: {
                              type: 'object',
                              properties: {
                                score: { type: 'number', example: 4 },
                                details: { type: 'string' },
                              },
                            },
                            culturalFit: {
                              type: 'object',
                              properties: {
                                score: { type: 'number', example: 4 },
                                details: { type: 'string' },
                              },
                            },
                          },
                        },
                        projectEvaluation: {
                          type: 'object',
                          properties: {
                            correctness: {
                              type: 'object',
                              properties: {
                                score: { type: 'number', example: 5 },
                                details: { type: 'string' },
                              },
                            },
                            codeQuality: {
                              type: 'object',
                              properties: {
                                score: { type: 'number', example: 4 },
                                details: { type: 'string' },
                              },
                            },
                            resilience: {
                              type: 'object',
                              properties: {
                                score: { type: 'number', example: 4 },
                                details: { type: 'string' },
                              },
                            },
                            documentation: {
                              type: 'object',
                              properties: {
                                score: { type: 'number', example: 3 },
                                details: { type: 'string' },
                              },
                            },
                            creativity: {
                              type: 'object',
                              properties: {
                                score: { type: 'number', example: 3 },
                                details: { type: 'string' },
                              },
                            },
                          },
                        },
                        overallSummary: { type: 'string' },
                        finalScore: {
                          type: 'object',
                          properties: {
                            cvScore: { type: 'number', example: 3.75 },
                            projectScore: { type: 'number', example: 4.2 },
                            overallScore: { type: 'number', example: 3.98 },
                          },
                        },
                      },
                    },
                    error: { type: 'string' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Job not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'Job not found' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/jobs': {
      get: {
        tags: ['Evaluation'],
        summary: 'List all jobs',
        description: 'Get a list of all evaluation jobs (for debugging)',
        responses: {
          '200': {
            description: 'List of all jobs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          status: { type: 'string' },
                          progress: { type: 'number' },
                          createdAt: { type: 'string' },
                          updatedAt: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: 'System', description: 'System health and status endpoints' },
    { name: 'Documents', description: 'Document upload and management' },
    { name: 'Evaluation', description: 'AI evaluation pipeline endpoints' },
  ],
};

// Swagger UI
app.get('/swagger', swaggerUI({ url: '/api-spec' }));

// OpenAPI Spec endpoint
app.get('/api-spec', (c) => {
  return c.json(openAPISpec);
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

    // Validate files - Allow text for testing perfect scoring
    if (!cv || (cv.type !== 'application/pdf' && cv.type !== 'text/plain')) {
      return c.json({ error: 'CV must be a PDF or text file' }, 400);
    }
    if (!projectReport || (projectReport.type !== 'application/pdf' && projectReport.type !== 'text/plain')) {
      return c.json({ error: 'Project report must be a PDF or text file' }, 400);
    }

    // Generate unique IDs
    const cvId = nanoid();
    const projectReportId = nanoid();

    // Save files with .pdf extension
    const cvExtension = '.pdf';
    const projectExtension = '.pdf';
    const cvPath = join(UPLOAD_DIR, `${cvId}${cvExtension}`);
    const projectReportPath = join(UPLOAD_DIR, `${projectReportId}${projectExtension}`);

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
app.post('/evaluate', async (c) => {
  try {
    const body = await c.req.json();
    const { jobTitle, cvDocumentId, projectReportId } = body;

    if (!jobTitle || !cvDocumentId || !projectReportId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Generate job ID and add to job queue
    const job = await jobQueue.addJob({
      jobTitle,
      cvDocumentId,
      projectReportId,
      status: 'queued',
    });

    // Bull queue will automatically start processing the job
    // No need for manual async processing

    return c.json({
      jobId: job.id,
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

const port = parseInt(process.env.PORT || '3000');

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
});

console.log(`Server ready on http://localhost:${port}`);
console.log(`📚 Swagger UI available at http://localhost:${port}/swagger`);
