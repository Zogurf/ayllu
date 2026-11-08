import { supabase } from '../lib/supabase';
import { LocalService, EmergencyReport, CriticalResource, ContentReport, EmergencyModeState } from '../types';

export async function rpc(name: string, args: Record<string, unknown>) {
  if (!supabase) throw new Error('Se requiere conexión con el servidor.');
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}
export async function fetchShared(district: string, neighborhoodId: string) {
  if (!supabase) throw new Error('Backend sin configurar.');
  const results = await Promise.all([
    supabase.from('local_services').select('*,service_endorsements(user_id)').eq('district_ubigeo', district).eq('deleted',false).order('created_at',{ascending:false}),
    supabase.from('emergency_reports').select('*,neighborhoods(name,district_ubigeo)').eq('neighborhood_id',neighborhoodId).order('created_at',{ascending:false}),
    supabase.from('critical_resources').select('*').eq('neighborhood_id',neighborhoodId),
    supabase.from('emergency_modes').select('*,neighborhoods(name)').eq('neighborhood_id',neighborhoodId).maybeSingle(),
    supabase.from('content_reports').select('*').eq('neighborhood_id',neighborhoodId).order('created_at',{ascending:false}),
    supabase.from('community_memberships').select('role').eq('neighborhood_id',neighborhoodId),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const [services,reports,resources,mode,moderation,memberships] = results;
  const m=mode.data;
  return {
    services: (services.data ?? []).map(row=>({...row.content,id:row.id,authorId:row.author_id,createdAt:row.created_at,isHidden:row.hidden,isOfflinePending:false,avalesUserIds:row.service_endorsements.map((a: { user_id: string })=>a.user_id),avalesCount:row.service_endorsements.length} as LocalService)),
    reports: (reports.data ?? []).map(row=>({id:row.id,code:row.code,title:row.title,description:row.description,category:row.category,categoryLabel:row.category,priority:row.priority,status:row.status,neighborhood:row.neighborhoods?.name ?? '',districtUbigeo:row.neighborhoods?.district_ubigeo,reportedBy:row.created_by,assignedBrigade:row.assigned_brigade,createdAt:row.created_at,updatedAt:row.updated_at,isHidden:row.hidden,beneficiaryName:'',exactAddress:'',contactPhone:'',isOfflinePending:false} as EmergencyReport)),
    resources: (resources.data ?? []).map(row=>({...row.content,id:row.id,quantity:`${row.quantity} ${row.unit}`,version:row.version,updatedAt:row.updated_at} as CriticalResource)),
    mode: {isActive:m?.active ?? false,affectedNeighborhood:m?.neighborhoods?.name ?? '',emergencyType:m?.emergency_type ?? '',activatedBy:m?.activated_by ?? '',activatedAt:m?.updated_at ?? ''} as EmergencyModeState,
    moderation: (moderation.data ?? []).map(row=>({id:row.id,itemId:row.item_id,itemType:row.item_type,reportedItemTitle:row.item_id,reportedBy:row.reported_by,reason:row.reason,details:row.details,status:row.status,createdAt:row.created_at} as ContentReport)),
    canCoordinate: memberships.data?.some(m=>m.role==='coordinador'||m.role==='admin') ?? false,
  };
}
