
Backend Node.js pronto para transformar qualquer site em documentação resumida, organizada e pronta para LLMs — tudo via um endpoint simples e streaming. Ideal para quem quer criar integrações, chatbots, ou documentações automáticas a partir de qualquer domínio!

## O que este projeto faz?
- Recebe a URL de um sitemap.xml de qualquer site.
- Faz crawling de todas as páginas, respeitando robots.txt e limites de requisições.
- Extrai o conteúdo principal de cada página (ignorando menus, footers, scripts, etc).
- Resume cada página usando uma LLM (OpenAI, Claude, Mistral, etc).
- Gera um arquivo Markdown com todos os links e resumos sob a seção única `## Links`, pronto para ser consumido por LLMs ou humanos.
- Tudo isso via streaming HTTP, sem mensagens de progresso intermediárias — apenas o Markdown final.

## Por que usar?
- **Automatize a documentação** do seu produto, SaaS, API ou site institucional.
- **Alimente chatbots** com contexto real e atualizado do seu site.
- **Gere resumos em múltiplos idiomas** para internacionalização.
- **Facilite onboarding** de novos devs ou clientes com documentação sempre atualizada.

## Como funciona o fluxo?
1. Você faz um POST para `/generate` com a URL do sitemap e suas preferências.
2. O backend responde com o arquivo Markdown completo, pronto para download ou uso direto no frontend.

---

## Instalação e Configuração

1. **Clone o projeto e instale as dependências:**
   ```bash
   git clone ...
   cd llmtxt
   npm install
   ```
2. **Crie um arquivo `.env` na raiz do projeto:**
   ```env
   # OpenAI
   OPENAI_API_KEY=sua_api_key_openai
   OPENAI_MODEL=gpt-4o
   PORT=3000
   ```
3. **Rode o servidor:**
   - Para desenvolvimento: `npm run dev`
   - Para produção: `node index.js`

---

## Como usar o endpoint `/generate`

Envie um POST para `/generate` com um JSON assim:
```json
{
  "sitemap_url": "https://dominio.com/sitemap.xml",
  "summary_length": "medium",
  "language": "en",
  "limit": 20
}
```

**Parâmetros principais:**
- `sitemap_url`: URL do sitemap.xml do seu site.
- `summary_length`: "short", "medium" ou "long" — escolha o tamanho do resumo.
- `language`: Idioma dos resumos (ex: "en", "pt", "es").
- `limit`: (opcional) Limite de páginas a processar.

**O que você recebe:**
- Um arquivo Markdown completo, pronto para download ou uso, sempre chamado `llms.txt`.

---

## Exemplo de integração com frontend

```js
const response = await fetch('http://localhost:3000/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sitemap_url: 'https://dominio.com/sitemap.xml',
    summary_length: 'medium',
    language: 'en',
    limit: 10
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let markdown = '';
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  markdown += chunk;
}
console.log('Markdown final:', markdown);
```
---

## Dicas e Observações
- O backend suporta milhares de URLs, mas use `limit` para evitar sobrecarga.
- O idioma do resumo pode ser alterado via `language` (ex: "pt", "es", "fr").
- O output é agrupado por categoria (Links) e pronto para LLMs.
- Em caso de erro, a resposta será um JSON com a chave `error` e status HTTP apropriado.
- O projeto é extensível: adicione novas LLMs, cache, métricas, healthcheck, etc.

---

## Roadmap e próximos passos
- Testes automatizados (unitários e integração)
- Cache de resumos para acelerar respostas
- Healthcheck e métricas para produção
- Documentação OpenAPI/Swagger
- Deploy CI/CD

---

**Contribua, use, adapte!**
Se tiver dúvidas, sugestões ou quiser integrar com seu frontend, só abrir uma issue ou PR. Este projeto é para facilitar a vida de quem quer automatizar documentação e contexto para LLMs de forma simples e moderna. 