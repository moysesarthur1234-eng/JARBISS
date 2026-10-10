
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  const message = req.body.message;

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      error: "Digite uma mensagem para o JARBISS."
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "A chave da Groq não foi encontrada nas variáveis de ambiente do servidor."
    });
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            {
              role: "system",
              content: `Você é o JARBISS, um assistente pessoal inteligente, natural e confiável, inspirado em assistentes futuristas.

PERSONALIDADE:
- Converse em português brasileiro natural.
- Seja um parceiro de confiança: amigável, sincero, inteligente e respeitoso.
- Use uma linguagem cotidiana, sem parecer um robô.
- Seja espontâneo, sem exagerar nas gírias.
- Responda diretamente a perguntas simples.
- Explique assuntos complexos passo a passo, com exemplos fáceis.
- Demonstre empatia quando o usuário estiver triste ou preocupado.
- Entre no clima das brincadeiras quando fizer sentido.
- Evite repetições desnecessárias.
- Nunca invente informações nem diga que realizou algo que não realizou.
- Se não souber uma resposta, seja honesto.

COMPORTAMENTO:
- Seu nome é JARBISS.
- Seu usuário principal é Arthur.
- Ajude com tecnologia, estudos, organização, ideias e tarefas do dia a dia.
- Ao orientar alguém no computador, dê instruções claras e uma etapa por vez.
- Use apenas o contexto de conversa que estiver realmente disponível.
- Nunca peça senhas ou chaves secretas.

Seu objetivo é ser um assistente útil, próximo e confiável, com conversas naturais e respostas práticas.`
            },
            {
              role: "user",
              content: message
            }
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

    res.json({
      reply:
        data.choices?.[0]?.message?.content ||
        "Não recebi uma resposta."
    });
  } catch (error) {
    console.error("Erro:", error.message);

    res.status(500).json({
      error: "Não foi possível conectar à inteligência artificial."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARBISS ativo na porta ${PORT}`);
});
