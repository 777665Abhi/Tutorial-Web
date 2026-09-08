import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechMastery | Coding Practice & Tutorials",
  description: "Learn modern technologies with structured, easy-to-follow tutorials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav className="top-navbar">
          <div style={{ fontWeight: 800, fontSize: '1.5rem', fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            <span className="text-gradient" style={{ marginRight: '0.25rem' }}>Tech</span>Mastery
          </div>
          <div className="nav-links flex gap-2">
            <Link href="/">Home</Link>
            <Link href="/tutorials/android">Android</Link>
            <Link href="/tutorials/kotlin">Kotlin</Link>
            <Link href="/tutorials/flutter">Flutter</Link>
            <Link href="/tutorials/java">Java</Link>
            <Link href="/tutorials/dsa">DSA</Link>
            <Link href="/tutorials/python">Python</Link>
          </div>
          <div>
            <Link href="#" className="btn btn-primary">Login</Link>
          </div>
        </nav>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
