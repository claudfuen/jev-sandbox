import type { Experimental_EvaluationQuestion as EvaluationQuestion } from "ai"

import {
  assessQuestions,
  buildAssessState,
  buildReflectState,
  buildState,
  decideQuestions,
  pressQuestions,
  reflectQuestions,
  respondQuestions,
} from "./prompt"
import type { JevRequest } from "./schema"

export type JevCall = { state: string; questions: Record<string, EvaluationQuestion> }

/**
 * Pure: the exact state text and typed questions for a request. Used by the
 * route, the lab runner, and replay (which recomputes "what JEV saw" instead of
 * storing it).
 */
export function buildJevCall(req: JevRequest): JevCall {
  switch (req.kind) {
    case "decide":
      return {
        state: buildState(req.payload.perception),
        questions: decideQuestions(req.payload.perception, req.payload.options),
      }
    case "respond":
      return {
        state: buildState(req.payload.perception),
        questions: respondQuestions(req.payload.perception, req.payload.askerName, req.payload.offer, req.payload.can),
      }
    case "assess":
      return { state: buildAssessState(req.payload), questions: assessQuestions() }
    case "reflect":
      return { state: buildReflectState(req.payload), questions: reflectQuestions(req.payload) }
    case "press":
      return {
        state: buildState(req.payload.perception),
        questions: pressQuestions(req.payload.perception, req.payload.targetName, req.payload.severity, req.payload.targetHealth, req.payload.reaction),
      }
  }
}
