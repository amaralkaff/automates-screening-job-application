import 'pdf-parse/worker';
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import { getOrCreateCollection } from '../../infrastructure/chroma-collection';
import type { DocumentMetadata } from '../../shared/types';

export class DocumentProcessor {
  private async extractTextFromFile(filePath: string): Promise<string> {
    try {
      const fileBuffer = await readFile(filePath);

      // Check if it's a text file by extension
      if (filePath.endsWith('.txt')) {
        const textContent = fileBuffer.toString('utf8');
        return this.sanitizeText(textContent);
      }

      // For PDF files, check if it's a real PDF or text renamed as PDF
      const header = fileBuffer.slice(0, 4).toString();

      // Check if it's a real PDF file (starts with %PDF)
      if (header === '%PDF') {
        // Real PDF file - parse text content using pdf-parse v2
        try {
          const parser = new PDFParse({ data: fileBuffer });
          const result = await parser.getText();
          await parser.destroy();
          return this.sanitizeText(result.text);
        } catch (error) {
          console.error('Error parsing PDF:', error);
          return `PDF document detected but parsing failed. File size: ${fileBuffer.length} bytes.`;
        }
      } else {
        // Text file renamed as PDF - treat as text
        try {
          const textContent = fileBuffer.toString('utf8');
          const cleanText = textContent
            .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .trim();

          if (cleanText.length > 50) {
            return this.sanitizeText(cleanText);
          }
            return `PDF document processed. File size: ${fileBuffer.length} bytes`;
        } catch (_error) {
          // If UTF-8 conversion fails, treat as binary PDF
          return `PDF document processed successfully. File size: ${fileBuffer.length} bytes`;
        }
      }
    } catch (error) {
      console.error('Error extracting text from file:', error);
      throw new Error('Failed to extract text from file');
    }
  }

