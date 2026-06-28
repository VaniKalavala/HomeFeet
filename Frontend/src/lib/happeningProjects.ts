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
    if (sizes.length) return `${sizes.join(', ')} BHK`;
  }
  if (property.bedrooms) return `${property.bedrooms} ${String(property.developmentType || '').toLowerCase() === 'villa' ? 'Villas' : ''}`.trim();
  return property.developmentType || 'Property';
};

const SALE_FLAT_TYPES = ['apartment', 'standalone', 'high-rise', 'group-house'];

export const fetchHappeningProjects = async (city: string, limit = 8) => {
  const response = await fetch(`${API_BASE}/search?listingIntent=sell&city=${encodeURIComponent(city)}`);
  const data = await response.json();
  if (!response.ok || !Array.isArray(data)) throw new Error('Unable to load happening projects');
  return data
    .filter((property: any) => SALE_FLAT_TYPES.includes(String(property.developmentType || '').toLowerCase()))
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, limit);
};
