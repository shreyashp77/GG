/// <reference lib="webworker" />

import { simulateMatch } from "../engine/matchEngine";
import type {
  MatchSimulationInput,
  MatchSimulationResult,
} from "../engine/types";

type WorkerRequest = {
  id: string;
  input: MatchSimulationInput;
};

type WorkerResponse =
  | { id: string; ok: true; result: MatchSimulationResult }
  | { id: string; ok: false; error: string };

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  try {
    const response: WorkerResponse = {
      id: event.data.id,
      ok: true,
      result: simulateMatch(event.data.input),
    };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      id: event.data.id,
      ok: false,
      error: error instanceof Error ? error.message : "Match simulation failed",
    };
    self.postMessage(response);
  }
});

export {};
