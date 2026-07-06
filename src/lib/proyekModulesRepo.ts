import { supabase, isSupabaseConfigured } from './supabaseClient';

export type ModulNode = {
  id: number;
  nama: string;
  expanded?: boolean;
  children?: ModulNode[];
};

const TABLE = 'proyek_modules';

export const canUseCloud = () => isSupabaseConfigured();

export async function fetchModules(projectId: number): Promise<ModulNode[] | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('modules_json')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) {
    console.warn('supabase fetchModules error', error);
    return null;
  }
  return (data?.modules_json as ModulNode[]) || null;
}

export async function upsertModules(projectId: number, modules: ModulNode[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const payload = {
    project_id: projectId,
    modules_json: modules,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'project_id' });
  if (error) {
    console.error('supabase upsertModules error', error);
    return false;
  }
  return true;
}
