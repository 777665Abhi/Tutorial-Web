import type { Metadata } from "next";
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
            <a href="/">Home</a>
            <a href="/tutorials/android">Android</a>
            <a href="/tutorials/kotlin">Kotlin</a>
            <a href="/tutorials/flutter">Flutter</a>
            <a href="/tutorials/java">Java</a>
          </div>
          <div>
            <a href="#" className="btn btn-primary">Login</a>
          </div>
        </nav>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
