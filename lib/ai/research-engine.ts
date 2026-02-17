/**
 * Research Engine
 *
 * Multi-step deep research orchestrator with parallel sub-agents.
 * Implements: plan → fan out → collect → gap check → synthesize pipeline.
 */

import { AIClient, ChatMessage } from "./types";
import { SearchProvider } from "./search-provider";
import { readUrlDirect } from "./web-tools";
import {
  ResearchCallbacks,
  ResearchConfig,
  ResearchFinding,
  ResearchProgress,
  ResearchResult,
  ResearchSource,
  ResearchSubQuestion,
  DEFAULT_RESEARCH_CONFIG,
} from "@/types/research";

// ============================================
// AI PROMPTS
// ============================================

const RESEARCH_PLANNER_PROMPT = `You are a research planner. Given a research question, break it into 3-5 focused sub-questions that together would comprehensively answer the main question.

For each sub-question, also provide 1-2 specific search queries optimized for finding relevant information.

Respond with ONLY valid JSON in this exact format:
{
  "subQuestions": [
    {
      "question": "The sub-question to investigate",
      "searchQueries": ["search query 1", "search query 2"]
    }
  ]
}

Rules:
- Each sub-question should cover a distinct aspect
- Search queries should be specific and likely to return high-quality results
- Aim for 3-5 sub-questions depending on complexity
- Sub-questions should be answerable through web research`;

const SUB_AGENT_ANALYZER_PROMPT = `You are a research analyst. Given a sub-question and source content, extract the most relevant findings.

Respond with ONLY valid JSON in this exact format:
{
  "findings": [
    {
      "content": "A specific finding or fact relevant to the question",
      "confidence": "high|medium|low",
      "sourceUrl": "URL where this was found (if available)"
    }
  ]
}

Rules:
- Extract 2-5 key findings per source
- Be specific — include numbers, dates, names when available
- Rate confidence based on source quality and specificity
- Prefer recent and authoritative information`;

const RESEARCH_GAP_CHECKER_PROMPT = `You are a research quality reviewer. Given a research question and the findings collected so far, determine if the research is sufficient or if follow-up questions are needed.

Respond with ONLY valid JSON in this exact format:
{
  "shouldContinue": true|false,
  "reasoning": "Brief explanation of your assessment",
  "followUpQuestions": [
    {
      "question": "A follow-up question to fill a gap",
      "searchQueries": ["search query"]
    }
  ]
}

Rules:
- Set shouldContinue to false if findings adequately cover the topic
- Only suggest follow-up if there are clear, important gaps
- Limit follow-up questions to 1-3
- Don't suggest follow-ups that duplicate existing findings`;

const RESEARCH_SYNTHESIZER_PROMPT = `You are a research synthesizer. Given a research question, sub-questions, and all findings with sources, produce two outputs:

1. A SUMMARY (2-3 paragraphs for chat display)
2. A full REPORT in markdown (comprehensive, with citations)

Respond with ONLY valid JSON in this exact format:
{
  "summary": "2-3 paragraph summary of key findings",
  "report": "Full markdown report with sections, citations, and analysis"
}

Report structure:
- Start with a heading: # Research Report: [Topic]
- ## Summary section (2-3 paragraphs)
- ## sections for each major area investigated
- ## Analysis section (cross-cutting themes, contradictions, nuances)
- ## Sources section (numbered list with titles and URLs)
- End with metadata line: *Researched on [date]*

Rules:
- Cite sources inline using [Source N] format
- Be factual and balanced — note disagreements between sources
- The summary should stand alone as a useful answer
- The report should be thorough and well-organized`;

// ============================================
// HELPERS
// ============================================

