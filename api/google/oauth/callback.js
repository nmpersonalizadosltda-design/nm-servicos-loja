function criarPaginaHtml({ titulo, conteudo }) {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${titulo}</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #fff1f7;
            color: #251622;
            font-family: Arial, sans-serif;
          }

          main {
            width: min(760px, calc(100% - 32px));
            background: #fff;
            border: 1px solid #f6bfd7;
            border-radius: 24px;
            padding: 28px;
            box-shadow: 0 20px 50px rgba(236, 25, 113, 0.12);
          }

          h1 {
            margin: 0 0 12px;
            color: #ec1971;
            font-size: 28px;
          }

          p {
            font-size: 16px;
            line-height: 1.5;
          }

          textarea {
            width: 100%;
            min-height: 160px;
            border: 1px solid #f6bfd7;
            border-radius: 16px;
            padding: 14px;
            font-family: monospace;
            font-size: 13px;
            box-sizing: border-box;
          }

          .aviso {
            background: #fff1f7;
            border: 1px solid #f6bfd7;
            border-radius: 16px;
            padding: 14px;
            margin: 18px 0;
            font-weight: 700;
          }

          .erro {
            color: #b00020;
            font-weight: 800;
          }

          code {
            background: #fff1f7;
            padding: 3px 6px;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <main>
          ${conteudo}
        </main>
      </body>
    </html>
  `;
}

export default async function handler(req, res) {
  const code = req.query?.code;
  const error = req.query?.error;

  if (error) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(400).send(
      criarPaginaHtml({
        titulo: "Erro na autorização",
        conteudo: `
          <h1>Autorização cancelada</h1>
          <p class="erro">O Google retornou este erro: ${error}</p>
          <p>Feche esta aba e tente autorizar novamente pelo Admin.</p>
        `,
      })
    );
  }

  if (!code) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(400).send(
      criarPaginaHtml({
        titulo: "Código não encontrado",
        conteudo: `
          <h1>Código não encontrado</h1>
          <p class="erro">O Google não enviou o código de autorização.</p>
          <p>Volte e tente novamente.</p>
        `,
      })
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(
      criarPaginaHtml({
        titulo: "Configuração incompleta",
        conteudo: `
          <h1>Configuração incompleta</h1>
          <p class="erro">Faltam variáveis do Google na Vercel.</p>
          <p>Confira se existem:</p>
          <p><code>GOOGLE_CLIENT_ID</code></p>
          <p><code>GOOGLE_CLIENT_SECRET</code></p>
          <p><code>GOOGLE_REDIRECT_URI</code></p>
        `,
      })
    );
  }

  try {
    const resposta = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(500).send(
        criarPaginaHtml({
          titulo: "Erro ao trocar código",
          conteudo: `
            <h1>Erro ao autorizar Google</h1>
            <p class="erro">O Google recusou a troca do código.</p>
            <div class="aviso">
              ${dados.error || "Erro desconhecido"}<br />
              ${dados.error_description || ""}
            </div>
            <p>Provavelmente algum redirect URI está diferente no Google Cloud ou na Vercel.</p>
          `,
        })
      );
    }

    const refreshToken = dados.refresh_token;

    if (!refreshToken) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(
        criarPaginaHtml({
          titulo: "Autorizado sem refresh token",
          conteudo: `
            <h1>Autorizou, mas faltou o refresh token</h1>
            <p>O Google autorizou, mas não enviou o <code>refresh_token</code>.</p>
            <div class="aviso">
              Isso pode acontecer quando a conta já autorizou esse app antes.
            </div>
            <p>Depois a gente força uma nova autorização com consentimento. Porque claro, o Google precisava guardar drama para o final.</p>
          `,
        })
      );
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(
      criarPaginaHtml({
        titulo: "Google autorizado",
        conteudo: `
          <h1>Google autorizado com sucesso ✅</h1>
          <p>Copie o código abaixo. Ele será salvo na Vercel como <strong>GOOGLE_REFRESH_TOKEN</strong>.</p>

          <div class="aviso">
            Não mande print mostrando esse código. Ele é uma chave de acesso da sua conta Google Empresa.
          </div>

          <textarea readonly>${refreshToken}</textarea>

          <p>Depois de copiar, pode fechar esta aba.</p>
        `,
      })
    );
  } catch (erro) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(
      criarPaginaHtml({
        titulo: "Erro inesperado",
        conteudo: `
          <h1>Erro inesperado</h1>
          <p class="erro">${erro.message}</p>
          <p>O OAuth tropeçou no próprio cadarço. Acontece mais do que deveria.</p>
        `,
      })
    );
  }
}