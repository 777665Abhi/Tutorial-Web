import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const topics = [
    {
      title: 'Kotlin',
      description: 'Master the modern, concise, and safe programming language used for Android and backend.',
      color: 'var(--kotlin-color)',
      icon: 'K',
      slug: 'kotlin'
    },
    {
      title: 'Android',
      description: 'Build native mobile applications for the worlds most popular operating system.',
      color: 'var(--android-color)',
      icon: '🤖',
      slug: 'android'
    },
    {
      title: 'Flutter',
      description: 'Create beautiful, natively compiled applications for mobile, web, and desktop from a single codebase.',
      color: 'var(--flutter-color)',
      icon: 'F',
      slug: 'flutter'
    },
    {
      title: 'Java',
      description: 'Learn the robust, object-oriented language that powers enterprise software globally.',
      color: 'var(--java-color)',
      icon: '☕',
      slug: 'java'
    },
    {
      title: 'Data Structures',
      description: 'Master core CS fundamentals, algorithms, and problem-solving patterns.',
      color: 'var(--dsa-color)',
      icon: '🧠',
      slug: 'dsa'
    },
    {
      title: 'Python',
      description: 'Learn Python programming, from basics to machine learning and web frameworks.',
      color: 'var(--python-color)',
      icon: '🐍',
      slug: 'python'
    }
  ];

  const interviewTopics = [
    {
      title: 'Kotlin Interview Qs',
      description: 'Frequently asked Kotlin questions to ace your next backend or mobile interview.',
      color: 'var(--kotlin-color)',
      icon: '💬',
      slug: 'kotlin-interview'
    },
    {
      title: 'Android Interview Qs',
      description: 'Top Android architecture, lifecycle, and Jetpack Compose questions.',
      color: 'var(--android-color)',
      icon: '💬',
      slug: 'android-interview'
    },
    {
      title: 'Flutter Interview Qs',
      description: 'Essential questions on Dart, state management, and widget lifecycle.',
      color: 'var(--flutter-color)',
      icon: '💬',
      slug: 'flutter-interview'
    },
    {
      title: 'Java Interview Qs',
      description: 'Core Java, multithreading, and OOP concepts for enterprise interviews.',
      color: 'var(--java-color)',
      icon: '💬',
      slug: 'java-interview'
    },
    {
      title: 'DSA Interview Qs',
      description: 'Ace technical rounds with top Data Structures and Algorithms questions.',
      color: 'var(--dsa-color)',
      icon: '💬',
      slug: 'dsa-interview'
    },
    {
      title: 'Python Interview Qs',
      description: 'Prepare for data science, backend, and automation Python interviews.',
      color: 'var(--python-color)',
      icon: '💬',
      slug: 'python-interview'
    }
  ];

  return (
    <div className="animate-fade-in">
      <section className={styles.hero}>
        <div className={styles.heroBackground}></div>
        <h1 className={styles.title}>
          Master <span className="text-gradient">Modern Tech</span>
        </h1>
        <p className={styles.subtitle}>
          Premium, in-depth tutorials for Kotlin, Java, Android, and Flutter. Elevate your development skills with our comprehensive guides.
        </p>
        <div className="flex gap-4">
          <Link href="#topics" className="btn btn-primary">Start Learning</Link>
          <Link href="#interviews" className="btn btn-secondary">Prep for Interviews</Link>
        </div>
      </section>

      <div className="container" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '-2rem' }}>Learning Paths</h2>
      </div>
      <section id="topics" className={styles.grid}>
        {topics.map((topic) => (
          <Link 
            key={topic.slug}
            href={`/tutorials/${topic.slug}`}
            className={`glass-panel ${styles.card}`}
            style={{ '--card-color': topic.color } as React.CSSProperties}
          >
            <div className={styles.cardIcon} style={{ color: topic.color }}>
              {topic.icon}
            </div>
            <h2 className={styles.cardTitle}>{topic.title}</h2>
            <p className={styles.cardDesc}>{topic.description}</p>
          </Link>
        ))}
      </section>

      <div className="container" style={{ marginTop: '2rem' }}>
        <h2 id="interviews" style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '-2rem' }}>Interview Preparation</h2>
      </div>
      <section className={styles.grid}>
        {interviewTopics.map((topic) => (
          <Link 
            key={topic.slug}
            href={`/tutorials/${topic.slug}`}
            className={`glass-panel ${styles.card}`}
            style={{ '--card-color': topic.color } as React.CSSProperties}
          >
            <div className={styles.cardIcon} style={{ color: topic.color }}>
              {topic.icon}
            </div>
            <h2 className={styles.cardTitle}>{topic.title}</h2>
            <p className={styles.cardDesc}>{topic.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
