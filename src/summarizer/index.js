// src/summarizer/index.js
const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function summarizeContent(text, length = 'medium', language = 'en', metaDescription = '') {
  if (!OPENAI_API_KEY) {
    // Fallback mock
    return metaDescription || `Summary (${length}, ${language}): ${text.slice(0, 30)}...`;
  }

  // Define prompt de acordo com o tamanho e idioma
  let prompt = '';
  if (length === 'short') prompt = `Summarize the following text in 1 sentence in ${language === 'en' ? 'English' : language} (do not use any other language):`;
  else if (length === 'medium') prompt = `Summarize the following text in 3 sentences in ${language === 'en' ? 'English' : language} (do not use any other language):`;
  else prompt = `Write a detailed summary of the following text in ${language === 'en' ? 'English' : language} (do not use any other language):`;

  async function callLLM() {
    return axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: `You are a helpful assistant that summarizes web page content. Always answer in ${language === 'en' ? 'English' : language}.` },
          { role: 'user', content: `${prompt}\n\n${text}` },
        ],
        max_tokens: 512,
        temperature: 0.5,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
  }

  try {
    let response;
    try {
      response = await callLLM();
    } catch (err) {
      console.warn('[summarizer] First LLM call failed, retrying in 2s...', err?.response?.data || err.message);
      await sleep(2000);
      response = await callLLM();
    }
    const summary = response.data.choices?.[0]?.message?.content?.trim();
    return summary || (metaDescription || `Summary (${length}, ${language}): ${text.slice(0, 30)}...`);
  } catch (err) {
    console.error('[summarizer] LLM failed twice, using meta description or fallback.', err?.response?.data || err.message);
    return metaDescription || `Summary (${length}, ${language}): ${text.slice(0, 30)}...`;
  }
}

module.exports = { summarizeContent }; 