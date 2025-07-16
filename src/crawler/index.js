// src/crawler/index.js
const axios = require('axios');
const xml2js = require('xml2js');
const Bottleneck = require('bottleneck');
const { URL } = require('url');

const limiter = new Bottleneck({
  minTime: 200, // 5 req/s
  maxConcurrent: 2,
});

async function fetchXml(url) {
  const res = await limiter.schedule(() => axios.get(url, { timeout: 15000 }));
  return res.data;
}

async function parseSitemap(xml, sitemapUrl) {
  try {
    const parsed = await xml2js.parseStringPromise(xml);
    if (parsed.urlset && parsed.urlset.url) {
      // Simple sitemap
      return parsed.urlset.url.map(u => u.loc[0]);
    } else if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
      // Sitemap index
      return parsed.sitemapindex.sitemap.map(s => s.loc[0]);
    }
    return [];
  } catch (err) {
    // Log part of the XML for debug
    console.error('[crawler] Error parsing sitemap XML:', sitemapUrl);
    console.error('[crawler] First 500 chars of XML:', xml.slice(0, 500));
    throw new Error('The provided sitemap is not valid XML or is corrupted. Please check the URL or provide a valid sitemap.');
  }
}

async function getAllUrlsFromSitemap(sitemapUrl, visited = new Set()) {
  if (visited.has(sitemapUrl)) return [];
  visited.add(sitemapUrl);
  let xml;
  try {
    xml = await fetchXml(sitemapUrl);
  } catch (e) {
    throw new Error('Could not download the sitemap. Please check the URL or your connectivity.');
  }
  const urls = await parseSitemap(xml, sitemapUrl);
  // If it's a sitemap index, fetch recursively
  if (urls.length && urls[0].endsWith('.xml')) {
    let all = [];
    for (const u of urls) {
      const sub = await getAllUrlsFromSitemap(u, visited);
      all = all.concat(sub);
    }
    return all;
  }
  return urls;
}

async function isAllowedByRobots(url) {
  try {
    const { origin } = new URL(url);
    const robotsUrl = origin + '/robots.txt';
    const res = await axios.get(robotsUrl, { timeout: 10000 });
    const lines = res.data.split('\n');
    const path = new URL(url).pathname;
    let userAgentAll = false;
    let allowed = true;
    for (const line of lines) {
      if (/^User-agent:\s*\*/i.test(line)) userAgentAll = true;
      if (userAgentAll && /^Disallow:/i.test(line)) {
        const disallowPath = line.split(':')[1].trim();
        if (disallowPath && path.startsWith(disallowPath)) allowed = false;
      }
      if (/^User-agent:/i.test(line) && !/^User-agent:\s*\*/i.test(line)) userAgentAll = false;
    }
    return allowed;
  } catch {
    return true; // If robots.txt can't be read, allow
  }
}

async function crawlSitemap(sitemapUrl) {
  const allUrls = await getAllUrlsFromSitemap(sitemapUrl);
  // Filter by robots.txt
  const filtered = [];
  for (const url of allUrls) {
    if (await isAllowedByRobots(url)) filtered.push(url);
  }
  return filtered;
}

module.exports = { crawlSitemap }; 