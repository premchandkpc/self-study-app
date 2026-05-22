import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../..', 'data');
const STORE_PATH = resolve(DATA_DIR, 'store.json');

let store = null;

function loadStore() {
  if (existsSync(STORE_PATH)) {
    store = JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
  } else {
    store = { topics: [], templates: [], subtopics: [] };
  }
}

function saveStore() {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function getDb() {
  if (!store) loadStore();
  return store;
}

export function saveDb() {
  saveStore();
}