  private sanitizeText(text: string): string {
    return text
      // Remove problematic Unicode characters that cause JSON parsing issues
      .replace(/[\uD800-\uDBFF]$/, '') // Remove lone leading surrogates at end of string
      .replace(/[\uDC00-\uDFFF]^/, '') // Remove lone trailing surrogates at start of string
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control characters except tab, newline, carriage return
      .replace(/[\uFFFE\uFFFF]/g, '') // Invalid Unicode characters
      // Replace any remaining problematic characters with spaces
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '') // Lone high surrogates
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '') // Lone low surrogates
      .normalize('NFC') // Normalize Unicode to canonical form
      .trim();
  }

  private chunkText(text: string, chunkSize = 800, overlap = 200): string[] {
    // Sanitize text first to prevent ChromaDB JSON encoding issues
    const cleanText = this.sanitizeText(text);

    const chunks: string[] = [];
    let start = 0;

    while (start < cleanText.length) {
      let end = start + chunkSize;

      if (end >= cleanText.length) {
        chunks.push(this.sanitizeText(cleanText.slice(start)));
        break;
      }

      // Try to break at a sentence or paragraph
      const lastPeriod = cleanText.lastIndexOf('.', end);
      const lastNewline = cleanText.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start) {
        end = breakPoint + 1;
      }

      chunks.push(this.sanitizeText(cleanText.slice(start, end).trim()));
      start = Math.max(start + 1, end - overlap);
    }

    return chunks.filter(chunk => chunk.length > 50);
  }

  async processDocument(
    filePath: string,
    documentId: string,
    documentType: DocumentMetadata['type']
  ): Promise<void> {
    try {

      // Extract text from file
      const text = await this.extractTextFromFile(filePath);

      if (!text.trim()) {
        throw new Error('No text extracted from file');
      }

      // Chunk the text for better embedding
      const chunks = this.chunkText(text);

      // Get or create collection
      const collection = await getOrCreateCollection('documents');

      // Prepare documents for ChromaDB
      const documents = chunks.map((chunk, index) =>
        `${documentType.toUpperCase()} CHUNK ${index + 1}:\n${chunk}`
      );

      const metadatas = chunks.map((_chunk, index) => ({
        documentId,
        documentType,
        chunkIndex: index,
        totalChunks: chunks.length,
        processedAt: new Date().toISOString(),
      }));

      const ids = chunks.map((_, index) => `${documentId}-chunk-${index}`);

      // Gemini API batch size limit (maximum 100 requests per batch)
      const BATCH_SIZE = 100;

      // Process in batches to avoid Gemini API batch size limits
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const endIndex = Math.min(i + BATCH_SIZE, chunks.length);

        const batchDocuments = documents.slice(i, endIndex);
        const batchMetadatas = metadatas.slice(i, endIndex);
        const batchIds = ids.slice(i, endIndex);

        await collection.add({
          documents: batchDocuments,
          metadatas: batchMetadatas,
          ids: batchIds,
        });

        console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} for document ${documentId}`);
      }

      } catch (error) {
      console.error(`Error processing document ${documentId}:`, error);
      throw error;
    }
  }

  async ingestReferenceDocuments(): Promise<void> {
    try {
      const collection = await getOrCreateCollection('reference_documents');

      // Job Description for Product Engineer (Backend)
      const jobDescription = `
        JOB DESCRIPTION: Product Engineer (Backend) 2025

        We're looking for dedicated engineers who write code they're proud of and who are eager to keep scaling and improving complex systems, including those powered by AI.

        KEY RESPONSIBILITIES:
        - Building new product features alongside frontend engineers and product managers using Agile methodology
        - Addressing issues to ensure apps are robust and codebase is clean
        - Writing clean, efficient code to enhance product's codebase
        - Designing and fine-tuning AI prompts that align with product requirements
        - Building LLM chaining flows where output from one model is passed to another
        - Implementing Retrieval-Augmented Generation (RAG) with vector databases
        - Handling long-running AI processes with job orchestration and async background workers
        - Designing safeguards for managing failures from 3rd party APIs
        - Leveraging AI tools for team productivity
        - Writing reusable, testable, and efficient code
        - Strengthening test coverage
        - Conducting full product lifecycles from idea to maintenance

        REQUIRED SKILLS:
        - Backend languages and frameworks (Node.js, Django, Rails)
        - Database management (MySQL, PostgreSQL, MongoDB)
        - RESTful APIs
        - Security compliance
        - Cloud technologies (AWS, Google Cloud, Azure)
        - Understanding of frontend technologies
        - User authentication and authorization
        - Scalable application design principles
        - Creating database schemas
        - Implementing automated testing platforms
        - Familiarity with LLM APIs, embeddings, vector databases and prompt design
      `;

      // Case Study Brief
      const caseStudyBrief = `
        CASE STUDY BRIEF: Backend Developer Evaluation System

        OBJECTIVE:
        Build a backend service that automates the initial screening of a job application. The service will receive a candidate's CV and a project report, evaluate them against a specific job description and case study brief, and produce a structured, AI-generated evaluation report.

        CORE REQUIREMENTS:
        1. Backend Service with RESTful API endpoints
        2. File upload handling for CV and Project Report (PDF)
        3. Asynchronous AI evaluation pipeline
        4. RAG (Context Retrieval) implementation
        5. LLM chaining for CV and Project evaluation
        6. Job queue system for long-running processes
        7. Error handling and resilience mechanisms
        8. Standardized scoring parameters

        TECHNICAL EVALUATION CRITERIA:
        - Correctness (meets requirements: prompt design, chaining, RAG, error handling)
        - Code Quality (clean, modular, testable)
        - Resilience (handles failures, retries)
        - Documentation (clear README, explanation of trade-offs)
        - Creativity / Bonus (optional improvements)
      `;

      // CV Scoring Rubric
      const cvScoringRubric = `
        CV MATCH EVALUATION RUBRIC (1-5 scale)

        1. TECHNICAL SKILLS MATCH (Weight: 40%)
        - Alignment with job requirements (backend, databases, APIs, cloud, AI/LLM)
        - 1 = Irrelevant skills
        - 2 = Few overlaps
        - 3 = Partial match
        - 4 = Strong match
        - 5 = Excellent match + AI/LLM exposure

        2. EXPERIENCE LEVEL (Weight: 25%)
        - Years of experience and project complexity
        - 1 = <1 yr / trivial projects
        - 2 = 1-2 yrs
        - 3 = 2-3 yrs with mid-scale projects
        - 4 = 3-4 yrs solid track record
        - 5 = 5+ yrs / high-impact projects

        3. RELEVANT ACHIEVEMENTS (Weight: 20%)
        - Impact of past work (scaling, performance, adoption)
        - 1 = No clear achievements
        - 2 = Minimal improvements
        - 3 = Some measurable outcomes
        - 4 = Significant contributions
        - 5 = Major measurable impact

        4. CULTURAL / COLLABORATION FIT (Weight: 15%)
        - Communication, learning mindset, teamwork/leadership
        - 1 = Not demonstrated
        - 2 = Minimal
        - 3 = Average
        - 4 = Good
        - 5 = Excellent and well-demonstrated
      `;

      // Project Scoring Rubric
      const projectScoringRubric = `
        PROJECT DELIVERABLE EVALUATION RUBRIC (1-5 scale)

        1. CORRECTNESS - PROMPT & CHAINING (Weight: 30%)
        - Implements prompt design, LLM chaining, RAG context injection
        - 1 = Not implemented
        - 2 = Minimal attempt
        - 3 = Works partially
        - 4 = Works correctly
        - 5 = Fully correct + thoughtful

        2. CODE QUALITY & STRUCTURE (Weight: 25%)
        - Clean, modular, reusable, tested
        - 1 = Poor
        - 2 = Some structure
        - 3 = Decent modularity
        - 4 = Good structure + some tests
        - 5 = Excellent quality + strong tests

        3. RESILIENCE & ERROR HANDLING (Weight: 20%)
        - Handles long jobs, retries, randomness, API failures
        - 1 = Missing
        - 2 = Minimal
        - 3 = Partial handling
        - 4 = Solid handling
        - 5 = Robust, production-ready

        4. DOCUMENTATION & EXPLANATION (Weight: 15%)
        - README clarity, setup instructions, trade-off explanations
        - 1 = Missing
        - 2 = Minimal
        - 3 = Adequate
        - 4 = Clear
        - 5 = Excellent + insightful

        5. CREATIVITY / BONUS (Weight: 10%)
        - Extra features beyond requirements
        - 1 = None
        - 2 = Very basic
        - 3 = Useful extras
        - 4 = Strong enhancements
        - 5 = Outstanding creativity
      `;

      const referenceDocs = [
        { text: jobDescription, type: 'job_description' },
        { text: caseStudyBrief, type: 'case_study' },
        { text: cvScoringRubric, type: 'scoring_rubric' },
        { text: projectScoringRubric, type: 'scoring_rubric' },
      ];

      const BATCH_SIZE = 100;

      for (const doc of referenceDocs) {
        const chunks = this.chunkText(doc.text);
        const documents = chunks.map((chunk, index) =>
          `${doc.type.toUpperCase()} CHUNK ${index + 1}:\n${chunk}`
        );

        const metadatas = chunks.map((_, index) => ({
          documentType: doc.type,
          chunkIndex: index,
          totalChunks: chunks.length,
          processedAt: new Date().toISOString(),
        }));

        const ids = chunks.map((_, index) => `ref-${doc.type}-chunk-${index}`);

        // Process in batches to avoid Gemini API batch size limits
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const endIndex = Math.min(i + BATCH_SIZE, chunks.length);

          const batchDocuments = documents.slice(i, endIndex);
          const batchMetadatas = metadatas.slice(i, endIndex);
          const batchIds = ids.slice(i, endIndex);

          await collection.add({
            documents: batchDocuments,
            metadatas: batchMetadatas,
            ids: batchIds,
          });

          console.log(`Processed reference batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} for ${doc.type}`);
        }
      }

      } catch (error) {
      console.error('Error ingesting reference documents:', error);
      throw error;
    }
  }
}