function generateId(): string {
  return `rq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createProgress(
  overrides: Partial<ResearchProgress>
): ResearchProgress {
  return {
    phase: "planning",
    subQuestions: [],
    sources: [],
    findings: [],
    currentRound: 1,
    activeAgents: 0,
    startedAt: Date.now(),
    elapsedMs: 0,
    ...overrides,
  };
}

function updateElapsed(progress: ResearchProgress): ResearchProgress {
  return { ...progress, elapsedMs: Date.now() - progress.startedAt };
}

function parseJsonResponse(content: string): unknown {
  // Try to extract JSON from the response (handles markdown code blocks)
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1].trim() : content.trim();
  return JSON.parse(raw);
}

// ============================================
// SUB-AGENT
// ============================================

interface SubAgentCallbacks {
  onUpdate: (update: { status: string; sources?: ResearchSource[] }) => void;
  isCancelled: () => boolean;
}

interface SubAgentResult {
  subQuestion: ResearchSubQuestion;
  findings: ResearchFinding[];
  sources: ResearchSource[];
}

async function runSubAgent(
  subQuestion: ResearchSubQuestion,
  aiClient: AIClient,
  searchProvider: SearchProvider,
  callbacks: SubAgentCallbacks,
  maxSourcesPerAgent: number
): Promise<SubAgentResult> {
  const findings: ResearchFinding[] = [];
  const allSources: ResearchSource[] = [];

  // 1. SEARCH — run all search queries
  callbacks.onUpdate({ status: "Searching..." });

  const perplexityAnswers: string[] = [];

  for (const query of subQuestion.searchQueries) {
    if (callbacks.isCancelled()) break;

    try {
      const result = await searchProvider.search(query);

      // Collect sources
      for (const source of result.sources) {
        if (!allSources.some((s) => s.url === source.url)) {
          allSources.push({
            title: source.title,
            url: source.url,
            snippet: source.snippet,
            isRead: false,
            subQuestionId: subQuestion.id,
          });
        }
      }

      // If Perplexity, we get synthesized answers directly
      if (result.answer) {
        perplexityAnswers.push(result.answer);
      }
    } catch (error) {
      console.error(
        `Search failed for query "${query}":`,
        error instanceof Error ? error.message : error
      );
    }
  }

  callbacks.onUpdate({ status: `Found ${allSources.length} sources`, sources: allSources });

  // 2. READ top sources
  const topSources = allSources.slice(0, maxSourcesPerAgent);
  let readCount = 0;

  for (const source of topSources) {
    if (callbacks.isCancelled()) break;

    callbacks.onUpdate({
      status: `Reading ${readCount + 1}/${topSources.length}: ${source.title.slice(0, 40)}...`,
    });

    try {
      const { title, content } = await readUrlDirect(source.url);
      source.fullContent = content;
      source.title = title || source.title;
      source.isRead = true;
      readCount++;
    } catch (error) {
      console.error(
        `Failed to read ${source.url}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // 3. ANALYZE — extract findings
  if (callbacks.isCancelled()) {
    return { subQuestion, findings, sources: allSources };
  }

  callbacks.onUpdate({ status: "Analyzing..." });

  // If Perplexity provided synthesized answers, use those directly as findings
  if (perplexityAnswers.length > 0) {
    for (const answer of perplexityAnswers) {
      findings.push({
        content: answer,
        subQuestionId: subQuestion.id,
        confidence: "high",
      });
    }
  }

  // Also analyze any read content for additional findings
  const readSources = topSources.filter((s) => s.isRead && s.fullContent);
  if (readSources.length > 0) {
    try {
      const sourceContext = readSources
        .map(
          (s, i) =>
            `Source ${i + 1} (${s.url}):\n${s.fullContent!.slice(0, 2000)}`
        )
        .join("\n\n---\n\n");

      const messages: ChatMessage[] = [
        { role: "system", content: SUB_AGENT_ANALYZER_PROMPT },
        {
          role: "user",
          content: `Sub-question: ${subQuestion.question}\n\nSource content:\n${sourceContext}`,
        },
      ];

      const response = await aiClient.chat(messages);
      const parsed = parseJsonResponse(response.content) as {
        findings: Array<{
          content: string;
          confidence: string;
          sourceUrl?: string;
        }>;
      };

      if (parsed.findings) {
        for (const f of parsed.findings) {
          findings.push({
            content: f.content,
            sourceUrl: f.sourceUrl,
            subQuestionId: subQuestion.id,
            confidence: (f.confidence as "high" | "medium" | "low") || "medium",
          });
        }
      }
    } catch (error) {
      console.error(
        "Analysis failed:",
        error instanceof Error ? error.message : error
      );
      // Fall back to using raw source content as findings
      for (const source of readSources) {
        findings.push({
          content: source.fullContent!.slice(0, 500),
          sourceUrl: source.url,
          subQuestionId: subQuestion.id,
          confidence: "low",
        });
      }
    }
  }

  return { subQuestion, findings, sources: allSources };
}

