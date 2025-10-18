import { config } from '../../config';

export function createOpenAPISpec() {
  return {
    openapi: '3.0.0',
    info: {
      title: 'AI CV Evaluation System API',
      version: '1.0.0',
      description: 'Backend service that automates the initial screening of job applications using AI',
    },
    servers: [
      {
        url: `http://localhost:${config.env.PORT}`,
        description: 'Local development server',
      },
      {
        url: 'http://34.101.92.66',
        description: 'Production server',
      },
    ],
    paths: {
      '/auth/sign-up': {
        post: {
          tags: ['Authentication'],
          summary: 'Sign up new user',
          description: 'Register a new user account with email, password, and name',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'user@example.com',
                      description: 'User email address',
                    },
                    password: {
                      type: 'string',
                      minLength: 6,
                      example: 'password123',
                      description: 'User password (min 6 characters)',
                    },
                    name: {
                      type: 'string',
                      minLength: 2,
                      example: 'John Doe',
                      description: 'User full name',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'User created successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SignUpResponse'
                  },
                },
              },
            },
            '400': {
              description: 'Bad request - Invalid input',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  },
                },
              },
            },
            '409': {
              description: 'Conflict - User already exists',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  },
                },
              },
            },
          },
        },
      },
      '/auth/sign-in': {
        post: {
          tags: ['Authentication'],
          summary: 'Sign in user',
          description: 'Authenticate user with email and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SignInRequest'
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Sign in successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SignInResponse'
                  },
                },
              },
            },
            '400': {
              description: 'Bad request - Invalid input',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  },
                },
              },
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  },
                },
              },
            },
          },
        },
      },
      '/auth/sign-out': {
        post: {
          tags: ['Authentication'],
          summary: 'Sign out user',
          description: 'Sign out the current user and clear session',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Sign out successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SuccessResponse'
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  },
                },
              },
            },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get current user',
          description: 'Get information about the currently authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'User information retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/MeResponse'
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/UnauthorizedResponse'
                  },
                },
              },
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
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
          security: [{ bearerAuth: [] }],
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
                      description: 'Candidate CV (PDF or text file)',
                    },
                    'project-report': {
                      type: 'string',
                      format: 'binary',
                      description: 'Project report (PDF or text file)',
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
                    $ref: '#/components/schemas/UploadResponse'
                  },
                },
              },
            },
            '400': {
              description: 'Invalid file format or validation error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
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
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/EvaluationRequest'
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
                    $ref: '#/components/schemas/EvaluationStartResponse'
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request data',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
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
          security: [{ bearerAuth: [] }],
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
                    $ref: '#/components/schemas/JobStatusResponse'
                  },
                },
              },
            },
            '404': {
              description: 'Job not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
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
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of all jobs',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/JobsListResponse'
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  },
                },
              },
            },
          },
        },
      },
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
                    $ref: '#/components/schemas/HealthResponse'
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and session management' },
      { name: 'System', description: 'System health and status endpoints' },
      { name: 'Documents', description: 'Document upload and management' },
      { name: 'Evaluation', description: 'AI evaluation pipeline endpoints' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your session token (obtained from sign-in response). Format: Bearer <token>',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'u25ij5mqp',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
              description: 'User email address'
            },
            name: {
              type: 'string',
              example: 'John Doe',
              description: 'User full name'
            }
          },
          required: ['id', 'email', 'name']
        },
        SignUpResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'User created successfully'
            },
            user: {
              $ref: '#/components/schemas/User'
            },
            status: {
              type: 'string',
              example: 'success'
            }
          },
          required: ['message', 'user', 'status']
        },
        SignInRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
              description: 'User email address'
            },
            password: {
              type: 'string',
              example: 'password123',
              description: 'User password'
            }
          },
          required: ['email', 'password']
        },
        SignInResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Sign in successful'
            },
            user: {
              $ref: '#/components/schemas/User'
            },
            sessionToken: {
              type: 'string',
              example: 'abc123def456',
              description: 'Session token for API authentication. Use as Bearer token for protected endpoints.'
            },
            status: {
              type: 'string',
              example: 'success'
            }
          },
          required: ['message', 'user', 'sessionToken', 'status']
        },
        MeResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User'
            },
            status: {
              type: 'string',
              example: 'success'
            }
          },
          required: ['user', 'status']
        },
        UnauthorizedResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              nullable: true,
              example: null
            },
            error: {
              type: 'string',
              example: 'Not authenticated'
            },
            status: {
              type: 'string',
              example: 'error'
            }
          },
          required: ['user', 'error', 'status']
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Operation completed successfully'
            },
            status: {
              type: 'string',
              example: 'success'
            }
          },
          required: ['message', 'status']
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'healthy'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z'
            },
            environment: {
              type: 'string',
              example: 'development'
            }
          },
          required: ['status', 'timestamp', 'environment']
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Validation failed'
            },
            details: {
              oneOf: [
                { type: 'string', example: 'Additional error details' },
                {
                  type: 'object',
                  example: {
                    email: 'Email is required',
                    password: 'Password must be at least 6 characters'
                  }
                }
              ]
            },
            status: {
              type: 'string',
              example: 'error'
            }
          },
          required: ['error']
        },
        UploadResponse: {
          type: 'object',
          properties: {
            cvDocumentId: {
              type: 'string',
              example: 'abc123def456',
              description: 'Unique identifier for the uploaded CV'
            },
            projectReportId: {
              type: 'string',
              example: 'xyz789ghi012',
              description: 'Unique identifier for the uploaded project report'
            },
            message: {
              type: 'string',
              example: 'Files uploaded and processed successfully'
            }
          },
          required: ['cvDocumentId', 'projectReportId', 'message']
        },
        EvaluationRequest: {
          type: 'object',
          properties: {
            jobTitle: {
              type: 'string',
              example: 'Product Engineer (Backend)',
              description: 'The job title being applied for'
            },
            cvDocumentId: {
              type: 'string',
              example: 'abc123def456',
              description: 'CV document ID from upload response'
            },
            projectReportId: {
              type: 'string',
              example: 'xyz789ghi012',
              description: 'Project report ID from upload response'
            }
          },
          required: ['jobTitle', 'cvDocumentId', 'projectReportId']
        },
        EvaluationStartResponse: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              example: 'job_abc123',
              description: 'Unique job identifier for tracking progress'
            },
            status: {
              type: 'string',
              enum: ['queued', 'processing', 'completed', 'failed'],
              example: 'queued'
            },
            message: {
              type: 'string',
              example: 'Evaluation started. Use jobId to track progress.'
            }
          },
          required: ['jobId', 'status', 'message']
        },
        JobStatusResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'job_abc123',
              description: 'Unique job identifier'
            },
            jobTitle: {
              type: 'string',
              example: 'Product Engineer (Backend)',
              description: 'The job title being applied for'
            },
            cvDocumentId: {
              type: 'string',
              example: 'abc123def456',
              description: 'CV document ID from upload response'
            },
            projectReportId: {
              type: 'string',
              example: 'xyz789ghi012',
              description: 'Project report ID from upload response'
            },
            status: {
              type: 'string',
              enum: ['queued', 'processing', 'completed', 'failed'],
              example: 'completed',
              description: 'Current status of the evaluation job'
            },
            progress: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              example: 100,
              description: 'Progress percentage (0-100)'
            },
            result: {
              $ref: '#/components/schemas/EvaluationResult',
              description: 'Detailed evaluation results (available when status is completed)'
            },
            error: {
              type: 'string',
              example: 'Processing failed',
              description: 'Error message if status is failed'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:00:00.000Z',
              description: 'Job creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-01T00:05:00.000Z',
              description: 'Last update timestamp'
            }
          },
          required: ['id', 'jobTitle', 'cvDocumentId', 'projectReportId', 'status', 'createdAt', 'updatedAt']
        },
        JobsListResponse: {
          type: 'object',
          properties: {
            jobs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: 'job_abc123',
                    description: 'Unique job identifier'
                  },
                  jobTitle: {
                    type: 'string',
                    example: 'Product Engineer (Backend)',
                    description: 'The job title being applied for'
                  },
                  cvDocumentId: {
                    type: 'string',
                    example: 'abc123def456',
                    description: 'CV document ID from upload response'
                  },
                  projectReportId: {
                    type: 'string',
                    example: 'xyz789ghi012',
                    description: 'Project report ID from upload response'
                  },
                  status: {
                    type: 'string',
                    enum: ['queued', 'processing', 'completed', 'failed'],
                    example: 'completed',
                    description: 'Current status of the evaluation job'
                  },
                  progress: {
                    type: 'number',
                    example: 100,
                    description: 'Progress percentage (0-100)'
                  },
                  result: {
                    $ref: '#/components/schemas/EvaluationResult',
                    description: 'Detailed evaluation results (available when status is completed)'
                  },
                  error: {
                    type: 'string',
                    example: 'Processing failed',
                    description: 'Error message if status is failed'
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-01-01T00:00:00.000Z',
                    description: 'Job creation timestamp'
                  },
                  updatedAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-01-01T00:05:00.000Z',
                    description: 'Last update timestamp'
                  }
                }
              }
            }
          },
          required: ['jobs']
        },
        EvaluationResult: {
          type: 'object',
          properties: {
            cvEvaluation: {
              $ref: '#/components/schemas/CVEvaluation'
            },
            projectEvaluation: {
              $ref: '#/components/schemas/ProjectEvaluation'
            },
            overallSummary: {
              type: 'string',
              example: 'Candidate demonstrates strong technical skills with relevant experience. Project shows good problem-solving abilities.'
            },
            finalScore: {
              $ref: '#/components/schemas/FinalScore'
            }
          },
          required: ['cvEvaluation', 'projectEvaluation', 'overallSummary', 'finalScore']
        },
        CVEvaluation: {
          type: 'object',
          properties: {
            technicalSkillsMatch: {
              $ref: '#/components/schemas/ScoreDetail'
            },
            experienceLevel: {
              $ref: '#/components/schemas/ScoreDetail'
            },
            relevantAchievements: {
              $ref: '#/components/schemas/ScoreDetail'
            },
            culturalFit: {
              $ref: '#/components/schemas/ScoreDetail'
            }
          },
          required: ['technicalSkillsMatch', 'experienceLevel', 'relevantAchievements', 'culturalFit']
        },
        ProjectEvaluation: {
          type: 'object',
          properties: {
            correctness: {
              $ref: '#/components/schemas/ScoreDetail'
            },
            codeQuality: {
              $ref: '#/components/schemas/ScoreDetail'
            },
            resilience: {
              $ref: '#/components/schemas/ScoreDetail'
            },
            documentation: {
              $ref: '#/components/schemas/ScoreDetail'
            },
            creativity: {
              $ref: '#/components/schemas/ScoreDetail'
            }
          },
          required: ['correctness', 'codeQuality', 'resilience', 'documentation', 'creativity']
        },
        ScoreDetail: {
          type: 'object',
          properties: {
            score: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              example: 4
            },
            details: {
              type: 'string',
              example: 'Strong technical skills demonstrated through relevant projects and experience.'
            }
          },
          required: ['score', 'details']
        },
        FinalScore: {
          type: 'object',
          properties: {
            cvScore: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              example: 4.2
            },
            projectScore: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              example: 3.8
            },
            overallScore: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              example: 4.0
            }
          },
          required: ['cvScore', 'projectScore', 'overallScore']
        }
      }
    },
  };
}