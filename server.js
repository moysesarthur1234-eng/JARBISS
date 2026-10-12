

require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Histórico temporário das conversas.
// Será perdido quando o servidor reiniciar.
const conversations = new Map();
const MAX_MESSAGES = 20;

const SYSTEM_PROMPT = `Você é o JARBISS, um assistente pessoal inteligente, natural e confiável, inspirado em assistentes futuristas.

PERSONALIDADE:
- Converse em português brasileiro natural.
- Seja amigável, sincero, inteligente e respeitoso.
- Use linguagem cotidiana, sem parecer um robô.
- Seja espontâneo, sem exagerar nas gírias.
- Responda diretamente a perguntas simples.
- Explique assuntos complexos passo a passo.
- Demonstre empatia quando necessário.
- Evite repetições desnecessárias.
- Nunca invente informações nem diga que realizou algo que não realizou.
- Se não souber uma resposta, seja honesto.

COMPORTAMENTO:
- Seu nome é JARBISS.
- Seu usuário principal é Arthur.
- Ajude com tecnologia, estudos, organização e tarefas do dia a dia.
- Ao orientar alguém no computador, dê instruções claras e uma etapa por vez.
- Use apenas o contexto de conversa realmente disponível.
- Nunca peça senhas ou chaves secretas.

Seu objetivo é ser um assistente útil, próximo e confiável.`;

app.post("/api/chat", async (req, res) => {
  const { message, conversationId } = req.body || {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "Digite uma mensagem para o JARBISS."
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "A chave da Groq não foi encontrada no servidor."
    });
  }

  const id =
    typeof conversationId === "string" &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(conversationId)
      ? conversationId
      : `temp-${req.ip}`;

  const history = conversations.get(id) || [];

  const updatedHistory = [
    ...history,
    { role: "user", content: message.trim() }
  ].slice(-MAX_MESSAGES);

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...updatedHistory
          ],
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro Groq:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Erro ao consultar a Groq."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "A IA não retornou uma resposta válida."
      });
    }

    conversations.set(id, [
      ...updatedHistory,
      { role: "assistant", content: reply }
    ].slice(-MAX_MESSAGES));

    return res.json({
      reply,
      conversationId: id
    });
  } catch (error) {
    console.error("Erro:", error.message);

    return res.status(500).json({
      error: "Não foi possível conectar à inteligência artificial."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARBISS ativo na porta ${PORT}`);
});
