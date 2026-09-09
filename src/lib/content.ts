import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Use process.cwd() to get the root of the project
const contentDirectory = path.join(process.cwd(), 'content');

export interface Topic {
  slug: string;
  title: string;
  description: string;
}

export interface Navigation {
  slug: string;
  title: string;
}

export interface TutorialData {
  title: string;
  description: string;
  content: string;
  navigation: {
    prev: Navigation | null;
    next: Navigation | null;
  };
}

// Function to get all topics for a category
export function getTopicsForCategory(category: string): Topic[] {
  const categoryDir = path.join(contentDirectory, category);

  if (!fs.existsSync(categoryDir)) {
    return [];
  }

  const files = fs.readdirSync(categoryDir).filter(file => file.endsWith('.md'));

  const topics = files.map(file => {
    const filePath = path.join(categoryDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContent);

    return {
      slug: file.replace('.md', ''),
      title: data.title || file.replace('.md', ''),
      description: data.description || '',
    };
  });

  return topics;
}

// Function to get specific tutorial content and navigation
export function getTutorialData(category: string, slug: string): TutorialData | null {
  const categoryDir = path.join(contentDirectory, category);
  const filePath = path.join(categoryDir, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);

  // Get topics to determine Next/Prev navigation
  const topics = getTopicsForCategory(category);
  const currentIndex = topics.findIndex(t => t.slug === slug);

  const prev = currentIndex > 0 ? { slug: topics[currentIndex - 1].slug, title: topics[currentIndex - 1].title } : null;
  const next = currentIndex < topics.length - 1 ? { slug: topics[currentIndex + 1].slug, title: topics[currentIndex + 1].title } : null;

  return {
    title: data.title || slug,
    description: data.description || '',
    content,
    navigation: { prev, next }
  };
}
