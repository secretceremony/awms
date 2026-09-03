export interface CompanyOfficeIdentity {
  companyName: string;
  officeName: string;
  address: string;
  city: string;
  cityCode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
}

export const COMPANY_IDENTITY: {
  name: string;
  logoUrl: string;
  offices: Record<'JKT' | 'BPN', CompanyOfficeIdentity>;
} = {
  name: 'PT ALSSA Corporindo',
  logoUrl: '/alssa-logo.svg',
  offices: {
    JKT: {
      companyName: 'PT ALSSA Corporindo',
      officeName: 'Head Office (Jakarta)',
      address: 'Rukan Tanjung Mas Raya, Jalan Raya Lenteng Agung Blok B1 No. 3, RT 002 / RW 001, Tanjung Barat, Jagakarsa, Jakarta Selatan, DKI Jakarta 12530',
      city: 'Jakarta Selatan',
      cityCode: 'JKT',
      phone: '+6221 8010035 / +6221 8010033',
      email: 'info@alssacorp.co.id',
      website: 'alssacorp.co.id',
      logoUrl: '/alssa-logo.svg',
    },
    BPN: {
      companyName: 'PT ALSSA Corporindo',
      officeName: 'Branch Office (Balikpapan)',
      address: 'Balikpapan Baru, Cluster Orlando Blok DB No. 3, Balikpapan, Kalimantan Timur 76125',
      city: 'Balikpapan',
      cityCode: 'BPN',
      phone: '+6221 8010035',
      email: 'info@alssacorp.co.id',
      website: 'alssacorp.co.id',
      logoUrl: '/alssa-logo.svg',
    },
  },
};

/**
 * Resolves company identity based on city code or warehouse context.
 * Defaults to Jakarta Head Office if no specific city is matched.
 */
export function getCompanyIdentity(cityCodeOrName?: string | null): CompanyOfficeIdentity {
  if (!cityCodeOrName) {
    return COMPANY_IDENTITY.offices.JKT;
  }

  const normalized = cityCodeOrName.trim().toUpperCase();
  if (normalized === 'BPN' || normalized.includes('BALIKPAPAN')) {
    return COMPANY_IDENTITY.offices.BPN;
  }

  return COMPANY_IDENTITY.offices.JKT;
}
