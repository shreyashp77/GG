import {
  DATABASE_VERSION,
  RULESET_VERSION,
  SAVE_SCHEMA_VERSION,
  type CareerSave,
  type FranchiseId,
  type SeasonState,
} from "../domain/models";

const DB_NAME = "gg-cricket-manager";
const STORE_NAME = "careers";
const DB_VERSION = 1;

function seasonStateFor(seed: number, season: number): SeasonState {
  return {
    season,
    scheduleSeed: seed ^ season,
    completedFixtures: [],
    championId: null,
  };
}

function migrateCareer(raw: unknown): CareerSave | null {
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as Partial<Omit<CareerSave, "schemaVersion">> & {
    schemaVersion?: number;
  };
  if (candidate.schemaVersion === SAVE_SCHEMA_VERSION && candidate.seasonState) {
    return candidate as CareerSave;
  }

  if (
    candidate.schemaVersion === 3 &&
    candidate.seasonState &&
    typeof candidate.seed === "number" &&
    typeof candidate.season === "number"
  ) {
    return {
      ...candidate,
      schemaVersion: SAVE_SCHEMA_VERSION,
      seasonHistory: [],
    } as CareerSave;
  }

  if (
    candidate.schemaVersion === 2 &&
    candidate.seasonState &&
    typeof candidate.seed === "number" &&
    typeof candidate.season === "number"
  ) {
    return {
      ...candidate,
      schemaVersion: SAVE_SCHEMA_VERSION,
      seasonState: {
        ...candidate.seasonState,
        championId: null,
      },
      seasonHistory: [],
    } as CareerSave;
  }

  if (
    candidate.schemaVersion === 1 &&
    typeof candidate.seed === "number" &&
    typeof candidate.season === "number"
  ) {
    return {
      ...candidate,
      schemaVersion: SAVE_SCHEMA_VERSION,
      seasonState: seasonStateFor(candidate.seed, candidate.season),
      seasonHistory: [],
    } as CareerSave;
  }

  return null;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadCareer(): Promise<CareerSave | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get("primary");
    request.onsuccess = () => {
      const migrated = migrateCareer(request.result);
      resolve(migrated);
      if (migrated && (request.result as Partial<CareerSave>).schemaVersion !== SAVE_SCHEMA_VERSION) {
        saveCareer(migrated).catch(() => undefined);
      }
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function createCareer(
  coachName: string,
  franchiseId: FranchiseId,
): Promise<CareerSave> {
  const createdAt = new Date().toISOString();
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const save: CareerSave = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    databaseVersion: DATABASE_VERSION,
    rulesetVersion: RULESET_VERSION,
    id: "primary",
    coachName: coachName.trim(),
    franchiseId,
    season: 2027,
    currentDate: "2026-06-08",
    seed,
    createdAt,
    seasonState: seasonStateFor(seed, 2027),
    seasonHistory: [],
  };

  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(save);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  return save;
}

export async function saveCareer(save: CareerSave): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(save);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
