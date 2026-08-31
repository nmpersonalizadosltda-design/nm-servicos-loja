export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return res.status(500).json({
      ok: false,
      error: "Faltam variáveis do Google na Vercel.",
      missing: {
        GOOGLE_CLIENT_ID: !clientId,
        GOOGLE_CLIENT_SECRET: !clientSecret,
        GOOGLE_REFRESH_TOKEN: !refreshToken,
      },
    });
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(500).json({
        ok: false,
        etapa: "gerar_access_token",
        error: tokenData,
      });
    }

    const accessToken = tokenData.access_token;

    const accountsResponse = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const accountsData = await accountsResponse.json();

    if (!accountsResponse.ok) {
      return res.status(500).json({
        ok: false,
        etapa: "buscar_contas_google_empresa",
        error: accountsData,
      });
    }

    const contas = accountsData.accounts || [];

    return res.status(200).json({
      ok: true,
      mensagem: "Conexão com Google Empresa funcionando.",
      total_contas: contas.length,
      contas: contas.map((conta) => ({
        name: conta.name,
        accountName: conta.accountName,
        type: conta.type,
        verificationState: conta.verificationState,
      })),
    });
  } catch (erro) {
    return res.status(500).json({
      ok: false,
      etapa: "erro_inesperado",
      error: erro.message,
    });
  }
}