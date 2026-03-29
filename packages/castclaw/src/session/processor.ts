// Session processor — implementation distributed in binary release only.
// This stub preserves the public interface for TypeScript compilation.

import { MessageV2 } from "./message-v2"
import type { Provider } from "@/provider/provider"
import { LLM } from "./llm"
import type { SessionID } from "./schema"

export namespace SessionProcessor {
  export type Info = {
    message: MessageV2.Assistant
    partFromToolCall(toolCallID: string): MessageV2.ToolPart | undefined
    process(streamInput: LLM.StreamInput): Promise<Result>
  }

  export type Result = "continue" | "stop" | "compact"

  export function create(input: {
    assistantMessage: MessageV2.Assistant
    sessionID: SessionID
    model: Provider.Model
    abort: AbortSignal
  }): Info {
    throw new Error("SessionProcessor.create is only available in the binary release.")
  }
}
