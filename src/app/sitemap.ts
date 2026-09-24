import { MetadataRoute } from 'next';
import { getAllTopics, getAllCategories } from '@/lib/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://green-coast-083425a10.4.azurestaticapps.net'; // Replace with custom domain later
  
  // Home page
  const routes = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    }
  ];

  // Category pages
  const categories = getAllCategories();
  categories.forEach(category => {
    routes.push({
      url: `${baseUrl}/tutorials/${category}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    });
  });

  // Individual Tutorial / Topic pages
  const topics = getAllTopics();
  topics.forEach(({ category, slug }) => {
    routes.push({
      url: `${baseUrl}/tutorials/${category}/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    });
  });

  return routes;
}
