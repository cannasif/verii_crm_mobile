export interface CustomerTypeDto {
  id: number;
  name: string;
  description?: string;
  createdDate: string;
  updatedDate?: string;
  isDeleted: boolean;
}

export interface CountryDto {
  id: number;
  name: string;
  code: string;
  erpCode?: string;
  createdDate: string;
  updatedDate?: string;
  isDeleted: boolean;
}

export interface CityDto {
  id: number;
  name: string;
  erpCode?: string;
  countryId: number;
  countryName?: string;
  createdDate: string;
  updatedDate?: string;
  isDeleted: boolean;
}

export interface DistrictDto {
  id: number;
  name: string;
  erpCode?: string;
  postalCode?: string;
  cityId: number;
  cityName?: string;
  createdDate: string;
  updatedDate?: string;
  isDeleted: boolean;
}

export interface TitleDto {
  id: number;
  titleName: string;
  code?: string;
  createdDate: string;
  updatedDate?: string;
}
