/**
 * Simple in-memory store for development and demo use.
 * In production this would be replaced by Firestore / PostgreSQL.
 * Data survives hot-reloads via tsx watch, but not server restarts.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data');

interface StoredRecord {
  [key: string]: unknown;
}

class Store {
  private cache = new Map<string, unknown>();
  private initialized = false;

  private ensureDir() {
    if (!fs.existsSync(DATA_PATH)) {
      fs.mkdirSync(DATA_PATH, { recursive: true });
    }
  }

  private filePath(key: string): string {
    return path.join(DATA_PATH, `${key}.json`);
  }

  private load(key: string): void {
    const fp = this.filePath(key);
    if (fs.existsSync(fp)) {
      try {
        const raw = fs.readFileSync(fp, 'utf-8');
        this.cache.set(key, JSON.parse(raw));
      } catch {
        this.cache.set(key, null);
      }
    }
  }

  private persist(key: string): void {
    this.ensureDir();
    const val = this.cache.get(key);
    fs.writeFileSync(this.filePath(key), JSON.stringify(val, null, 2), 'utf-8');
  }

  get<T = unknown>(key: string): T | null {
    if (!this.cache.has(key)) this.load(key);
    return (this.cache.get(key) as T) ?? null;
  }

  set(key: string, value: unknown): void {
    this.cache.set(key, value);
    this.persist(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.ensureDir();
    const fp = this.filePath(key);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  /**
   * Get all entries whose key starts with the given prefix.
   */
  list<T = unknown>(prefix: string): { key: string; value: T }[] {
    if (!fs.existsSync(DATA_PATH)) return [];
    return fs
      .readdirSync(DATA_PATH)
      .filter(f => f.endsWith('.json') && f.startsWith(prefix))
      .map(f => {
        const key = f.replace(/\.json$/, '');
        return { key, value: this.get<T>(key) as T };
      })
      .filter(e => e.value !== null);
  }
}

export const store = new Store();
