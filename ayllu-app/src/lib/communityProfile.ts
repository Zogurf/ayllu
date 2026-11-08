import { supabase } from './supabase';
import { getLocation, resolveProfileUbigeo } from './ubigeo';
import type { UserProfile } from '../types';

export interface CommunityLocation {
  districtUbigeo: string;
  neighborhood: string;
  region: string;
  province: string;
  district: string;
}

export const normalizeNeighborhood = (name: string) => name.trim().replace(/\s+/g, ' ');

export async function saveCommunityProfile(profile: Pick<UserProfile, 'nickname' | 'phone' | 'neighborhood' | 'districtUbigeo' | 'region' | 'province' | 'district'>): Promise<Partial<UserProfile>> {
  const code = resolveProfileUbigeo(profile);
  const location = code && getLocation(code);
  if (!location) throw new Error('Selecciona departamento, provincia y distrito.');
  const neighborhood = normalizeNeighborhood(profile.neighborhood);
  if (neighborhood.length < 1 || neighborhood.length > 120) throw new Error('Ingresa un barrio o sector de entre 1 y 120 caracteres.');
  if (!supabase) return { ...location, neighborhood, neighborhoodId: undefined };
  const { data, error } = await supabase.rpc('complete_community_profile_v2', {
    p_nickname: profile.nickname.trim(), p_phone: profile.phone,
    p_neighborhood_name: neighborhood, p_district_ubigeo: location.districtUbigeo,
  });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Falta actualizar la base de datos de ubicaciones. Aplica las migraciones de ubigeo en Supabase.');
    throw new Error(error.message);
  }
  if (!data?.neighborhood_id || !data?.neighborhood_name) throw new Error('El servidor no confirmó la ubicación.');
  return { ...location, neighborhood: data.neighborhood_name, neighborhoodId: data.neighborhood_id };
}
