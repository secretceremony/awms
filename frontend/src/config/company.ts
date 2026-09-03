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
  logoUrl: '/alssa-logo.png',
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
      logoUrl: '/alssa-logo.png',
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
      logoUrl: '/alssa-logo.png',
    },
  },
};

/**
 * Resolves company identity based on city code or warehouse context.
 * Merges dynamic settings configured in System Settings if provided.
 * Defaults to Jakarta Head Office if no specific city is matched.
 */
export function getCompanyIdentity(
  cityCodeOrName?: string | null,
  customCompanySettings?: any,
): CompanyOfficeIdentity {
  const normalized = (cityCodeOrName || '').trim().toUpperCase();
  const isBpn = normalized === 'BPN' || normalized.includes('BALIKPAPAN');
  const defaultOffice = isBpn ? COMPANY_IDENTITY.offices.BPN : COMPANY_IDENTITY.offices.JKT;

  if (!customCompanySettings) {
    return defaultOffice;
  }

  const name = customCompanySettings.companyName || COMPANY_IDENTITY.name;
  if (isBpn) {
    return {
      companyName: name,
      officeName: customCompanySettings.bpnOfficeName || defaultOffice.officeName,
      address: customCompanySettings.bpnAddress || defaultOffice.address,
      city: 'Balikpapan',
      cityCode: 'BPN',
      phone: customCompanySettings.bpnPhone || defaultOffice.phone,
      email: customCompanySettings.bpnEmail || defaultOffice.email,
      website: defaultOffice.website,
      logoUrl: defaultOffice.logoUrl,
    };
  }

  return {
    companyName: name,
    officeName: customCompanySettings.jktOfficeName || defaultOffice.officeName,
    address: customCompanySettings.jktAddress || defaultOffice.address,
    city: 'Jakarta Selatan',
    cityCode: 'JKT',
    phone: customCompanySettings.jktPhone || defaultOffice.phone,
    email: customCompanySettings.jktEmail || defaultOffice.email,
    website: defaultOffice.website,
    logoUrl: defaultOffice.logoUrl,
  };
}

