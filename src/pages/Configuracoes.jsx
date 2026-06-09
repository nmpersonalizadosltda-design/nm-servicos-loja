import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const CONFIG_DOC_ID = "main";

const configuracaoInicial = {
  store_name: "NM Serviços",
  store_subtitle: "Personalizados, papelaria criativa e presentes sob medida",
  business_name: "NM Serviços LTDA",
  cnpj: "51.109.147/0001-55",
  owner_name: "Natália Teixeira Moreira",
  whatsapp: "11999999999",
  instagram: "@nataliat.moreira",
  email: "nataliatmoreira@gmail.com",
  pix_key: "",
  address: "São Paulo/SP",
  logo_url: "",
  banner_url: "",
  primary_color: "#EC1971",
  secondary_color: "#7B1FA2",
  accent_color: "#07313F",
  opening_message:
    "Olá! Seja bem-vindo(a) à NM Serviços. Me conte o que você deseja personalizar e eu te ajudo com carinho.",
  quote_message:
    "Olá! Segue seu orçamento da NM Serviços. Para aprovar, é só responder por aqui.",
  order_message:
    "Olá! Seu pedido foi registrado com sucesso. Vou te atualizando por aqui sobre cada etapa.",
  delivery_message:
    "Olá! Seu pedido está pronto para retirada/entrega. Obrigada por confiar na NM Serviços.",
  show_reviews: true,
  show_prices: true,
  show_whatsapp_button: true,
  allow_catalog_share: true,
  updated_at: null,
};

