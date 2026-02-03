import { FinanceEngine } from '../engine/FinanceEngine.js';

const STORAGE_KEY = 'finance-engine-v1';

export function loadEngine() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return new FinanceEngine();
  try {
    return FinanceEngine.fromJSON(JSON.parse(raw));
  } catch {
    return new FinanceEngine();
  }
}

export function saveEngine(engine) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(engine.toJSON()));
}
