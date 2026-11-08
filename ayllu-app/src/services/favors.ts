import { supabase } from '../lib/supabase';
import { CommunityFavor } from '../types';

export async function fetchFavors(districtUbigeo: string): Promise<CommunityFavor[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('community_favors')
    .select('id,author_id,content,status,created_at')
    .eq('district_ubigeo', districtUbigeo).eq('deleted', false)
    .order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({ ...row.content, id: row.id, authorId: row.author_id,
    status: row.status, createdAt: row.created_at, isOfflinePending: false } as CommunityFavor));
}
