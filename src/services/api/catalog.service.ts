import { axiosInstance } from '@/services/api/axiosInstance';
import type {
  ApiResponse,
  PaginationMeta,
  PersitDetail,
  PersitListItem,
  PersonnelDetail,
  PersonnelListItem,
  VehicleDetail,
  VehicleListItem,
  WeaponAssignmentDetail,
  WeaponAssignmentListItem,
  WeaponCategoryDetail,
  WeaponCategoryListItem,
} from '@/types';

export interface CatalogListParams {
  search?: string;
  page?: number;
  // Filter tambahan per resource (mis. status/gender/blood_type buat personnel) — diteruskan
  // apa adanya sebagai query param, lihat CatalogFilterField di utils/catalogResources.
  [filterKey: string]: string | number | undefined;
}

export interface CatalogListResult<T> {
  items: T[];
  meta: PaginationMeta;
}

async function fetchCatalogList<T>(url: string, params: CatalogListParams): Promise<CatalogListResult<T>> {
  const { data } = await axiosInstance.get<{ success: boolean; data: T[]; meta: PaginationMeta }>(url, { params });
  return { items: data.data, meta: data.meta };
}

async function fetchCatalogDetail<T>(url: string): Promise<T> {
  const { data } = await axiosInstance.get<ApiResponse<T>>(url);
  return data.data;
}

export function getPersonnelListApi(params: CatalogListParams) {
  return fetchCatalogList<PersonnelListItem>('/catalog/personnel', params);
}

// {personnel} di endpoint ini adalah NRP (service_number), bukan id numerik.
export function getPersonnelDetailApi(serviceNumber: string) {
  return fetchCatalogDetail<PersonnelDetail>(`/catalog/personnel/${serviceNumber}`);
}

export function getPersitListApi(params: CatalogListParams) {
  return fetchCatalogList<PersitListItem>('/catalog/persit', params);
}

export function getPersitDetailApi(id: string) {
  return fetchCatalogDetail<PersitDetail>(`/catalog/persit/${id}`);
}

export function getVehiclesListApi(params: CatalogListParams) {
  return fetchCatalogList<VehicleListItem>('/catalog/vehicles', params);
}

export function getVehicleDetailApi(id: string) {
  return fetchCatalogDetail<VehicleDetail>(`/catalog/vehicles/${id}`);
}

export function getWeaponCategoriesListApi(params: CatalogListParams) {
  return fetchCatalogList<WeaponCategoryListItem>('/catalog/weapon-categories', params);
}

export function getWeaponCategoryDetailApi(id: string) {
  return fetchCatalogDetail<WeaponCategoryDetail>(`/catalog/weapon-categories/${id}`);
}

export function getWeaponAssignmentsListApi(params: CatalogListParams) {
  return fetchCatalogList<WeaponAssignmentListItem>('/catalog/weapon-assignments', params);
}

export function getWeaponAssignmentDetailApi(id: string) {
  return fetchCatalogDetail<WeaponAssignmentDetail>(`/catalog/weapon-assignments/${id}`);
}
