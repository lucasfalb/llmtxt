// src/controllers/generateController.js

const { crawlSitemap } = require('../crawler');
const { scrapePage } = require('../scraper');
const { summarizeContent } = require('../summarizer');
const { generateMarkdown } = require('../generator');
const Bottleneck = require('bottleneck');
const { URL } = require('url');

const SCRAPE_CONCURRENCY = 5;

module.exports = async (req, res) => {
  let { sitemap_url, summary_length, language, limit } = req.body;
  language = language || 'en';
  limit = limit ? parseInt(limit, 10) : undefined;

  console.log('[generate] Start processing');
  console.log('[generate] Received params:', { sitemap_url, summary_length, language, limit });

  if (!sitemap_url || !['short', 'medium', 'long'].includes(summary_length)) {
    console.log('[generate] Invalid parameters');
    return res.status(400).json({ error: 'Invalid parameters.' });
  }

  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', 'attachment; filename="llms.txt"');

  try {
    // 1. Crawler: get URLs
    console.log('[generate] Crawling sitemap:', sitemap_url);
    let urls = await crawlSitemap(sitemap_url);
    console.log(`[generate] Total URLs found: ${urls.length}`);
    if (limit && urls.length > limit) {
      urls = urls.slice(0, limit);
      console.log(`[generate] Limiting to first ${limit} URLs.`);
    }
    if (!urls.length) throw new Error('No URLs found in sitemap.');

    // 2. Scraper + Summarizer: processar páginas em paralelo com limitação
    const limiter = new Bottleneck({ maxConcurrent: SCRAPE_CONCURRENCY });
    const results = await Promise.allSettled(
      urls.map((url, idx) => limiter.schedule(async () => {
        console.log(`[generate] [${idx+1}/${urls.length}] Fazendo scrape: ${url}`);
        const page = await scrapePage(url);
        let metaDescription = '';
        if (page.contentHtml) {
          try {
            const cheerio = require('cheerio');
            const $ = cheerio.load(page.contentHtml);
            metaDescription = $('meta[name="description"]').attr('content') || '';
          } catch {}
        }
        if (page.error || !page.content) {
          console.log(`[generate] [${idx+1}/${urls.length}] Falha no scrape: ${url}`);
          return { url, error: true };
        }
        console.log(`[generate] [${idx+1}/${urls.length}] Conteúdo extraído (${page.content.length} chars)`);
        const summary = await summarizeContent(page.content, summary_length, language, metaDescription);
        console.log(`[generate] [${idx+1}/${urls.length}] Resumo gerado (${summary.length} chars)`);
        return { url, title: page.title, summary, content: page.content, contentHtml: page.contentHtml };
      }))
    );
    // Coletar todos os docs válidos
    const docs = [];
    let siteName = '';
    let siteDescription = '';
    let firstValid = null;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && !r.value.error) {
        if (!firstValid) firstValid = r.value;
        docs.push(r.value);
      } else {
        console.log(`[generate] [${i+1}/${results.length}] Página ignorada por erro.`);
      }
    });
    // Extrair nome e descrição do site da primeira página válida
    if (firstValid) {
      siteName = firstValid.title || 'Site';
      // Prioriza <meta name="description"> se disponível
      let metaDescription = '';
      try {
        const cheerio = require('cheerio');
        const $ = cheerio.load(firstValid.contentHtml || '');
        metaDescription = $('meta[name="description"]').attr('content') || '';
      } catch {}
      if (metaDescription) {
        siteDescription = metaDescription;
        console.log('[generate] Descrição do site extraída de <meta name="description">:', siteDescription);
      } else {
        siteDescription = firstValid.content ? firstValid.content.slice(0, 200) : '';
        if (siteDescription.length === 200) siteDescription += '...';
        console.log('[generate] Descrição do site extraída do conteúdo:', siteDescription);
      }
      console.log('[generate] Nome do site extraído:', siteName);
    } else {
      siteName = 'Site';
      siteDescription = '';
    }

    // 3. Gerador de Markdown
    const now = new Date();
    const lastUpdated = now.toISOString().slice(0, 10);
    let siteUrl = '';
    try {
      siteUrl = new URL(sitemap_url).origin;
    } catch { siteUrl = sitemap_url; }
    console.log(`[generate] Gerando markdown para ${docs.length} links.`);
    const markdown = generateMarkdown({
      lastUpdated,
      siteUrl,
      siteName,
      siteDescription,
      docs
    });
    res.write(markdown);
    res.end();
    console.log('[generate] Markdown enviado via streaming. Processo concluído.');
  } catch (err) {
    if (err.message && (err.message.includes('sitemap') || err.message.includes('Sitemap'))) {
      console.error('[generate] Sitemap error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    console.error('[generate] Internal error:', err);
    res.status(500).json({ error: 'Internal server error while generating file.' });
  }
}; 