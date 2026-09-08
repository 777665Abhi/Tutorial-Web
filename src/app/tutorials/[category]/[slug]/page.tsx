import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import './tutorial.css';

async function getTutorialData(category: string, slug: string) {
  try {
    const res = await fetch(`http://127.0.0.1:3005/api/categories/${category}/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function TutorialPage({ params }: { params: { category: string, slug: string } }) {
  const data = await getTutorialData(params.category, params.slug);
  
  if (!data) {
    notFound();
  }

  const { prev, next } = data.navigation;
  
  const formatCategoryName = (cat: string) => {
    return cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  return (
    <article className="tutorial-content glass-panel" style={{ padding: '3rem 4rem', maxWidth: '1000px', margin: '0 auto', borderRadius: '24px' }}>
      
      {/* Breadcrumbs */}
      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', backgroundColor: '#F8F9FA', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
        <Link href="/">Home</Link> &gt;{' '}
        <Link href={`/tutorials/${params.category}`}>{formatCategoryName(params.category)}</Link> &gt;{' '}
        <span style={{ color: '#000', fontWeight: 600 }}>{data.title}</span>
      </div>

      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#000' }}>{data.title}</h1>
      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0 2rem 0' }} />
      
      {/* Markdown Content */}
      <div className="markdown-body">
        <ReactMarkdown>{data.content}</ReactMarkdown>
      </div>
      
      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '3rem 0 2rem 0' }} />

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {prev ? (
          <Link href={`/tutorials/${params.category}/${prev.slug}`} className="btn btn-secondary">
            &larr; Previous Page
          </Link>
        ) : <div />}
        
        {next ? (
          <Link href={`/tutorials/${params.category}/${next.slug}`} className="btn btn-primary">
            Next Page &rarr;
          </Link>
        ) : <div />}
      </div>
    </article>
  );
}
