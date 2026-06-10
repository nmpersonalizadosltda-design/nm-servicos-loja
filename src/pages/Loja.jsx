import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export default function Loja() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [config, setConfig] = useState(null);
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  const [produtoAberto, setProdutoAberto] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarLoja();
  }, []);

  async function carregarLoja() {
    setCarregando(true);

    try {
      const [produtosSnap, categoriasSnap, avaliacoesSnap, configSnap] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "categories")),
        getDocs(collection(db, "reviews")),
        getDocs(collection(db, "store_settings")),
      ]);

      const listaProdutos = produtosSnap.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      const listaCategorias = categoriasSnap.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      const listaAvaliacoes = avaliacoesSnap.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      listaProdutos.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      listaCategorias.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      listaAvaliacoes.sort((a, b) => {
        const dataA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
        const dataB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
        return dataB - dataA;
      });

      setProdutos(listaProdutos.filter((item) => item.available !== false));
      setCategorias(listaCategorias);
      setAvaliacoes(listaAvaliacoes.filter((item) => item.status !== "oculto"));
      setConfig(configSnap.docs[0] ? { id: configSnap.docs[0].id, ...configSnap.docs[0].data() } : null);
    } catch (erro) {
      console.error(erro);
      alert("Erro ao carregar a loja pública.");
    } finally {
      setCarregando(false);
    }
  }

  const loja = {
    name: config?.store_name || config?.name || "NM Serviços",
    subtitle: config?.subtitle || "Papelaria personalizada, presentes criativos e materiais feitos sob medida.",
    whatsapp: limparNumero(config?.whatsapp || "11999999999"),
    instagram: config?.instagram || "@nataliat.moreira",
    logo: config?.logo_url || "",
    pix: config?.pix || "",
    address: config?.address || "São Paulo/SP",
    heroTitle: config?.hero_title || "Personalizados únicos para transformar ideias em presentes memoráveis",
    heroText: config?.hero_text || "Escolha seu produto, personalize do seu jeito e fale direto pelo WhatsApp para finalizar seu pedido.",
  };

  const produtosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return produtos.filter((produto) => {
      const categoriaOk = categoriaAtiva === "todos" || produto.category === categoriaAtiva;

      const buscaOk = !termo ||
        String(produto.name || "").toLowerCase().includes(termo) ||
        String(produto.short_description || "").toLowerCase().includes(termo) ||
        String(produto.full_description || "").toLowerCase().includes(termo) ||
        String(produto.category || "").toLowerCase().includes(termo);

      return categoriaOk && buscaOk;
    });
  }, [produtos, busca, categoriaAtiva]);

  const produtosDestaque = produtos.filter((produto) => produto.featured).slice(0, 6);
  const avaliacoesDestaque = avaliacoes.filter((item) => item.featured || item.highlight || item.status === "publicado").slice(0, 6);

  function limparNumero(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function imagemProduto(produto) {
    return produto.image_url_1 || produto.image_1 || produto.image || produto.photo_url || "";
  }

  function nomeCategoria(slug) {
    const categoria = categorias.find((item) => item.slug === slug || item.id === slug);
    return categoria?.name || slug || "Personalizado";
  }

  function abrirWhatsAppProduto(produto) {
    const telefone = loja.whatsapp;

    if (!telefone) {
      alert("WhatsApp da loja não configurado.");
      return;
    }

    const mensagem = `Olá! Tenho interesse neste produto da ${loja.name}:\n\n${produto.name}\nValor: ${formatarPreco(produto.price)}\n\nGostaria de personalizar e fazer um pedido.`;

    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  function abrirWhatsAppGeral() {
    const telefone = loja.whatsapp;
    const mensagem = `Olá! Vim pela loja da ${loja.name} e gostaria de fazer um orçamento.`;
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  function estrelas(nota) {
    const quantidade = Math.max(1, Math.min(5, Number(nota || 5)));
    return "★".repeat(quantidade) + "☆".repeat(5 - quantidade);
  }

  return (
    <div style={paginaLoja}>
      <header style={topbar}>
        <div style={brandBox}>
          {loja.logo ? <img src={loja.logo} alt={loja.name} style={logoImagem} /> : <div style={logoFake}>NM</div>}
          <div>
            <strong style={brandNome}>{loja.name}</strong>
            <span style={brandSub}>Personalizados criativos</span>
          </div>
        </div>

        <nav style={navLinks}>
          <a href="#produtos" style={navLink}>Produtos</a>
          <a href="#categorias" style={navLink}>Categorias</a>
          <a href="#avaliacoes" style={navLink}>Avaliações</a>
          <button type="button" onClick={abrirWhatsAppGeral} style={botaoTopo}>Pedir no WhatsApp</button>
        </nav>
      </header>

      <main style={mainLoja}>
        <section style={heroLoja}>
          <div style={heroTextoBox}>
            <span style={seloHero}>Feito sob medida</span>
            <h1 style={heroTitulo}>{loja.heroTitle}</h1>
            <p style={heroTexto}>{loja.heroText}</p>

            <div style={heroAcoes}>
              <button type="button" onClick={abrirWhatsAppGeral} style={botaoPrincipalLoja}>Solicitar orçamento</button>
              <a href="#produtos" style={botaoSecundarioLoja}>Ver catálogo</a>
            </div>
          </div>

          <div style={heroCardVisual}>
            <div style={heroProdutoGrande}>✨</div>
            <strong>Planner, caderneta, kits, blocos e brindes</strong>
            <span>personalizados do seu jeito</span>
          </div>
        </section>

        <section style={barraBusca}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar planner, caderneta, bloco, kit, chaveiro..."
            style={inputBusca}
          />
        </section>

        <section id="categorias" style={secaoPadrao}>
          <div style={secaoHeader}>
            <div>
              <span style={etiquetaSecao}>Categorias</span>
              <h2 style={tituloSecao}>Escolha por tipo de produto</h2>
            </div>
          </div>

          <div style={categoriasGrid}>
            <button
              type="button"
              onClick={() => setCategoriaAtiva("todos")}
              style={categoriaAtiva === "todos" ? categoriaCardAtivo : categoriaCard}
            >
              <span>🛍️</span>
              <strong>Todos</strong>
              <small>{produtos.length} produto(s)</small>
            </button>

            {categorias.map((categoria) => {
              const total = produtos.filter((produto) => produto.category === categoria.slug || produto.category === categoria.id).length;

              return (
                <button
                  type="button"
                  key={categoria.id}
                  onClick={() => setCategoriaAtiva(categoria.slug || categoria.id)}
                  style={categoriaAtiva === (categoria.slug || categoria.id) ? categoriaCardAtivo : categoriaCard}
                >
                  <span>{categoria.icon || "🎁"}</span>
                  <strong>{categoria.name}</strong>
                  <small>{total} produto(s)</small>
                </button>
              );
            })}
          </div>
        </section>

        {produtosDestaque.length > 0 && (
          <section style={secaoPadrao}>
            <div style={secaoHeader}>
              <div>
                <span style={etiquetaSecao}>Destaques</span>
                <h2 style={tituloSecao}>Mais pedidos da NM</h2>
              </div>
            </div>

            <div style={produtosGrid}>
              {produtosDestaque.map((produto) => renderProdutoCard(produto, true))}
            </div>
          </section>
        )}

        <section id="produtos" style={secaoPadrao}>
          <div style={secaoHeader}>
            <div>
              <span style={etiquetaSecao}>Catálogo</span>
              <h2 style={tituloSecao}>Produtos personalizados</h2>
            </div>
            <span style={contadorProdutos}>{produtosFiltrados.length} encontrado(s)</span>
          </div>

          {carregando ? (
            <div style={estadoVazio}>Carregando produtos...</div>
          ) : produtosFiltrados.length === 0 ? (
            <div style={estadoVazio}>Nenhum produto encontrado. O catálogo está dramático hoje.</div>
          ) : (
            <div style={produtosGrid}>
              {produtosFiltrados.map((produto) => renderProdutoCard(produto))}
            </div>
          )}
        </section>

        <section id="avaliacoes" style={secaoAvaliacoes}>
          <div style={secaoHeader}>
            <div>
              <span style={etiquetaSecao}>Depoimentos</span>
              <h2 style={tituloSecao}>Quem comprou, aprovou</h2>
            </div>
          </div>

          {avaliacoesDestaque.length === 0 ? (
            <div style={estadoVazio}>As avaliações aparecerão aqui quando forem cadastradas no Admin.</div>
          ) : (
            <div style={avaliacoesGrid}>
              {avaliacoesDestaque.map((avaliacao) => (
                <article key={avaliacao.id} style={avaliacaoCard}>
                  <div style={estrelasStyle}>{estrelas(avaliacao.rating || avaliacao.note || avaliacao.stars)}</div>
                  <p style={avaliacaoTexto}>“{avaliacao.comment || avaliacao.text || avaliacao.review || "Produto lindo e atendimento excelente."}”</p>
                  <strong>{avaliacao.client_name || avaliacao.name || "Cliente NM"}</strong>
                  <small>{avaliacao.product_name || "Produto personalizado"}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {produtoAberto && (
        <div style={modalOverlay} onClick={() => setProdutoAberto(null)}>
          <div style={modalProduto} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setProdutoAberto(null)} style={botaoFechar}>×</button>

            <div style={modalGrid}>
              <div style={modalImagemBox}>
                {imagemProduto(produtoAberto) ? (
                  <img src={imagemProduto(produtoAberto)} alt={produtoAberto.name} style={modalImagem} />
                ) : (
                  <div style={semImagemGrande}>✨</div>
                )}
              </div>

              <div>
                <span style={seloHero}>{nomeCategoria(produtoAberto.category)}</span>
                <h2 style={modalTitulo}>{produtoAberto.name}</h2>
                <strong style={modalPreco}>{formatarPreco(produtoAberto.price)}</strong>
                <p style={modalTexto}>{produtoAberto.full_description || produtoAberto.short_description || "Produto personalizado feito sob encomenda."}</p>

                <div style={detalhesProduto}>
                  {produtoAberto.production_time && <span>⏱️ Prazo: {produtoAberto.production_time}</span>}
                  {produtoAberto.size && <span>📐 Tamanho: {produtoAberto.size}</span>}
                  {produtoAberto.finish && <span>✨ Acabamento: {produtoAberto.finish}</span>}
                  {produtoAberto.personalization && <span>🎨 Personalização: {produtoAberto.personalization}</span>}
                </div>

                <div style={highlightsBox}>
                  {[produtoAberto.highlight_1, produtoAberto.highlight_2, produtoAberto.highlight_3, produtoAberto.highlight_4]
                    .filter(Boolean)
                    .map((item) => <span key={item}>✓ {item}</span>)}
                </div>

                <button type="button" onClick={() => abrirWhatsAppProduto(produtoAberto)} style={botaoPrincipalLoja}>Pedir pelo WhatsApp</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button type="button" onClick={abrirWhatsAppGeral} style={whatsappFlutuante}>💬</button>

      <footer style={footerLoja}>
        <strong>{loja.name}</strong>
        <span>{loja.instagram} • {loja.address}</span>
      </footer>
    </div>
  );

  function renderProdutoCard(produto, destaque = false) {
    return (
      <article key={produto.id} style={destaque ? produtoCardDestaque : produtoCard}>
        <button type="button" onClick={() => setProdutoAberto(produto)} style={imagemCardBotao}>
          {imagemProduto(produto) ? (
            <img src={imagemProduto(produto)} alt={produto.name} style={imagemCard} />
          ) : (
            <div style={semImagem}>✨</div>
          )}
        </button>

        <div style={produtoConteudo}>
          <span style={categoriaBadge}>{nomeCategoria(produto.category)}</span>
          <h3 style={produtoNome}>{produto.name}</h3>
          <p style={produtoDescricao}>{produto.short_description || "Produto personalizado feito sob encomenda."}</p>
          <strong style={produtoPreco}>{formatarPreco(produto.price)}</strong>

          <div style={produtoAcoes}>
            <button type="button" onClick={() => setProdutoAberto(produto)} style={botaoDetalhes}>Ver detalhes</button>
            <button type="button" onClick={() => abrirWhatsAppProduto(produto)} style={botaoWhatsappCard}>WhatsApp</button>
          </div>
        </div>
      </article>
    );
  }
}

const paginaLoja = { minHeight: "100vh", background: "#FFF8FB", color: "#241923", fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const topbar = { position: "sticky", top: 0, zIndex: 20, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(18px)", borderBottom: "1px solid #F7D6E5", padding: "14px 6vw", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" };
const brandBox = { display: "flex", alignItems: "center", gap: "12px" };
const logoImagem = { width: "48px", height: "48px", borderRadius: "16px", objectFit: "cover" };
const logoFake = { width: "48px", height: "48px", borderRadius: "16px", background: "linear-gradient(135deg,#FCE4EC,#E91E63)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 900 };
const brandNome = { display: "block", color: "#1F1720", fontSize: "18px" };
const brandSub = { display: "block", color: "#9A6A80", fontSize: "12px" };
const navLinks = { display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" };
const navLink = { color: "#6E5262", textDecoration: "none", fontWeight: 700, fontSize: "14px" };
const botaoTopo = { background: "#E91E63", color: "#fff", border: "none", borderRadius: "999px", padding: "12px 18px", fontWeight: 800, cursor: "pointer" };
const mainLoja = { maxWidth: "1180px", margin: "0 auto", padding: "34px 22px 60px" };
const heroLoja = { background: "linear-gradient(135deg,#E91E63 0%,#A51EA6 55%,#07313F 100%)", borderRadius: "34px", padding: "46px", color: "#fff", display: "grid", gridTemplateColumns: "1.4fr 0.8fr", gap: "30px", alignItems: "center", boxShadow: "0 24px 60px rgba(233,30,99,0.20)" };
const seloHero = { display: "inline-flex", background: "rgba(255,255,255,0.18)", color: "inherit", padding: "8px 13px", borderRadius: "999px", fontWeight: 900, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.7px" };
const heroTitulo = { fontSize: "clamp(34px, 5vw, 64px)", lineHeight: "0.98", margin: "16px 0", letterSpacing: "-1.6px" };
const heroTexto = { color: "rgba(255,255,255,0.86)", fontSize: "18px", lineHeight: "1.7", maxWidth: "700px" };
const heroTextoBox = { minWidth: 0 };
const heroAcoes = { display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" };
const botaoPrincipalLoja = { background: "#E91E63", color: "#fff", border: "none", borderRadius: "16px", padding: "14px 22px", fontWeight: 900, cursor: "pointer", textDecoration: "none", display: "inline-flex", justifyContent: "center" };
const botaoSecundarioLoja = { background: "rgba(255,255,255,0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)", borderRadius: "16px", padding: "14px 22px", fontWeight: 900, cursor: "pointer", textDecoration: "none" };
const heroCardVisual = { background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.24)", borderRadius: "28px", minHeight: "260px", display: "grid", placeItems: "center", textAlign: "center", padding: "26px", gap: "8px" };
const heroProdutoGrande = { width: "110px", height: "110px", borderRadius: "34px", background: "rgba(255,255,255,0.18)", display: "grid", placeItems: "center", fontSize: "48px" };
const barraBusca = { margin: "24px 0", background: "#fff", border: "1px solid #F6D5E4", borderRadius: "22px", padding: "16px", boxShadow: "0 10px 32px rgba(233,30,99,0.06)" };
const inputBusca = { width: "100%", border: "1px solid #F3C7DA", borderRadius: "16px", padding: "16px 18px", outline: "none", fontSize: "15px", boxSizing: "border-box" };
const secaoPadrao = { marginTop: "34px" };
const secaoHeader = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", marginBottom: "18px", flexWrap: "wrap" };
const etiquetaSecao = { color: "#E91E63", fontWeight: 900, textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.8px" };
const tituloSecao = { margin: "4px 0 0", fontSize: "32px", letterSpacing: "-0.7px" };
const categoriasGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px" };
const categoriaCard = { background: "#fff", border: "1px solid #F6D5E4", borderRadius: "20px", padding: "18px", display: "grid", gap: "6px", textAlign: "left", cursor: "pointer", boxShadow: "0 8px 22px rgba(233,30,99,0.05)" };
const categoriaCardAtivo = { ...categoriaCard, border: "2px solid #E91E63", background: "linear-gradient(135deg,#FFF,#FFF0F7)" };
const produtosGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" };
const produtoCard = { background: "#fff", border: "1px solid #F6D5E4", borderRadius: "26px", overflow: "hidden", boxShadow: "0 14px 36px rgba(233,30,99,0.08)" };
const produtoCardDestaque = { ...produtoCard, border: "2px solid #E91E63" };
const imagemCardBotao = { width: "100%", height: "220px", border: "none", padding: 0, cursor: "pointer", background: "#FFF0F7", display: "block" };
const imagemCard = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const semImagem = { width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: "42px" };
const produtoConteudo = { padding: "18px" };
const categoriaBadge = { display: "inline-flex", background: "#FFF0F7", color: "#E91E63", borderRadius: "999px", padding: "6px 10px", fontSize: "12px", fontWeight: 900 };
const produtoNome = { margin: "12px 0 8px", fontSize: "19px", lineHeight: "1.25" };
const produtoDescricao = { color: "#7B6572", lineHeight: "1.5", minHeight: "44px" };
const produtoPreco = { display: "block", color: "#E91E63", fontSize: "22px", margin: "10px 0 16px" };
const produtoAcoes = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" };
const botaoDetalhes = { background: "#FFF0F7", color: "#E91E63", border: "1px solid #F3C7DA", borderRadius: "13px", padding: "11px", fontWeight: 900, cursor: "pointer" };
const botaoWhatsappCard = { background: "#25D366", color: "#fff", border: "none", borderRadius: "13px", padding: "11px", fontWeight: 900, cursor: "pointer" };
const contadorProdutos = { background: "#fff", border: "1px solid #F6D5E4", borderRadius: "999px", padding: "8px 12px", color: "#8B6677", fontWeight: 800 };
const estadoVazio = { background: "#fff", border: "1px dashed #F3C7DA", borderRadius: "22px", padding: "34px", textAlign: "center", color: "#8B6677" };
const secaoAvaliacoes = { ...secaoPadrao, background: "#fff", border: "1px solid #F6D5E4", borderRadius: "28px", padding: "26px", boxShadow: "0 14px 36px rgba(233,30,99,0.07)" };
const avaliacoesGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" };
const avaliacaoCard = { background: "#FFF8FB", border: "1px solid #F6D5E4", borderRadius: "22px", padding: "20px" };
const estrelasStyle = { color: "#E91E63", letterSpacing: "2px", marginBottom: "10px" };
const avaliacaoTexto = { color: "#5B4952", lineHeight: "1.6" };
const modalOverlay = { position: "fixed", inset: 0, background: "rgba(24,16,22,0.58)", zIndex: 50, display: "grid", placeItems: "center", padding: "20px" };
const modalProduto = { background: "#fff", borderRadius: "30px", padding: "28px", maxWidth: "980px", width: "100%", position: "relative", boxShadow: "0 30px 90px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto" };
const botaoFechar = { position: "absolute", top: "18px", right: "18px", border: "none", background: "#FFF0F7", color: "#E91E63", borderRadius: "14px", width: "42px", height: "42px", cursor: "pointer", fontSize: "24px" };
const modalGrid = { display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: "26px" };
const modalImagemBox = { background: "#FFF0F7", borderRadius: "24px", minHeight: "420px", overflow: "hidden", display: "grid", placeItems: "center" };
const modalImagem = { width: "100%", height: "100%", objectFit: "cover" };
const semImagemGrande = { fontSize: "64px" };
const modalTitulo = { fontSize: "36px", margin: "16px 0 10px", lineHeight: "1.05" };
const modalPreco = { color: "#E91E63", fontSize: "28px" };
const modalTexto = { color: "#6D5864", lineHeight: "1.7" };
const detalhesProduto = { display: "grid", gap: "8px", margin: "16px 0", color: "#5C4652" };
const highlightsBox = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", margin: "18px 0" };
const whatsappFlutuante = { position: "fixed", right: "24px", bottom: "24px", width: "58px", height: "58px", borderRadius: "50%", background: "#25D366", color: "#fff", border: "none", fontSize: "24px", boxShadow: "0 12px 28px rgba(37,211,102,0.32)", cursor: "pointer", zIndex: 40 };
const footerLoja = { padding: "30px 6vw", background: "#fff", borderTop: "1px solid #F6D5E4", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", color: "#7B6572" };
