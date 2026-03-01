export interface MemberVehicles {
    bikes: {
        count: number;
        registrationNumbers: string[];
    };
    cars: {
        count: number;
        registrationNumbers: string[];
    };
}

export interface OwnerDetails {
    index2: string | null;
}

export interface TenantDetails {
    agreement: string | null;
    lastDayOfAgreement: string | null;
}

export interface Member {
    _id: string;
    fullName: string;
    phoneNumber: string;
    flatNo: string;
    wing: string;
    type: 'owner' | 'tenant';
    vehicles: MemberVehicles;
    ownerDetails: OwnerDetails;
    tenantDetails: TenantDetails;
    createdAt: string;
    updatedAt: string;
}

export interface MembersResponse {
    success: boolean;
    stats: {
        total: number;
        owners: number;
        tenants: number;
    };
    data: Member[];
}

export interface MemberResponse {
    success: boolean;
    data: Member;
    message?: string;
}

export interface SearchResponse {
    success: boolean;
    data?: Member[];
    message?: string;
}

export interface LoginResponse {
    success: boolean;
    token: string;
    wing: string;
    role: string;
    message?: string;
}

export type WingType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K';
export type MemberType = 'owner' | 'tenant';

export const VALID_WINGS: WingType[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
export const VALID_TYPES: MemberType[] = ['owner', 'tenant'];
