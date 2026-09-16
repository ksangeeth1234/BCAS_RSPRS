import { createClient } from '@supabase/supabase-js';
import { ResultsSubmissionRecord } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tqvsqfchxgmvjoueduyp.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_OfikpzTmaJ4iypNI76cAKA_7xvhWwtW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOCAL_STORAGE_KEY = 'bcas_results_submission_progress_data_v4';

function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_ANON_KEY) && SUPABASE_ANON_KEY.length > 10;
}

// Read all records
export async function fetchAllRecords(): Promise<{ data: ResultsSubmissionRecord[]; error: string | null; isFallback: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('results_submission_progress')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.warn('Supabase fetch error:', error.message);
        return { data: getLocalRecords(), error: error.message, isFallback: true };
      }

      if (data) {
        return { data: data as ResultsSubmissionRecord[], error: null, isFallback: false };
      }
    } catch (err: any) {
      console.warn('Supabase query failed:', err.message);
      return { data: getLocalRecords(), error: err.message, isFallback: true };
    }
  }

  return { data: getLocalRecords(), error: null, isFallback: true };
}

// Add a new record
export async function addRecord(record: Omit<ResultsSubmissionRecord, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: ResultsSubmissionRecord | null; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const payload = {
        ...record,
        progress_submitted: Boolean(record.progress_submitted),
        progress_not_submitted: Boolean(record.progress_not_submitted),
        delay_submitted: Boolean(record.delay_submitted),
        delay_not_yet_submitted: Boolean(record.delay_not_yet_submitted),
      };

      const { data, error } = await supabase
        .from('results_submission_progress')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error.message);
        // Fallback to local storage if table doesn't exist yet, but return error note
        const local = getLocalRecords();
        const nextId = local.length > 0 ? Math.max(...local.map((r) => r.id || 0)) + 1 : 1;
        const newRecord: ResultsSubmissionRecord = {
          ...payload,
          id: nextId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        saveLocalRecords([newRecord, ...local]);
        return { data: newRecord, error: `Supabase Note: ${error.message}` };
      }

      if (data) {
        return { data: data as ResultsSubmissionRecord, error: null };
      }
    } catch (e: any) {
      console.error('Supabase insert exception:', e.message);
      return { data: null, error: e.message };
    }
  }

  const local = getLocalRecords();
  const nextId = local.length > 0 ? Math.max(...local.map((r) => r.id || 0)) + 1 : 1;
  const newRecord: ResultsSubmissionRecord = {
    ...record,
    id: nextId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const updated = [newRecord, ...local];
  saveLocalRecords(updated);
  return { data: newRecord, error: null };
}

// Update existing record
export async function updateRecord(id: number, record: Partial<ResultsSubmissionRecord>): Promise<{ data: ResultsSubmissionRecord | null; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const payload: any = { ...record, updated_at: new Date().toISOString() };
      if ('progress_submitted' in record) payload.progress_submitted = Boolean(record.progress_submitted);
      if ('progress_not_submitted' in record) payload.progress_not_submitted = Boolean(record.progress_not_submitted);
      if ('delay_submitted' in record) payload.delay_submitted = Boolean(record.delay_submitted);
      if ('delay_not_yet_submitted' in record) payload.delay_not_yet_submitted = Boolean(record.delay_not_yet_submitted);

      const { data, error } = await supabase
        .from('results_submission_progress')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error.message);
      } else if (data) {
        return { data: data as ResultsSubmissionRecord, error: null };
      }
    } catch (e: any) {
      console.error('Supabase update exception:', e.message);
    }
  }

  const local = getLocalRecords();
  const index = local.findIndex((r) => r.id === id);
  if (index !== -1) {
    local[index] = {
      ...local[index],
      ...record,
      updated_at: new Date().toISOString(),
    };
    saveLocalRecords(local);
    return { data: local[index], error: null };
  }
  return { data: null, error: 'Record not found' };
}

// Delete a record
export async function deleteRecord(id: number): Promise<{ success: boolean; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('results_submission_progress')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete error:', error.message);
      } else {
        return { success: true, error: null };
      }
    } catch (e: any) {
      console.error('Supabase delete exception:', e.message);
    }
  }

  const local = getLocalRecords();
  const filtered = local.filter((r) => r.id !== id);
  saveLocalRecords(filtered);
  return { success: true, error: null };
}

function getLocalRecords(): ResultsSubmissionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const item = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!item) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(item);
  } catch {
    return [];
  }
}

function saveLocalRecords(records: ResultsSubmissionRecord[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save to local storage', e);
    }
  }
}
