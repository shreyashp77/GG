import { simulateMatch } from "../engine/matchEngine";
import type {
  MatchSimulationInput,
  MatchSimulationResult,
} from "../engine/types";

export function runMatchSimulation(
  input: MatchSimulationInput,
): Promise<MatchSimulationResult> {
  if (typeof Worker === "undefined") {
    return Promise.resolve(simulateMatch(input));
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/match.worker.ts", import.meta.url),
      { type: "module" },
    );
    const id = crypto.randomUUID();
    worker.onmessage = (
      event: MessageEvent<
        | { id: string; ok: true; result: MatchSimulationResult }
        | { id: string; ok: false; error: string }
      >,
    ) => {
      if (event.data.id !== id) return;
      worker.terminate();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.error));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "Match worker failed"));
    };
    worker.postMessage({ id, input });
  });
}
