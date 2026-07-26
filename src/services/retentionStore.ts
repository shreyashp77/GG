import type { FranchiseId } from "../domain/models";

export interface RetentionSubmission {
  franchiseId: FranchiseId;
  submittedAt: string;
  retainedPlayerIds: string[];
  releasedPlayerIds: string[];
}

export function retentionStorageKey(franchiseId: FranchiseId): string {
  return `gg-retention-submission-${franchiseId}`;
}

export function loadRetentionSubmission(
  franchiseId: FranchiseId,
): RetentionSubmission | null {
  try {
    const saved = window.localStorage.getItem(retentionStorageKey(franchiseId));
    if (!saved) return null;
    const submission = JSON.parse(saved) as Partial<RetentionSubmission>;
    if (
      !Array.isArray(submission.retainedPlayerIds) ||
      !Array.isArray(submission.releasedPlayerIds)
    ) {
      return null;
    }
    return {
      franchiseId,
      submittedAt: submission.submittedAt ?? "",
      retainedPlayerIds: submission.retainedPlayerIds,
      releasedPlayerIds: submission.releasedPlayerIds,
    };
  } catch {
    return null;
  }
}

export function saveRetentionSubmission(submission: RetentionSubmission): void {
  window.localStorage.setItem(
    retentionStorageKey(submission.franchiseId),
    JSON.stringify(submission),
  );
}