// ============================================
// ORCHESTRATOR
// ============================================

export async function runResearch(
  question: string,
  context: string,
  aiClient: AIClient,
  searchProvider: SearchProvider,
  callbacks: ResearchCallbacks,
  config: ResearchConfig = DEFAULT_RESEARCH_CONFIG
): Promise<ResearchResult> {
  const startedAt = Date.now();
  let totalSearches = 0;
  let totalUrlsRead = 0;
  const allFindings: ResearchFinding[] = [];
  const allSources: ResearchSource[] = [];
  const allSubQuestions: ResearchSubQuestion[] = [];

  let progress = createProgress({ startedAt });
  const emit = (update: Partial<ResearchProgress>) => {
    progress = updateElapsed({ ...progress, ...update });
    callbacks.onProgress(progress);
  };

  try {
    // --- PHASE 1: PLANNING ---
    emit({ phase: "planning", phaseDetail: "Breaking down the question..." });

    if (callbacks.isCancelled()) throw new CancelledError();

    const planMessages: ChatMessage[] = [
      { role: "system", content: RESEARCH_PLANNER_PROMPT },
      {
        role: "user",
        content: context
          ? `Research question: ${question}\n\nAdditional context: ${context}`
          : `Research question: ${question}`,
      },
    ];

    const planResponse = await aiClient.chat(planMessages);
    const plan = parseJsonResponse(planResponse.content) as {
      subQuestions: Array<{ question: string; searchQueries: string[] }>;
    };

    if (!plan.subQuestions?.length) {
      throw new Error("Failed to generate research plan");
    }

    // Create sub-question objects
    const subQuestions: ResearchSubQuestion[] = plan.subQuestions
      .slice(0, config.maxSubAgents)
      .map((sq) => ({
        id: generateId(),
        question: sq.question,
        status: "pending" as const,
        searchQueries: sq.searchQueries,
        findings: [],
        sources: [],
      }));

    allSubQuestions.push(...subQuestions);
    emit({
      phase: "searching",
      subQuestions: [...allSubQuestions],
      activeAgents: subQuestions.length,
      phaseDetail: `Spawning ${subQuestions.length} research agents...`,
    });

    // --- PHASE 2: FAN OUT SUB-AGENTS ---
    let currentRound = 1;
    let questionsToInvestigate = subQuestions;

    while (currentRound <= config.maxRounds && questionsToInvestigate.length > 0) {
      if (callbacks.isCancelled()) throw new CancelledError();

      emit({
        currentRound,
        activeAgents: questionsToInvestigate.length,
        phase: "searching",
        phaseDetail:
          currentRound > 1
            ? `Round ${currentRound}: Investigating follow-up questions...`
            : undefined,
      });

      // Mark all as in-progress
      for (const sq of questionsToInvestigate) {
        sq.status = "in-progress";
      }
      emit({ subQuestions: [...allSubQuestions] });

      // Run sub-agents in parallel
      const results = await Promise.allSettled(
        questionsToInvestigate.map((sq) =>
          runSubAgent(
            sq,
            aiClient,
            searchProvider,
            {
              onUpdate: (update) => {
                sq.agentStatus = update.status;
                if (update.sources) {
                  sq.sources = update.sources;
                }
                emit({ subQuestions: [...allSubQuestions] });
              },
              isCancelled: callbacks.isCancelled,
            },
            config.maxSourcesPerAgent
          )
        )
      );

      // Collect results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const sq = questionsToInvestigate[i];

        if (result.status === "fulfilled") {
          sq.status = "answered";
          sq.findings = result.value.findings.map((f) => f.content);
          sq.sources = result.value.sources;

          allFindings.push(...result.value.findings);
          for (const source of result.value.sources) {
            if (!allSources.some((s) => s.url === source.url)) {
              allSources.push(source);
            }
          }

          totalSearches += sq.searchQueries.length;
          totalUrlsRead += result.value.sources.filter((s) => s.isRead).length;
        } else {
          sq.status = "error";
          sq.agentStatus = `Error: ${result.reason?.message || "Unknown"}`;
        }
      }

      emit({
        subQuestions: [...allSubQuestions],
        sources: [...allSources],
        findings: [...allFindings],
        activeAgents: 0,
      });

      // --- PHASE 3: GAP CHECK ---
      if (
        currentRound >= config.maxRounds ||
        callbacks.isCancelled() ||
        totalUrlsRead >= config.maxTotalUrlReads
      ) {
        break;
      }

      emit({ phase: "analyzing", phaseDetail: "Checking for gaps..." });

      try {
        const gapMessages: ChatMessage[] = [
          { role: "system", content: RESEARCH_GAP_CHECKER_PROMPT },
          {
            role: "user",
            content: `Research question: ${question}\n\nFindings so far:\n${allFindings.map((f) => `- ${f.content.slice(0, 200)}`).join("\n")}\n\nSub-questions investigated:\n${allSubQuestions.map((sq) => `- ${sq.question} (${sq.status})`).join("\n")}`,
          },
        ];

        const gapResponse = await aiClient.chat(gapMessages);
        const gapResult = parseJsonResponse(gapResponse.content) as {
          shouldContinue: boolean;
          followUpQuestions?: Array<{
            question: string;
            searchQueries: string[];
          }>;
        };

        if (
          !gapResult.shouldContinue ||
          !gapResult.followUpQuestions?.length
        ) {
          break;
        }

        // Create follow-up sub-questions
        questionsToInvestigate = gapResult.followUpQuestions
          .slice(0, 3)
          .map((sq) => ({
            id: generateId(),
            question: sq.question,
            status: "pending" as const,
            searchQueries: sq.searchQueries,
            findings: [],
            sources: [],
          }));

        allSubQuestions.push(...questionsToInvestigate);
        currentRound++;
      } catch {
        // Gap check failed — proceed to synthesis with what we have
        break;
      }
    }

    // --- PHASE 4: SYNTHESIZE ---
    if (callbacks.isCancelled()) throw new CancelledError();

    emit({ phase: "synthesizing", phaseDetail: "Writing report..." });

    const sourceList = allSources
      .filter((s) => s.isRead || s.snippet)
      .map((s, i) => `[Source ${i + 1}] ${s.title} — ${s.url}`)
      .join("\n");

    const findingsList = allFindings
      .map((f) => `- ${f.content.slice(0, 300)}`)
      .join("\n");

    const synthesisMessages: ChatMessage[] = [
      { role: "system", content: RESEARCH_SYNTHESIZER_PROMPT },
      {
        role: "user",
        content: `Research question: ${question}\n\nSub-questions investigated:\n${allSubQuestions.map((sq) => `- ${sq.question}`).join("\n")}\n\nAll findings:\n${findingsList}\n\nSources:\n${sourceList}\n\nToday's date: ${new Date().toLocaleDateString()}`,
      },
    ];

    const synthesisResponse = await aiClient.chat(synthesisMessages);
    const synthesis = parseJsonResponse(synthesisResponse.content) as {
      summary: string;
      report: string;
    };

    const elapsedMs = Date.now() - startedAt;

    const result: ResearchResult = {
      summary: synthesis.summary || "Research complete. See the full report on the canvas.",
      report:
        synthesis.report ||
        `# Research Report: ${question}\n\nNo detailed report was generated.`,
      sources: allSources,
      subQuestions: allSubQuestions,
      totalSearches,
      totalUrlsRead,
      elapsedMs,
    };

    emit({ phase: "complete", phaseDetail: "Done" });
    callbacks.onComplete(result);
    return result;
  } catch (error) {
    if (error instanceof CancelledError) {
      emit({ phase: "cancelled" });

      // Return partial results
      const elapsedMs = Date.now() - startedAt;
      const result: ResearchResult = {
        summary: "Research was cancelled. Partial findings may be available.",
        report: `# Research Report (Partial): ${question}\n\nResearch was cancelled after ${Math.round(elapsedMs / 1000)}s.\n\n## Findings\n${allFindings.map((f) => `- ${f.content.slice(0, 200)}`).join("\n") || "None collected."}`,
        sources: allSources,
        subQuestions: allSubQuestions,
        totalSearches,
        totalUrlsRead,
        elapsedMs,
      };
      callbacks.onComplete(result);
      return result;
    }

    emit({ phase: "error", phaseDetail: error instanceof Error ? error.message : "Unknown error" });
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

class CancelledError extends Error {
  constructor() {
    super("Research cancelled");
    this.name = "CancelledError";
  }
}
