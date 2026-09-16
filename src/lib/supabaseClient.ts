import { createClient } from '@supabase/supabase-js';
import { ResultsSubmissionRecord } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tqvsqfchxgmvjoueduyp.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_OfikpzTmaJ4iypNI76cAKA_7xvhWwtW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOCAL_STORAGE_KEY = 'bcas_results_submission_progress_data_v3';

// Default initial records (Empty by default)
export const INITIAL_SAMPLE_RECORDS: ResultsSubmissionRecord[] = [];

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
        console.warn('Supabase fetch notice, using local storage sync:', error.message);
        return { data: getLocalRecords(), error: null, isFallback: true };
      }

      if (data) {
        return { data: data as ResultsSubmissionRecord[], error: null, isFallback: false };
      }
    } catch (err: any) {
      console.warn('Supabase query failed, using local storage:', err.message);
      return { data: getLocalRecords(), error: null, isFallback: true };
    }
  }

  return { data: getLocalRecords(), error: null, isFallback: true };
}

// Add a new record
export async function addRecord(record: Omit<ResultsSubmissionRecord, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: ResultsSubmissionRecord | null; error: string | null }> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('results_submission_progress')
        .insert([record])
        .select()
        .single();

      if (!error && data) {
        return { data: data as ResultsSubmissionRecord, error: null };
      }
    } catch (e: any) {
      console.warn('Supabase insert notice, saving locally:', e.message);
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
      const { data, error } = await supabase
        .from('results_submission_progress')
        .update({ ...record, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return { data: data as ResultsSubmissionRecord, error: null };
      }
    } catch (e: any) {
      console.warn('Supabase update notice, updating locally:', e.message);
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

      if (!error) {
        return { success: true, error: null };
      }
    } catch (e: any) {
      console.warn('Supabase delete notice:', e.message);
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
