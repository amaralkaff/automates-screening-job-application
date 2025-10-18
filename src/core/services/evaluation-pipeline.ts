import { GoogleGenAI, ApiError } from '@google/genai';
import { getOrCreateCollection } from '../../infrastructure/chroma-collection';
import { db } from '../../infrastructure/database';
import type { EvaluationResult, CVEvaluation, ProjectEvaluation } from '../../shared/types';

interface LLMResponse {
  response: string;
  success: boolean;
  error?: string;
}

export class EvaluationPipeline {
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  private async callLLM(
    prompt: string,
    maxRetries = 3,
    temperature = 0.3
  ): Promise<LLMResponse> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
  
        const result = await this.genAI.models.generateContent({
          model: 'gemini-2.0-flash-001',
          contents: prompt,
          config: {
            temperature,
            maxOutputTokens: 2000,
          },
        });

        const response = result.text;

        if (!response || response.trim().length === 0) {
          throw new Error('Empty response from LLM');
        }

          return { response: response.trim(), success: true };
      } catch (error) {
        console.error(`LLM call attempt ${attempt} failed:`, error);

        // Handle specific API errors
        if (error instanceof ApiError) {
          console.error(`API Error - Status: ${error.status}, Message: ${error.message}`);

          // Don't retry for certain error types
          if (error.status === 400 || error.status === 403) {
            return {
              response: '',
              success: false,
              error: `API Error: ${error.message}`
            };
          }
        }

        if (attempt === maxRetries) {
          return {
            response: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }

        // Exponential backoff with jitter
        const baseDelay = 2 ** attempt * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

          await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { response: '', success: false, error: 'Max retries exceeded' };
  }

  private async retrieveRelevantContext(
    documentId: string,
    query: string,
    documentType: string,
    nResults = 5
  ): Promise<string> {
    try {
      const collection = await getOrCreateCollection('documents');
      const results = await collection.query({
        queryTexts: [`${documentType} ${query}`],
        where: { documentId },
        nResults,
      });

      if (results.documents?.[0] && results.documents[0].length > 0) {
        return results.documents[0].join('\n\n');
      }

      // Fallback to reference documents
      const refCollection = await getOrCreateCollection('reference_documents');
      const refResults = await refCollection.query({
        queryTexts: [query],
        where: { documentType },
        nResults,
      });

      if (refResults.documents?.[0]) {
        return refResults.documents[0].join('\n\n');
      }

      return '';
    } catch (error) {
      console.error('Error retrieving context from ChromaDB:', error);
      console.log('💡 Using fallback context without vector database');

      // Provide fallback context based on document type
      if (documentType === 'cv') {
        return 'CV content available for analysis';
      }if (documentType === 'project_report') {
        return 'Project report content available for analysis';
      }if (documentType === 'job_description') {
        return `
          JOB REQUIREMENTS: Product Engineer (Backend)
          - Building new product features using Agile methodology
          - Writing clean, efficient code for product codebase
          - Designing and fine-tuning AI prompts
          - Building LLM chaining flows and RAG systems
          - Handling async background workers and job orchestration
          - Implementing safeguards for 3rd party API failures
          - Experience with backend development, databases, APIs
        `;
      }if (documentType === 'scoring_rubric') {
        return `
          EVALUATION CRITERIA:
          Technical Skills: 1-5 scale, assess coding ability, tech stack knowledge
          Experience Level: 1-5 scale, assess relevant industry experience
          Achievements: 1-5 scale, assess notable accomplishments and impact
          Quality: 1-5 scale, assess code quality, best practices, documentation
          Correctness: 1-5 scale, assess implementation accuracy and bug-free code
        `;
      }

      return 'Content available for evaluation';
    }
  }

  private async evaluateCV(
    cvDocumentId: string,
    jobTitle: string
  ): Promise<CVEvaluation> {
  
    // Retrieve relevant context
    const cvContext = await this.retrieveRelevantContext(
      cvDocumentId,
      'skills experience achievements projects',
      'cv'
    );

    const jobContext = await this.retrieveRelevantContext(
      '',
      'backend developer requirements skills experience',
      'job_description'
    );

    const scoringContext = await this.retrieveRelevantContext(
      '',
      'CV evaluation scoring rubric technical skills experience',
      'scoring_rubric'
    );

    const prompt = `
      You are an expert technical recruiter evaluating a candidate's CV for a ${jobTitle} position.

      CANDIDATE CV CONTENT:
      ${cvContext}

      JOB REQUIREMENTS:
      ${jobContext}

      EVALUATION CRITERIA:
      ${scoringContext}

      Please evaluate the CV on a scale of 1-5 for each parameter and provide detailed reasoning.
      Return your response in this exact JSON format:

      {
        "technicalSkillsMatch": {
          "score": <number 1-5>,
          "details": "<detailed explanation of the score>"
        },
        "experienceLevel": {
          "score": <number 1-5>,
          "details": "<detailed explanation of the score>"
        },
        "relevantAchievements": {
          "score": <number 1-5>,
          "details": "<detailed explanation of the score>"
        },
        "culturalFit": {
          "score": <number 1-5>,
          "details": "<detailed explanation of the score>"
        }
      }

      Be objective and base your evaluation strictly on the provided information.
      Do not make assumptions beyond what's stated in the CV.
      Ensure your response is valid JSON.
    `;

    const llmResponse = await this.callLLM(prompt, 3, 0.2);

    if (!llmResponse.success) {
      throw new Error(`CV evaluation failed: ${llmResponse.error}`);
    }

    try {
      // Strip markdown code blocks if present
      let jsonString = llmResponse.response.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const evaluation = JSON.parse(jsonString);

      // Validate and ensure all fields exist
      return {
        technicalSkillsMatch: {
          score: Math.max(1, Math.min(5, evaluation.technicalSkillsMatch?.score || 3)),
          details: evaluation.technicalSkillsMatch?.details || 'No details provided'
        },
        experienceLevel: {
          score: Math.max(1, Math.min(5, evaluation.experienceLevel?.score || 3)),
          details: evaluation.experienceLevel?.details || 'No details provided'
        },
        relevantAchievements: {
          score: Math.max(1, Math.min(5, evaluation.relevantAchievements?.score || 3)),
          details: evaluation.relevantAchievements?.details || 'No details provided'
        },
        culturalFit: {
          score: Math.max(1, Math.min(5, evaluation.culturalFit?.score || 3)),
          details: evaluation.culturalFit?.details || 'No details provided'
        }
      };
    } catch (error) {
      console.error('Error parsing CV evaluation response:', error);
      console.error('Raw response:', llmResponse.response);

      // Return default evaluation on parsing error
      return {
        technicalSkillsMatch: { score: 3, details: 'Evaluation parsing failed' },
        experienceLevel: { score: 3, details: 'Evaluation parsing failed' },
        relevantAchievements: { score: 3, details: 'Evaluation parsing failed' },
        culturalFit: { score: 3, details: 'Evaluation parsing failed' }
      };
    }
  }

  private async evaluateProjectReport(
    projectReportId: string
  ): Promise<ProjectEvaluation> {
  
    // Retrieve relevant context
    const projectContext = await this.retrieveRelevantContext(
      projectReportId,
      'implementation design architecture code',
      'project_report'
    );

    const caseStudyContext = await this.retrieveRelevantContext(
      '',
      'case study requirements objectives deliverables',
      'case_study'
    );

    const scoringContext = await this.retrieveRelevantContext(
      '',
      'project evaluation scoring rubric correctness quality',
      'scoring_rubric'
    );

    const prompt = `
      You are an expert software engineer evaluating a backend developer's project report for a case study.

      PROJECT REPORT CONTENT:
      ${projectContext}

      CASE STUDY REQUIREMENTS:
      ${caseStudyContext}

      EVALUATION CRITERIA:
      ${scoringContext}

      Please evaluate the project on a scale of 1-5 for each parameter and provide detailed reasoning.
      Return your response in this exact JSON format:

      {
        "correctness": {
          "score": <number 1-5>,
          "details": "<detailed explanation of the score>"
        },
        "codeQuality": {
          "score": <number 1-5>,
          "details": "<detailed explanation of the score>"
        },
        "resilience": {
          "score": <number 1-5>,
          "details": "<detailed explanation of the score>"
        },
        "documentation": {
          "score": <number 1-5>,
          "details": "<detailed explanation of the score>"
        },
        "creativity": {
          "score": <number 1-5>,
          "details": "<detailed explanation of the score>"
        }
      }

      Be objective and base your evaluation strictly on the provided information.
      Focus on technical implementation, architecture decisions, and problem-solving approach.
      Ensure your response is valid JSON.
    `;

    const llmResponse = await this.callLLM(prompt, 3, 0.2);

    if (!llmResponse.success) {
      throw new Error(`Project evaluation failed: ${llmResponse.error}`);
    }

    try {
      // Strip markdown code blocks if present
      let jsonString = llmResponse.response.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const evaluation = JSON.parse(jsonString);

      // Validate and ensure all fields exist
      return {
        correctness: {
          score: Math.max(1, Math.min(5, evaluation.correctness?.score || 3)),
          details: evaluation.correctness?.details || 'No details provided'
        },
        codeQuality: {
          score: Math.max(1, Math.min(5, evaluation.codeQuality?.score || 3)),
          details: evaluation.codeQuality?.details || 'No details provided'
        },
        resilience: {
          score: Math.max(1, Math.min(5, evaluation.resilience?.score || 3)),
          details: evaluation.resilience?.details || 'No details provided'
        },
        documentation: {
          score: Math.max(1, Math.min(5, evaluation.documentation?.score || 3)),
          details: evaluation.documentation?.details || 'No details provided'
        },
        creativity: {
          score: Math.max(1, Math.min(5, evaluation.creativity?.score || 3)),
          details: evaluation.creativity?.details || 'No details provided'
        }
      };
    } catch (error) {
      console.error('Error parsing project evaluation response:', error);
      console.error('Raw response:', llmResponse.response);

      // Return default evaluation on parsing error
      return {
        correctness: { score: 3, details: 'Evaluation parsing failed' },
        codeQuality: { score: 3, details: 'Evaluation parsing failed' },
        resilience: { score: 3, details: 'Evaluation parsing failed' },
        documentation: { score: 3, details: 'Evaluation parsing failed' },
        creativity: { score: 3, details: 'Evaluation parsing failed' }
      };
    }
  }

  private async generateFinalSummary(
    cvEvaluation: CVEvaluation,
    projectEvaluation: ProjectEvaluation
  ): Promise<string> {
    const prompt = `
      You are summarizing the evaluation of a backend developer candidate.

      CV EVALUATION RESULTS:
      - Technical Skills: ${cvEvaluation.technicalSkillsMatch.score}/5 - ${cvEvaluation.technicalSkillsMatch.details}
      - Experience Level: ${cvEvaluation.experienceLevel.score}/5 - ${cvEvaluation.experienceLevel.details}
      - Relevant Achievements: ${cvEvaluation.relevantAchievements.score}/5 - ${cvEvaluation.relevantAchievements.details}
      - Cultural Fit: ${cvEvaluation.culturalFit.score}/5 - ${cvEvaluation.culturalFit.details}

      PROJECT EVALUATION RESULTS:
      - Correctness: ${projectEvaluation.correctness.score}/5 - ${projectEvaluation.correctness.details}
      - Code Quality: ${projectEvaluation.codeQuality.score}/5 - ${projectEvaluation.codeQuality.details}
      - Resilience: ${projectEvaluation.resilience.score}/5 - ${projectEvaluation.resilience.details}
      - Documentation: ${projectEvaluation.documentation.score}/5 - ${projectEvaluation.documentation.details}
      - Creativity: ${projectEvaluation.creativity.score}/5 - ${projectEvaluation.creativity.details}

      Please provide a concise overall summary (3-5 sentences) highlighting:
      1. Key strengths of the candidate
      2. Areas for improvement or concerns
      3. Overall recommendation

      Be specific and constructive in your feedback.
    `;

    const llmResponse = await this.callLLM(prompt, 2, 0.4);

    if (!llmResponse.success) {
      return 'Failed to generate summary due to technical issues.';
    }

    return llmResponse.response;
  }

  private calculateWeightedScore(
    evaluation: CVEvaluation | ProjectEvaluation,
    weights: Record<string, number>
  ): number {
    const scores = Object.entries(evaluation).map(([key, value]) => {
      const weight = weights[key] || 0;
      return value.score * weight;
    });

    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    return totalWeight > 0 ? scores.reduce((sum, score) => sum + score, 0) / totalWeight : 0;
  }

  async processEvaluation(
    jobId: string,
    jobTitle: string,
    cvDocumentId: string,
    projectReportId: string
  ): Promise<EvaluationResult> {
    try {
  
      // Update job status to processing
      await db.updateJobStatus(jobId, 'processing', 10);

      // Step 1: Evaluate CV (30% of total time)
      await db.updateJobStatus(jobId, 'processing', 20);
      const cvEvaluation = await this.evaluateCV(cvDocumentId, jobTitle);

      await db.updateJobStatus(jobId, 'processing', 50, {
        cvEvaluation,
        projectEvaluation: {} as ProjectEvaluation,
        overallSummary: '',
        finalScore: {
          cvScore: 0,
          projectScore: 0,
          overallScore: 0
        }
      });

      // Step 2: Evaluate Project Report (40% of total time)
      await db.updateJobStatus(jobId, 'processing', 60);
      const projectEvaluation = await this.evaluateProjectReport(projectReportId);

      // Step 3: Calculate scores
      const cvWeights = {
        technicalSkillsMatch: 0.4,
        experienceLevel: 0.25,
        relevantAchievements: 0.2,
        culturalFit: 0.15
      };

      const projectWeights = {
        correctness: 0.3,
        codeQuality: 0.25,
        resilience: 0.2,
        documentation: 0.15,
        creativity: 0.1
      };

      const cvScore = this.calculateWeightedScore(cvEvaluation, cvWeights);
      const projectScore = this.calculateWeightedScore(projectEvaluation, projectWeights);
      const overallScore = (cvScore + projectScore) / 2;

      // Step 4: Generate final summary
      await db.updateJobStatus(jobId, 'processing', 80);
      const overallSummary = await this.generateFinalSummary(cvEvaluation, projectEvaluation);

      // Step 5: Complete evaluation
      const result: EvaluationResult = {
        cvEvaluation,
        projectEvaluation,
        overallSummary,
        finalScore: {
          cvScore: Math.round(cvScore * 100) / 100,
          projectScore: Math.round(projectScore * 100) / 100,
          overallScore: Math.round(overallScore * 100) / 100
        }
      };

      await db.updateJobStatus(jobId, 'completed', 100, result);

      // Return the result for Bull queue
      return result;

    } catch (error) {
      console.error(`Evaluation failed for job ${jobId}:`, error);
      await db.updateJobStatus(jobId, 'failed', 0, undefined, error instanceof Error ? error.message : 'Unknown error');

      // Re-throw error for direct evaluation handling
      throw error;
    }
  }
}