// src/generator/index.js

function generateMarkdown({ lastUpdated, siteUrl, siteName, siteDescription, docs, optional }) {
  // Junta todos os docs em uma lista única
  const allDocs = [...docs, ...(optional || [])];

  let md = `# Last updated: ${lastUpdated}\n`;
  md += `# Website: ${siteUrl}\n\n`;
  md += `${siteName}\n`;
  if (siteDescription) md += `> ${siteDescription}\n`;

  if (allDocs.length) {
    md += `\n## Links\n`;
    for (const doc of allDocs) {
      md += `- [${doc.title}](${doc.url}): ${doc.summary}\n`;
    }
  }
  return md;
}

module.exports = { generateMarkdown }; 