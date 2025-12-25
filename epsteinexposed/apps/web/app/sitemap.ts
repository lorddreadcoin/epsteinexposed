import { MetadataRoute } from 'next';

const BASE_URL = 'https://epsteinexposed.netlify.app';

// High-profile entity IDs for SEO sitemap
const HIGH_PROFILE_ENTITIES = [
  // People
  'jeffrey-epstein',
  'ghislaine-maxwell',
  'bill-clinton',
  'prince-andrew',
  'virginia-giuffre',
  'alan-dershowitz',
  'leslie-wexner',
  'bill-gates',
  'donald-trump',
  'jean-luc-brunel',
  // Organizations
  'fbi',
  'sdny',
  'doj',
  'palm-beach-police',
  'l-brands',
  'mc2-model-management',
  // Locations
  'little-st-james',
  'manhattan-townhouse',
  'palm-beach-mansion',
  'zorro-ranch',
  'paris-apartment',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date().toISOString();
  
  // Base pages
  const basePages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/entities`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Entity pages - high SEO priority for key figures
  const entityPages: MetadataRoute.Sitemap = HIGH_PROFILE_ENTITIES.map((id, index) => ({
    url: `${BASE_URL}/entity/${id}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    // Top entities get higher priority
    priority: index < 5 ? 0.9 : index < 10 ? 0.8 : 0.7,
  }));

  return [...basePages, ...entityPages];
}
