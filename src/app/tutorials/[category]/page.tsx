import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getTopicsForCategory(category: string) {
  try {
    const res = await fetch(`http://127.0.0.1:3005/api/categories/${category}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Fetch error:', e);
    return null;
  }
}

interface Topic {
  slug: string;
  title: string;
  description: string;
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const topics = await getTopicsForCategory(params.category);
  
  if (!topics) {
    notFound();
  }
  
  const formatCategoryName = (cat: string) => {
    return cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="container animate-fade-in" style={{ marginTop: '4rem', minHeight: '80vh' }}>
      <h1 className="text-gradient" style={{ fontSize: '3.5rem', marginBottom: '1rem', textAlign: 'center' }}>
        {formatCategoryName(params.category)}
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '4rem', fontSize: '1.2rem' }}>
        Select a topic below to start learning.
      </p>
      
      <div className="topic-list">
        {topics.map((topic: Topic) => (
          <Link key={topic.slug} href={`/tutorials/${params.category}/${topic.slug}`} className="glass-panel topic-card">
            <h2>{topic.title}</h2>
            <p>{topic.description}</p>
          </Link>
        ))}
        {topics.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
            More content coming soon!
          </div>
        )}
      </div>
    </div>
  );
}
