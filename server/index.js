const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const app = express();
const PORT = 3005;

app.use(cors());

// Helper: Get content directory
const getContentDir = (category) => path.join(__dirname, 'content', category);

// Cache for category metadata to improve performance
const metadataCache = {};

function getCategoryMetadata(category, contentDir) {
  const files = fs.readdirSync(contentDir).filter(file => file.endsWith('.md'));
  
  // Calculate max modification time to invalidate cache if any file changes
  let maxMtime = 0;
  for (const file of files) {
    const stat = fs.statSync(path.join(contentDir, file));
    if (stat.mtimeMs > maxMtime) {
      maxMtime = stat.mtimeMs;
    }
  }

  // Return cached topics if valid
  if (metadataCache[category] && metadataCache[category].mtime === maxMtime) {
    return metadataCache[category].topics;
  }

  // Otherwise, read and parse all files
  const topics = files.map(file => {
    const fileContent = fs.readFileSync(path.join(contentDir, file), 'utf8');
    const { data } = matter(fileContent);
    return {
      slug: file.replace('.md', ''),
      title: data.title || file.replace('.md', ''),
      description: data.description || ''
    };
  });
  
  metadataCache[category] = {
    mtime: maxMtime,
    topics
  };
  
  return topics;
}

// Endpoint 1: Get all topics for a category (for listing and sidebar)
app.get('/api/categories/:category', (req, res) => {
  const { category } = req.params;
  const contentDir = getContentDir(category);
  
  if (!fs.existsSync(contentDir)) {
    return res.status(404).json({ error: 'Category not found' });
  }

  try {
    const topics = getCategoryMetadata(category, contentDir);
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read category topics' });
  }
});

// Endpoint 2: Get specific tutorial content and navigation (prev/next)
app.get('/api/categories/:category/:slug', (req, res) => {
  const { category, slug } = req.params;
  const contentDir = getContentDir(category);
  const filePath = path.join(contentDir, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Tutorial not found' });
  }

  try {
    // 1. Read the requested file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    // 2. Determine Next/Prev for pagination using cached metadata
    const topics = getCategoryMetadata(category, contentDir);
    
    const currentIndex = topics.findIndex(t => t.slug === slug);
    const prev = currentIndex > 0 ? { slug: topics[currentIndex - 1].slug, title: topics[currentIndex - 1].title } : null;
    const next = currentIndex < topics.length - 1 ? { slug: topics[currentIndex + 1].slug, title: topics[currentIndex + 1].title } : null;

    res.json({
      title: data.title || slug,
      description: data.description || '',
      content: content,
      navigation: { prev, next }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read tutorial content' });
  }
});

app.listen(PORT, () => {
  console.log(`Tutorials Content Backend API is running on http://localhost:${PORT}`);
});
