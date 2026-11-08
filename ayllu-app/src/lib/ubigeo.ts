import catalog from '../data/ubigeo/catalog.json';
import type { UserProfile } from '../types';

export const departments = catalog.departments;
export const provinces = catalog.provinces;
export const districts = catalog.districts;
export const LEGACY_CUSCO_UBIGEO = '080101';

const districtIndex = new Map(districts.map(district => [district.code, district]));
const provinceIndex = new Map(provinces.map(province => [province.code, province]));
const departmentIndex = new Map(departments.map(department => [department.code, department]));

export function getLocation(ubigeo: string) {
  const district = districtIndex.get(ubigeo);
  const province = district && provinceIndex.get(district.provinceCode);
  const department = province && departmentIndex.get(province.departmentCode);
  return district && province && department ? {
    districtUbigeo: district.code, district: district.name,
    province: province.name, region: department.name,
  } : undefined;
}

export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

// Older local profiles contained only names. Resolve only unambiguous matches.
export function resolveProfileUbigeo(profile: Pick<UserProfile, 'districtUbigeo' | 'district' | 'region' | 'province'>): string | undefined {
  if (profile.districtUbigeo) return getLocation(profile.districtUbigeo)?.districtUbigeo;
  const candidates = districts.filter(d => {
    const location = getLocation(d.code)!;
    return normalizeSearch(location.district) === normalizeSearch(profile.district)
      && normalizeSearch(location.region) === normalizeSearch(profile.region)
      && (!profile.province || normalizeSearch(location.province) === normalizeSearch(profile.province));
  });
  return candidates.length === 1 ? candidates[0].code : undefined;
}

export function locationMatchesScope(
  user: Pick<UserProfile, 'districtUbigeo' | 'district' | 'region' | 'province' | 'neighborhood' | 'coverageScope'>,
  item: { neighborhood: string; districtUbigeo?: string },
  adjacentNames: string[] = [],
): boolean {
  const ubigeo = resolveProfileUbigeo(user);
  if (!ubigeo || (item.districtUbigeo ?? LEGACY_CUSCO_UBIGEO) !== ubigeo) return false;
  if (user.coverageScope === 3) return true;
  if (normalizeSearch(item.neighborhood) === normalizeSearch(user.neighborhood)) return true;
  return false;
}
