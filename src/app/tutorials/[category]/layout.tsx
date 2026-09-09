import Link from 'next/link';
import { getTopicsForCategory, Topic } from '@/lib/content';

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { category: string };
}) {
  const topics = getTopicsForCategory(params.category);
  
  const formatCategoryName = (cat: string) => {
    return cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="container" style={{ display: 'flex', gap: '2rem', marginTop: '2rem', minHeight: 'calc(100vh - 100px)' }}>
      {/* Left Sidebar Curriculum (Glass) */}
      <aside className="glass-panel" style={{ width: '280px', padding: '2rem 1rem', position: 'sticky', top: '100px', height: 'max-content', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
        <h3 className="text-gradient" style={{ marginBottom: '1.5rem', paddingLeft: '1rem', fontSize: '1.2rem' }}>
          {formatCategoryName(params.category)}
        </h3>
        <ul style={{ listStyle: 'none' }}>
          <li>
            <Link href={`/tutorials/${params.category}`} className="sidebar-link">
              Course Home
            </Link>
          </li>
          {topics.map((topic: Topic) => (
            <li key={topic.slug}>
              <Link href={`/tutorials/${params.category}/${topic.slug}`} className="sidebar-link">
                {topic.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
