export interface CustomerGetDto {
  id: number;
  customerCode?: string;
  name: string;
  taxNumber?: string;
  taxOffice?: string;
  tcknNumber?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  notes?: string;
  countryId?: number;
  countryName?: string;
  cityId?: number;
  cityName?: string;
  districtId?: number;
  districtName?: string;
  customerTypeId?: number;
  customerTypeName?: string;
  salesRepCode?: string;
  groupCode?: string;
  creditLimit?: number;
  defaultShippingAddressId?: number;
  branchCode?: number;
  businessUnitCode?: number;
  isERPIntegrated?: boolean;
  erpIntegrationNumber?: string;
  lastSyncDate?: string;
  createdDate?: string;
  updatedDate?: string;
  isDeleted?: boolean;
  createdByFullUser?: string;
  updatedByFullUser?: string;
  deletedByFullUser?: string;
  deletedDate?: string;
  approvalDate?: string;
  approvalStatus?: string;
  approvedByUserId?: number;
  completionDate?: string;
  countTriedBy?: number;
  isCompleted?: boolean;
  isPendingApproval?: boolean;
  rejectedReason?: string;
  year?: string;
}

export type CustomerDto = CustomerGetDto;

export interface CreateCustomerDto {
  customerCode?: string;
  name: string;
  taxNumber?: string;
  taxOffice?: string;
  tcknNumber?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  notes?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  customerTypeId?: number;
  salesRepCode?: string;
  groupCode?: string;
  creditLimit?: number;
  defaultShippingAddressId?: number;
  branchCode: number;
  businessUnitCode: number;
  isCompleted?: boolean;
}

export interface CreateCustomerFromMobileDto {
  name: string;
  contactName?: string;
  contactFirstName?: string;
  contactMiddleName?: string;
  contactLastName?: string;
  title?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  address?: string;
  website?: string;
  notes?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  customerTypeId?: number;
  salesRepCode?: string;
  groupCode?: string;
  creditLimit?: number;
  branchCode?: number;
  businessUnitCode?: number;
  imageUri?: string;
  imageDescription?: string;
}

export interface CreateCustomerFromMobileResultDto {
  customerId: number;
  customerCreated: boolean;
  contactId?: number;
  contactCreated: boolean;
  titleId?: number;
  titleCreated: boolean;
  imageUploaded?: boolean;
  imageUploadError?: string;
}

export interface UpdateCustomerDto {
  customerCode?: string;
  name: string;
  taxNumber?: string;
  taxOffice?: string;
  tcknNumber?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  notes?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  customerTypeId?: number;
  salesRepCode?: string;
  groupCode?: string;
  creditLimit?: number;
  defaultShippingAddressId?: number;
  branchCode: number;
  businessUnitCode: number;
  completedDate?: string;
  isCompleted?: boolean;
}

export interface CustomerImageDto {
  id: number;
  customerId: number;
  customerName?: string;
  imageUrl: string;
  imageDescription?: string;
  createdDate?: string;
}
