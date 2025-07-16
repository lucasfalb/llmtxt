// src/scraper/index.js
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapePage(url) {
  try {
    const { data: html } = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(html);
    const title = $('title').first().text().trim() || url;
    $('script, nav, footer, aside, style, noscript').remove();
    let mainContent = '';
    let maxLen = 0;
    $('body *').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length > maxLen) {
        maxLen = text.length;
        mainContent = text;
      }
    });
    if (!mainContent) mainContent = $('body').text().replace(/\s+/g, ' ').trim();
    return {
      url,
      title,
      content: mainContent.slice(0, 8000),
      contentHtml: html,
    };
  } catch (err) {
    return {
      url,
      title: url,
      content: '',
      contentHtml: '',
      error: true,
    };
  }
}

module.exports = { scrapePage }; 