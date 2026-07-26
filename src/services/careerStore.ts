import {
  DATABASE_VERSION,
  RULESET_VERSION,
  SAVE_SCHEMA_VERSION,
  type CareerSave,
  type FranchiseId,
} from "../domain/models";

const DB_NAME = "gg-cricket-manager";
const STORE_NAME = "careers";
const DB_VERSION = 1;

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
    request.onsuccess = () => resolve((request.result as CareerSave | undefined) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function createCareer(
  coachName: string,
  franchiseId: FranchiseId,
): Promise<CareerSave> {
  const createdAt = new Date().toISOString();
  const save: CareerSave = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    databaseVersion: DATABASE_VERSION,
    rulesetVersion: RULESET_VERSION,
    id: "primary",
    coachName: coachName.trim(),
    franchiseId,
    season: 2027,
    currentDate: "2026-06-08",
    seed: crypto.getRandomValues(new Uint32Array(1))[0],
    createdAt,
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