export default function Configuracoes() {
  const [config, setConfig] = useState(configuracaoInicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState("empresa");

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  async function carregarConfiguracoes() {
    setCarregando(true);

    try {
      const ref = doc(db, "store_settings", CONFIG_DOC_ID);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setConfig({ ...configuracaoInicial, ...snap.data() });
      } else {
        await setDoc(ref, {
          ...configuracaoInicial,
          created_at: new Date(),
          updated_at: new Date(),
        });
        setConfig(configuracaoInicial);
      }
    } catch (erro) {
      console.error(erro);
      alert("Erro ao carregar configurações da loja.");
    } finally {
      setCarregando(false);
    }
  }

  function atualizarCampo(campo, valor) {
    setConfig((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  async function salvarConfiguracoes(e) {
    e.preventDefault();

    if (!config.store_name.trim()) {
      alert("Informe o nome da loja.");
      return;
    }

    if (!config.whatsapp.trim()) {
      alert("Informe o WhatsApp principal.");
      return;
    }

    setSalvando(true);

    try {
      const ref = doc(db, "store_settings", CONFIG_DOC_ID);
      await setDoc(
        ref,
        {
          ...config,
          updated_at: new Date(),
        },
        { merge: true }
      );

      alert("Configurações salvas com sucesso!");
    } catch (erro) {
      console.error(erro);
      alert("Erro ao salvar configurações.");
    } finally {
      setSalvando(false);
    }
  }

  function limparNumero(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function abrirWhatsAppTeste() {
    const telefone = limparNumero(config.whatsapp);

    if (!telefone) {
      alert("Informe um WhatsApp para testar.");
      return;
    }

    window.open(
      `https://wa.me/55${telefone}?text=${encodeURIComponent(config.opening_message || "Olá!")}`,
      "_blank"
    );
  }

  async function copiarTexto(texto) {
    if (!texto) {
      alert("Nada para copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(texto);
      alert("Copiado com sucesso!");
    } catch (erro) {
      console.error(erro);
      alert("Não consegui copiar automaticamente. Copie manualmente.");
    }
  }

  const lojaCompleta = useMemo(() => {
    const campos = [
      config.store_name,
      config.store_subtitle,
      config.whatsapp,
      config.instagram,
      config.email,
      config.address,
    ];

    const preenchidos = campos.filter((item) => String(item || "").trim()).length;
    return Math.round((preenchidos / campos.length) * 100);
  }, [config]);

  const previewMensagem = `Olá! Sou a ${config.store_name || "NM Serviços"}. ${
    config.store_subtitle || "Trabalho com personalizados feitos sob medida."
  }`;

  if (carregando) {
    return (
      <section style={pagina}>
        <div style={carregandoBox}>Carregando configurações...</div>
      </section>
    );
  }

  return (
    <section style={pagina}>
      <div style={topoPagina}>
        <div>
          <span style={tagTopo}>AJUSTES DA LOJA</span>
          <h1 style={tituloPagina}>Configurações</h1>
          <p style={subtituloPagina}>
            Controle os dados da marca, contatos, mensagens e preferências da sua vitrine.
          </p>
        </div>

        <div style={topoAcoes}>
          <button type="button" onClick={abrirWhatsAppTeste} style={botaoSecundarioTopo}>
            Testar WhatsApp
          </button>
          <button type="button" onClick={salvarConfiguracoes} style={botaoPrincipalTopo} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      </div>

      <div style={resumoGrid}>
        <div style={resumoCard}>
          <span>🏪</span>
          <strong>{config.store_name || "Loja sem nome"}</strong>
          <small>Nome exibido na vitrine</small>
        </div>

        <div style={resumoCard}>
          <span>📱</span>
          <strong>{config.whatsapp || "Sem WhatsApp"}</strong>
          <small>Contato principal</small>
        </div>

        <div style={resumoCard}>
          <span>✨</span>
          <strong>{lojaCompleta}%</strong>
          <small>Perfil preenchido</small>
        </div>

        <div style={resumoCardDestaque}>
          <span>⭐</span>
          <strong>{config.show_reviews ? "Ativas" : "Ocultas"}</strong>
          <small>Avaliações na loja</small>
        </div>
      </div>

      <div style={layoutPrincipal}>
        <aside style={menuConfig}>
          {[
            ["empresa", "🏢 Empresa"],
            ["contatos", "📲 Contatos"],
            ["visual", "🎨 Visual"],
            ["mensagens", "💬 Mensagens"],
            ["loja", "🛒 Loja"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              style={aba === id ? menuConfigAtivo : menuConfigBotao}
            >
              {label}
            </button>
          ))}

          <div style={previewMiniCard}>
            <strong>Prévia rápida</strong>
            <p>{previewMensagem}</p>
            <button type="button" onClick={() => copiarTexto(previewMensagem)} style={botaoMiniRosa}>
              Copiar chamada
            </button>
          </div>
        </aside>

        <form onSubmit={salvarConfiguracoes} style={cardFormulario}>
          {aba === "empresa" && (
            <div style={secaoFormulario}>
              <div style={cabecalhoSecao}>
                <span>🏢</span>
                <div>
                  <h2>Dados da empresa</h2>
                  <p>Informações principais usadas na vitrine, mensagens e relatórios.</p>
                </div>
              </div>

              <div style={gridCampos}>
                <Campo label="Nome da loja" obrigatorio>
                  <input
                    value={config.store_name}
                    onChange={(e) => atualizarCampo("store_name", e.target.value)}
                    style={campo}
                    placeholder="Ex: NM Serviços"
                  />
                </Campo>

                <Campo label="Subtítulo da loja">
                  <input
                    value={config.store_subtitle}
                    onChange={(e) => atualizarCampo("store_subtitle", e.target.value)}
                    style={campo}
                    placeholder="Ex: Personalizados criativos sob medida"
                  />
                </Campo>

                <Campo label="Razão social">
                  <input
                    value={config.business_name}
                    onChange={(e) => atualizarCampo("business_name", e.target.value)}
                    style={campo}
                    placeholder="Nome empresarial"
                  />
                </Campo>

                <Campo label="CNPJ">
                  <input
                    value={config.cnpj}
                    onChange={(e) => atualizarCampo("cnpj", e.target.value)}
                    style={campo}
                    placeholder="00.000.000/0000-00"
                  />
                </Campo>

                <Campo label="Responsável">
                  <input
                    value={config.owner_name}
                    onChange={(e) => atualizarCampo("owner_name", e.target.value)}
                    style={campo}
                    placeholder="Nome da responsável"
                  />
                </Campo>

                <Campo label="Endereço / Região">
                  <input
                    value={config.address}
                    onChange={(e) => atualizarCampo("address", e.target.value)}
                    style={campo}
                    placeholder="Ex: Tatuapé - São Paulo/SP"
                  />
                </Campo>
              </div>
            </div>
          )}

          {aba === "contatos" && (
            <div style={secaoFormulario}>
              <div style={cabecalhoSecao}>
                <span>📲</span>
                <div>
                  <h2>Contatos e atendimento</h2>
                  <p>Dados usados nos botões da vitrine, orçamentos e mensagens automáticas.</p>
                </div>
              </div>

              <div style={gridCampos}>
                <Campo label="WhatsApp principal" obrigatorio>
                  <input
                    value={config.whatsapp}
                    onChange={(e) => atualizarCampo("whatsapp", e.target.value)}
                    style={campo}
                    placeholder="11999999999"
                  />
                </Campo>

                <Campo label="Instagram">
                  <input
                    value={config.instagram}
                    onChange={(e) => atualizarCampo("instagram", e.target.value)}
                    style={campo}
                    placeholder="@perfil"
                  />
                </Campo>

                <Campo label="E-mail">
                  <input
                    value={config.email}
                    onChange={(e) => atualizarCampo("email", e.target.value)}
                    style={campo}
                    placeholder="email@dominio.com"
                  />
                </Campo>

                <Campo label="Chave Pix">
                  <input
                    value={config.pix_key}
                    onChange={(e) => atualizarCampo("pix_key", e.target.value)}
                    style={campo}
                    placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  />
                </Campo>
              </div>
            </div>
          )}

          {aba === "visual" && (
            <div style={secaoFormulario}>
              <div style={cabecalhoSecao}>
                <span>🎨</span>
                <div>
                  <h2>Identidade visual</h2>
                  <p>URLs de imagem e cores principais usadas na vitrine e no admin.</p>
                </div>
              </div>

              <div style={gridCampos}>
                <Campo label="URL do logo">
                  <input
                    value={config.logo_url}
                    onChange={(e) => atualizarCampo("logo_url", e.target.value)}
                    style={campo}
                    placeholder="Cole a URL do logo"
                  />
                </Campo>

                <Campo label="URL do banner">
                  <input
                    value={config.banner_url}
                    onChange={(e) => atualizarCampo("banner_url", e.target.value)}
                    style={campo}
                    placeholder="Cole a URL do banner"
                  />
                </Campo>

                <Campo label="Cor principal">
                  <div style={campoComCor}>
                    <input
                      type="color"
                      value={config.primary_color || "#EC1971"}
                      onChange={(e) => atualizarCampo("primary_color", e.target.value)}
                      style={colorPicker}
                    />
                    <input
                      value={config.primary_color}
                      onChange={(e) => atualizarCampo("primary_color", e.target.value)}
                      style={campoSemMargin}
                    />
                  </div>
                </Campo>

                <Campo label="Cor secundária">
                  <div style={campoComCor}>
                    <input
                      type="color"
                      value={config.secondary_color || "#7B1FA2"}
                      onChange={(e) => atualizarCampo("secondary_color", e.target.value)}
                      style={colorPicker}
                    />
                    <input
                      value={config.secondary_color}
                      onChange={(e) => atualizarCampo("secondary_color", e.target.value)}
                      style={campoSemMargin}
                    />
                  </div>
                </Campo>
              </div>

              <div style={previewVisual}>
                <div style={{ ...previewHero, background: `linear-gradient(135deg, ${config.primary_color || "#EC1971"}, ${config.secondary_color || "#7B1FA2"}, ${config.accent_color || "#07313F"})` }}>
                  {config.logo_url ? <img src={config.logo_url} alt="Logo" style={previewLogo} /> : <div style={previewLogoVazio}>NM</div>}
                  <div>
                    <strong>{config.store_name || "NM Serviços"}</strong>
                    <p>{config.store_subtitle || "Personalizados sob medida"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {aba === "mensagens" && (
            <div style={secaoFormulario}>
              <div style={cabecalhoSecao}>
                <span>💬</span>
                <div>
                  <h2>Mensagens padrão</h2>
                  <p>Textos usados para atendimento, pedidos, orçamentos e entrega.</p>
                </div>
              </div>

              <Campo label="Mensagem inicial">
                <textarea
                  value={config.opening_message}
                  onChange={(e) => atualizarCampo("opening_message", e.target.value)}
                  style={textarea}
                  placeholder="Mensagem de boas-vindas"
                />
              </Campo>

              <Campo label="Mensagem de orçamento">
                <textarea
                  value={config.quote_message}
                  onChange={(e) => atualizarCampo("quote_message", e.target.value)}
                  style={textarea}
                  placeholder="Mensagem enviada com orçamento"
                />
              </Campo>

              <Campo label="Mensagem de pedido">
                <textarea
                  value={config.order_message}
                  onChange={(e) => atualizarCampo("order_message", e.target.value)}
                  style={textarea}
                  placeholder="Mensagem enviada após criar pedido"
                />
              </Campo>

              <Campo label="Mensagem de entrega">
                <textarea
                  value={config.delivery_message}
                  onChange={(e) => atualizarCampo("delivery_message", e.target.value)}
                  style={textarea}
                  placeholder="Mensagem para pedido pronto/entregue"
                />
              </Campo>
            </div>
          )}

          {aba === "loja" && (
            <div style={secaoFormulario}>
              <div style={cabecalhoSecao}>
                <span>🛒</span>
                <div>
                  <h2>Preferências da loja</h2>
                  <p>Controle o que aparece ou não na vitrine pública.</p>
                </div>
              </div>

              <div style={togglesGrid}>
                <ToggleCard
                  titulo="Exibir avaliações"
                  descricao="Mostra depoimentos aprovados na loja quando integrarmos a vitrine."
                  ativo={config.show_reviews}
                  onClick={() => atualizarCampo("show_reviews", !config.show_reviews)}
                />

                <ToggleCard
                  titulo="Exibir preços"
                  descricao="Mostra o preço dos produtos no catálogo público."
                  ativo={config.show_prices}
                  onClick={() => atualizarCampo("show_prices", !config.show_prices)}
                />

                <ToggleCard
                  titulo="Botão de WhatsApp"
                  descricao="Ativa o botão direto para atendimento na vitrine."
                  ativo={config.show_whatsapp_button}
                  onClick={() => atualizarCampo("show_whatsapp_button", !config.show_whatsapp_button)}
                />

                <ToggleCard
                  titulo="Compartilhamento do catálogo"
                  descricao="Permite copiar link e divulgar a vitrine com facilidade."
                  ativo={config.allow_catalog_share}
                  onClick={() => atualizarCampo("allow_catalog_share", !config.allow_catalog_share)}
                />
              </div>
            </div>
          )}

          <div style={rodapeFormulario}>
            <button type="button" onClick={carregarConfiguracoes} style={botaoCancelar}>
              Recarregar
            </button>
            <button type="submit" style={botaoSalvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Campo({ label, obrigatorio, children }) {
  return (
    <label style={campoBox}>
      <span style={labelCampo}>{label} {obrigatorio && <b>*</b>}</span>
      {children}
    </label>
  );
}

function ToggleCard({ titulo, descricao, ativo, onClick }) {
  return (
    <button type="button" onClick={onClick} style={ativo ? toggleCardAtivo : toggleCard}>
      <div>
        <strong>{titulo}</strong>
        <p>{descricao}</p>
      </div>
      <span style={ativo ? toggleBolinhaAtiva : toggleBolinha}>{ativo ? "✓" : ""}</span>
    </button>
  );
}

const pagina = {
  width: "100%",
  maxWidth: "1500px",
  margin: "0 auto",
  color: "#241b22",
};

const topoPagina = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "24px",
  marginBottom: "28px",
  flexWrap: "wrap",
};

const tagTopo = {
  display: "inline-flex",
  background: "#FFF0F6",
  color: "#EC1971",
  padding: "8px 14px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.8px",
};

const tituloPagina = {
  margin: "12px 0 6px",
  fontSize: "40px",
  lineHeight: "1",
  letterSpacing: "-1px",
};

const subtituloPagina = {
  margin: 0,
  color: "#7b6f76",
  fontSize: "16px",
  lineHeight: "1.6",
  maxWidth: "720px",
};

const topoAcoes = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const botaoPrincipalTopo = {
  border: "none",
  background: "#EC1971",
  color: "#fff",
  padding: "13px 18px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "800",
  boxShadow: "0 10px 24px rgba(236, 25, 113, 0.25)",
};

const botaoSecundarioTopo = {
  border: "1px solid #F3C7DA",
  background: "#fff",
  color: "#EC1971",
  padding: "13px 18px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "800",
};

const resumoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginBottom: "22px",
};

const resumoCard = {
  background: "#fff",
  border: "1px solid #F3D7E5",
  borderRadius: "22px",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "7px",
  boxShadow: "0 10px 30px rgba(80, 50, 70, 0.06)",
};

const resumoCardDestaque = {
  ...resumoCard,
  background: "linear-gradient(135deg, #EC1971, #9227C9)",
  color: "#fff",
  border: "none",
};

const layoutPrincipal = {
  display: "grid",
  gridTemplateColumns: "260px minmax(0, 1fr)",
  gap: "22px",
  alignItems: "start",
};

const menuConfig = {
  background: "#fff",
  border: "1px solid #F3D7E5",
  borderRadius: "24px",
  padding: "14px",
  boxShadow: "0 10px 28px rgba(80, 50, 70, 0.06)",
  position: "sticky",
  top: "24px",
};

const menuConfigBotao = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#6f5d66",
  padding: "13px 14px",
  borderRadius: "14px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: "700",
  marginBottom: "6px",
};

const menuConfigAtivo = {
  ...menuConfigBotao,
  background: "#FFF0F6",
  color: "#EC1971",
};

const previewMiniCard = {
  marginTop: "18px",
  padding: "14px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, #FFF0F6, #F6F0FF)",
  border: "1px solid #F3D7E5",
};

const botaoMiniRosa = {
  border: "none",
  background: "#EC1971",
  color: "#fff",
  borderRadius: "999px",
  padding: "9px 12px",
  cursor: "pointer",
  fontWeight: "800",
  marginTop: "8px",
};

const cardFormulario = {
  background: "#fff",
  border: "1px solid #F3D7E5",
  borderRadius: "28px",
  padding: "28px",
  boxShadow: "0 14px 34px rgba(80, 50, 70, 0.08)",
};

const secaoFormulario = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const cabecalhoSecao = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  paddingBottom: "18px",
  borderBottom: "1px solid #F3D7E5",
};

const gridCampos = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px",
};

const campoBox = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const labelCampo = {
  fontSize: "14px",
  color: "#4f3d47",
  fontWeight: "700",
};

const campo = {
  width: "100%",
  border: "1px solid #F3C7DA",
  background: "#fff",
  color: "#2d2430",
  borderRadius: "14px",
  padding: "13px 14px",
  boxSizing: "border-box",
  fontSize: "14px",
  outline: "none",
};

const campoSemMargin = {
  ...campo,
  flex: 1,
};

const textarea = {
  ...campo,
  minHeight: "110px",
  resize: "vertical",
  lineHeight: "1.6",
};

const campoComCor = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
};

const colorPicker = {
  width: "52px",
  height: "46px",
  border: "1px solid #F3C7DA",
  borderRadius: "12px",
  background: "#fff",
  cursor: "pointer",
};

const previewVisual = {
  marginTop: "8px",
};

const previewHero = {
  minHeight: "150px",
  borderRadius: "24px",
  padding: "24px",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
};

const previewLogo = {
  width: "72px",
  height: "72px",
  borderRadius: "20px",
  objectFit: "cover",
  background: "rgba(255,255,255,0.22)",
};

const previewLogoVazio = {
  width: "72px",
  height: "72px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.22)",
  display: "grid",
  placeItems: "center",
  fontWeight: "900",
};

const togglesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const toggleCard = {
  border: "1px solid #F3D7E5",
  background: "#fff",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
  textAlign: "left",
  cursor: "pointer",
  color: "#2d2430",
};

const toggleCardAtivo = {
  ...toggleCard,
  background: "#FFF0F6",
  border: "1px solid #EC1971",
};

const toggleBolinha = {
  width: "30px",
  height: "30px",
  borderRadius: "999px",
  border: "1px solid #E8C7D5",
  display: "grid",
  placeItems: "center",
  color: "#fff",
  flexShrink: 0,
};

const toggleBolinhaAtiva = {
  ...toggleBolinha,
  background: "#EC1971",
  border: "1px solid #EC1971",
  fontWeight: "900",
};

const rodapeFormulario = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "28px",
  paddingTop: "20px",
  borderTop: "1px solid #F3D7E5",
};

const botaoCancelar = {
  border: "1px solid #F3C7DA",
  background: "#fff",
  color: "#6f5d66",
  borderRadius: "14px",
  padding: "12px 18px",
  cursor: "pointer",
  fontWeight: "800",
};

const botaoSalvar = {
  border: "none",
  background: "#EC1971",
  color: "#fff",
  borderRadius: "14px",
  padding: "12px 20px",
  cursor: "pointer",
  fontWeight: "900",
  boxShadow: "0 10px 24px rgba(236, 25, 113, 0.22)",
};

const carregandoBox = {
  background: "#fff",
  border: "1px solid #F3D7E5",
  borderRadius: "22px",
  padding: "30px",
  color: "#7b6f76",
};
