import { supabase } from '../lib/supabase';
import { CommunityFavor } from '../types';

export async function fetchFavors(districtUbigeo: string, limit = 50): Promise<CommunityFavor[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('community_favors')
    .select('id,author_id,content,status,created_at,hidden,version')
    .eq('district_ubigeo', districtUbigeo).eq('deleted', false)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({ ...row.content, id: row.id, authorId: row.author_id,
    isHidden: row.hidden, version: row.version, status: row.status, createdAt: row.created_at, isOfflinePending: false } as CommunityFavor));
}
