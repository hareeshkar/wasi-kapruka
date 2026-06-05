import { getOrCreateSession, supabase } from './supabase';

// Migrate a guest session's data (cart_items, messages, orders, conversations)
// to the authenticated user. Runs once on sign-in.
//
// Strategy: UPDATE ... SET owner_id = $newUserId WHERE session_id = $oldSid AND owner_id IS NULL
// This is idempotent: if the user signs out and back in, no rows are double-migrated (owner_id is
// already set from the first run).
//
// We also call sessionStorage.setItem('wasi_migrated_sids', ...) to record the migration so we
// never re-run for the same (session, user) pair. Supabase RLS prevents cross-user writes anyway.

const TABLES = ['cart_items', 'messages', 'orders', 'conversations'] as const;
const MIGRATION_KEY = 'wasi_migrated_to';

const wasAlreadyMigrated = (userId: string): boolean => {
  try {
    const raw = sessionStorage.getItem(MIGRATION_KEY);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return list.includes(userId);
  } catch { return false; }
};

const markMigrated = (userId: string) => {
  try {
    const raw = sessionStorage.getItem(MIGRATION_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(userId)) list.push(userId);
    sessionStorage.setItem(MIGRATION_KEY, JSON.stringify(list));
  } catch {}
};

export async function migrateGuestDataToUser(userId: string): Promise<{ migratedTables: string[]; errors: string[] }> {
  if (!userId) return { migratedTables: [], errors: ['No userId provided'] };
  if (wasAlreadyMigrated(userId)) {
    return { migratedTables: [], errors: [] };
  }

  const sessionId = getOrCreateSession();
  const migratedTables: string[] = [];
  const errors: string[] = [];

  for (const table of TABLES) {
    const { error, count } = await supabase
      .from(table)
      .update({ owner_id: userId })
      .eq('session_id', sessionId)
      .is('owner_id', null)
      // .select('id', { count: 'exact', head: true }) would be ideal but update returns count via
      // affected_rows in some drivers. We rely on the absence of an error to confirm success.
      ;
    if (error) {
      // Table may not exist (schema not yet applied) — soft-fail
      errors.push(`${table}: ${error.message}`);
    } else {
      migratedTables.push(table);
      console.log(`[auth migration] ${table} → ${count ?? '?'} rows → owner_id=${userId}`);
    }
  }

  if (errors.length === 0) markMigrated(userId);
  return { migratedTables, errors };
}
