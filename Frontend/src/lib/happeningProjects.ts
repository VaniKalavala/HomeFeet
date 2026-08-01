import { API_BASE, API_ORIGIN } from './api';

const FALLBACK_PROJECT_IMAGE = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80';

const isDisplayableImage = (url = '') => Boolean(url) && !url.toLowerCase().includes('.pdf');

export const getProjectImage = (property: any) => {
  const url = property.imageUrl || (isDisplayableImage(property.plotDiagramUrl) ? property.plotDiagramUrl : '');
  return url ? `${API_ORIGIN}${url}` : FALLBACK_PROJECT_IMAGE;
};

export const getBuilderLabel = (property: any) =>
  property.companyName || property.agentCompanyName || 'Independent Owner';

export const getBuilderInitial = (property: any) =>
  getBuilderLabel(property).trim().charAt(0).toUpperCase() || 'H';

export const getBuilderLogo = (property: any) =>
  property.companyLogoUrl ? `${API_ORIGIN}${property.companyLogoUrl}` : '';

const formatLakhCr = (value: number) => {
  if (value >= 10000000) return `Rs. ${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `Rs. ${(value / 100000).toFixed(2)} L`;
  return `Rs. ${value.toLocaleString('en-IN')}`;
};

export const getProjectPriceRange = (property: any) => {
  if (property.floorPlanUnits && property.floorPlanUnits.length) {
    const prices = property.floorPlanUnits
      .map((unit: any) => Number(String(unit.price || '').replace(/,/g, '')))
      .filter((value: number) => value > 0);
    if (prices.length) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max ? formatLakhCr(min) : `${formatLakhCr(min)} - ${formatLakhCr(max).replace('Rs. ', '')}`;
    }
  }
  const single = Number(property.totalBudget || property.squareFeetPrice || property.squareYardPrice || property.goodwill || 0);
  return single > 0 ? formatLakhCr(single) : 'Price on request';
};

export const getProjectConfiguration = (property: any) => {
  if (property.floorPlanUnits && property.floorPlanUnits.length) {
    const sizes = Array.from(new Set(property.floorPlanUnits.map((unit: any) => unit.bedrooms).filter(Boolean)));
    if (sizes.length) {
      const hasBhkSuffix = sizes.every((size: string) => /bhk/i.test(size));
      return hasBhkSuffix ? sizes.join(', ') : `${sizes.join(', ')} BHK`;
    }
  }
  if (property.bedrooms) return `${property.bedrooms} ${String(property.developmentType || '').toLowerCase() === 'villa' ? 'Villas' : ''}`.trim();
  return property.developmentType || 'Property';
};

export const getProjectAreaRange = (property: any) => {
  if (property.floorPlanUnits && property.floorPlanUnits.length) {
    const sizes = property.floorPlanUnits
      .map((unit: any) => Number(String(unit.size || '').replace(/,/g, '')))
      .filter((value: number) => value > 0);
    if (sizes.length) {
      const min = Math.min(...sizes);
      const max = Math.max(...sizes);
      return min === max ? `${min.toLocaleString('en-IN')} Sq Ft` : `${min.toLocaleString('en-IN')} - ${max.toLocaleString('en-IN')} Sq Ft`;
    }
  }
  if (property.flatSizeMin && property.flatSizeMax) {
    return `${property.flatSizeMin} - ${property.flatSizeMax} Sq Ft`;
  }
  if (property.flatSize) return `${property.flatSize} Sq Ft`;
  return '';
};

const SALE_FLAT_TYPES = ['apartment', 'standalone', 'high-rise', 'gated-community', 'group-house', 'newly-launched'];

export const fetchHappeningProjects = async (city: string, limit = 8) => {
  const response = await fetch(`${API_BASE}/search?listingIntent=sell&city=${encodeURIComponent(city)}`);
  const data = await response.json();
  if (!response.ok || !Array.isArray(data)) throw new Error('Unable to load happening projects');
  const filtered = data.filter((property: any) =>
    SALE_FLAT_TYPES.includes(String(property.developmentType || '').toLowerCase())
  );
  // Fisher-Yates shuffle so a different set appears on every page load
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }
  return filtered.slice(0, limit);
};
