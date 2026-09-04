import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addDoc, collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

const CONFIG_DOC_ID = "main";

const configPadrao = {
  store_name: "NM Serviços",
  store_subtitle:
    "Papelaria personalizada para empresas e pessoas que querem marcar presença todos os dias.",
  whatsapp: "11999999999",
  instagram: "nataliat.moreira",
  address: "Rua Margarida de Lima, 77 - Tatuapé - São Paulo",
  logo_url: "",
  banner_url: "https://i.ibb.co/BvcHwTm/Banner.png",
  primary_color: "#EC1971",
  secondary_color: "#7B1FA2",
  accent_color: "#07313F",
  show_reviews: true,
  show_prices: true,
  show_whatsapp_button: true,
};

export default function ProdutosPagina() {
  const { slug } = useParams();

  const [config, setConfig] = useState(configPadrao);
  const [produtos, setProdutos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [midiaIndex, setMidiaIndex] = useState(0);
  const [variacaoSelecionada, setVariacaoSelecionada] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [salvandoSolicitacao, setSalvandoSolicitacao] = useState(false);
  const [dadosSolicitacao, setDadosSolicitacao] = useState({
    name: "",
    whatsapp: "",
    email: "",
    instagram: "",
    address: "",
    description: "",
    quantity: 1,
  });

  useEffect(() => {
    carregarDados();
    document.body.style.margin = "0";
    document.body.style.background = "#fff1f7";
    document.documentElement.style.background = "#fff1f7";
  }, [slug]);

  async function carregarDados() {
    try {
      setCarregando(true);

      const configRef = doc(db, "store_settings", CONFIG_DOC_ID);
      const configSnap = await getDoc(configRef);

      if (configSnap.exists()) {
        setConfig({ ...configPadrao, ...configSnap.data() });
      }

      const produtosSnap = await getDocs(collection(db, "products"));
      const listaProdutos = produtosSnap.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      const reviewsSnap = await getDocs(collection(db, "reviews"));
      const listaReviews = reviewsSnap.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      setProdutos(listaProdutos.filter((item) => item.available !== false));
      setAvaliacoes(listaReviews.filter((item) => item.status !== "oculto"));
    } catch (erro) {
      console.error("Erro ao carregar página do produto:", erro);
    } finally {
      setCarregando(false);
    }
  }

  function gerarSlug(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  const produto = useMemo(() => {
    const slugAtual = String(slug || "").trim();

    return (
      produtos.find((item) => String(item.slug || "").trim() === slugAtual) ||
      produtos.find((item) => gerarSlug(item.name) === slugAtual) ||
      null
    );
  }, [produtos, slug]);

  useEffect(() => {
    if (!produto) return;

    const primeiraVariacao = primeiraVariacaoProduto(produto);

    setMidiaIndex(0);
    setVariacaoSelecionada(primeiraVariacao);
    setDadosSolicitacao((prev) => ({
      ...prev,
      description: primeiraVariacao
        ? `Tenho interesse em personalizar: ${produto.name}. ${etiquetaVariacao(
            produto
          )}: ${primeiraVariacao.name}.`
        : `Tenho interesse em personalizar: ${produto.name}.`,
      quantity: 1,
    }));

    document.title = `${produto.name} | ${config.store_name}`;
  }, [produto, config.store_name]);

  function limparNumero(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function numeroWhatsApp() {
    const numero = limparNumero(config.whatsapp);
    if (numero.startsWith("55")) return numero;
    return `55${numero}`;
  }

  function registrarConversaoWhatsApp(url) {
    const abrirWhatsApp = () => {
      window.location.href = url;
    };

    if (window.gtag) {
      window.gtag("event", "conversion", {
        send_to: "AW-18195282845/0LjFCOHi5r0cEJ33l-RD",
        event_callback: abrirWhatsApp,
      });

      setTimeout(abrirWhatsApp, 900);
      return;
    }

    abrirWhatsApp();
  }

  function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function otimizarImagem(url, largura = 1000) {
    const imagem = String(url || "").trim();

    if (!imagem) return "";

    if (!imagem.includes("res.cloudinary.com") || !imagem.includes("/upload/")) {
      return imagem;
    }

    const larguraSegura = Math.max(120, Number(largura) || 1000);

    if (imagem.includes("/upload/f_auto") || imagem.includes("/upload/q_auto")) {
      return imagem;
    }

    return imagem.replace(
      "/upload/",
      `/upload/f_auto,q_auto:good,w_${larguraSegura},c_limit/`
    );
  }

  function variacoesProduto(produtoAtual) {
    if (!produtoAtual || !Array.isArray(produtoAtual.variations)) return [];

    return produtoAtual.variations
      .map((variacao, index) => {
        const nome =
          variacao.name ||
          variacao.option ||
          variacao.label ||
          variacao.title ||
          `Opção ${index + 1}`;

        return {
          id: `${String(nome).trim()}-${index}`,
          name: String(nome).trim(),
          price: Number(variacao.price || variacao.value || produtoAtual.price || 0),
          note:
            variacao.note ||
            variacao.observation ||
            variacao.description ||
            "",
        };
      })
      .filter((variacao) => variacao.name);
  }

  function produtoTemVariacoes(produtoAtual) {
    return (
      Boolean(produtoAtual?.has_variations) &&
      variacoesProduto(produtoAtual).length > 0
    );
  }

  function primeiraVariacaoProduto(produtoAtual) {
    return variacoesProduto(produtoAtual)[0] || null;
  }

  function etiquetaVariacao(produtoAtual) {
    return produtoAtual?.variation_label || produtoAtual?.variation_name || "Opção";
  }

  function precoProduto(produtoAtual, variacao = null) {
    if (produtoTemVariacoes(produtoAtual) && variacao) {
      return Number(variacao.price || produtoAtual?.price || 0);
    }

    return Number(produtoAtual?.price || 0);
  }

  function normalizarMidiaImagem(valor, index = 0) {
    if (!valor) return null;

    if (typeof valor === "string") {
      return {
        type: "image",
        url: valor,
        fit: "contain",
        positionX: 50,
        positionY: 50,
        zoom: 1,
      };
    }

    const url = valor.url || valor.src || valor.image_url || valor.image || "";

    if (!url) return null;

    return {
      type: "image",
      url,
      fit: valor.fit || valor.objectFit || valor.image_fit || "contain",
      positionX: Number(valor.positionX ?? valor.posX ?? valor.x ?? 50),
      positionY: Number(valor.positionY ?? valor.posY ?? valor.y ?? 50),
      zoom: Number(valor.zoom || valor.scale || 1),
      index,
    };
  }

  function imagemConfigProduto(produtoAtual, index = 0) {
    const numeroImagem = index + 1;

    return {
      fit:
        produtoAtual?.[`image_fit_${numeroImagem}`] ||
        produtoAtual?.image_fit ||
        produtoAtual?.object_fit ||
        "contain",
      positionX: Number(
        produtoAtual?.[`image_position_x_${numeroImagem}`] ??
          produtoAtual?.image_position_x ??
          produtoAtual?.imagePositionX ??
          50
      ),
      positionY: Number(
        produtoAtual?.[`image_position_y_${numeroImagem}`] ??
          produtoAtual?.image_position_y ??
          produtoAtual?.imagePositionY ??
          50
      ),
      zoom: Number(
        produtoAtual?.[`image_zoom_${numeroImagem}`] ??
          produtoAtual?.image_zoom ??
          produtoAtual?.imageZoom ??
          1
      ),
    };
  }

  function imagensProduto(produtoAtual) {
    if (!produtoAtual) return [];

    const imagensArray = Array.isArray(produtoAtual.images)
      ? produtoAtual.images
      : Array.isArray(produtoAtual.imagens)
      ? produtoAtual.imagens
      : [];

    const imagensDoArray = imagensArray
      .map((imagem, index) => normalizarMidiaImagem(imagem, index))
      .filter(Boolean);

    const urls = [
      produtoAtual.image_url_1,
      produtoAtual.image_url_2,
      produtoAtual.image_url_3,
      produtoAtual.image_url_4,
      produtoAtual.image_url_5,
      produtoAtual.image_url,
      produtoAtual.photo_url,
    ]
      .filter(Boolean)
      .map((url) => String(url).trim())
      .filter(Boolean);

    const imagensAntigas = urls.map((url, index) => {
      const configImagem = imagemConfigProduto(produtoAtual, index);
      return {
        type: "image",
        url,
        ...configImagem,
      };
    });

    const todas = [...imagensDoArray, ...imagensAntigas];
    const vistas = new Set();

    return todas.filter((imagem) => {
      const chave = imagem.url;
      if (vistas.has(chave)) return false;
      vistas.add(chave);
      return true;
    });
  }

  function videoProduto(produtoAtual) {
    return (
      produtoAtual?.video_url ||
      produtoAtual?.video ||
      produtoAtual?.video_link ||
      produtoAtual?.reel_url ||
      ""
    );
  }

  function midiasProduto(produtoAtual) {
    const imagens = imagensProduto(produtoAtual);
    const video = videoProduto(produtoAtual);

    if (video) {
      imagens.push({
        type: "video",
        url: video,
      });
    }

    return imagens;
  }

  function proximaMidia(total) {
    setMidiaIndex((prev) => (prev + 1) % total);
  }

  function midiaAnterior(total) {
    setMidiaIndex((prev) => (prev - 1 + total) % total);
  }

  function renderizarTextoFormatado(texto) {
    const conteudo = String(texto || "").trim();

    if (!conteudo) {
      return (
        <p style={textoParagrafo}>
          Produto personalizado feito sob encomenda.
        </p>
      );
    }

    const linhas = conteudo.split(/\r?\n/);
    const blocos = [];
    let listaAtual = [];

    function renderInline(linha, keyPrefix) {
      return linha.split(/(\*\*.*?\*\*)/g).map((parte, index) => {
        if (parte.startsWith("**") && parte.endsWith("**")) {
          return (
            <strong key={`${keyPrefix}-bold-${index}`}>
              {parte.slice(2, -2)}
            </strong>
          );
        }

        return <span key={`${keyPrefix}-${index}`}>{parte}</span>;
      });
    }

    function fecharLista(key) {
      if (!listaAtual.length) return;

      const itens = [...listaAtual];
      listaAtual = [];

      blocos.push(
        <ul key={`lista-${key}`} style={listaFormatada}>
          {itens.map((linha, index) => (
            <li key={`item-${key}-${index}`}>
              {renderInline(linha, `li-${key}-${index}`)}
            </li>
          ))}
        </ul>
      );
    }

    linhas.forEach((linhaOriginal, index) => {
      const linha = linhaOriginal.trim();

      if (!linha) {
        fecharLista(index);
        return;
      }

      if (linha.startsWith("- ") || linha.startsWith("• ")) {
        listaAtual.push(linha.replace(/^[-•]\s*/, ""));
        return;
      }

      fecharLista(index);

      blocos.push(
        <p key={`p-${index}`} style={textoParagrafo}>
          {renderInline(linha, `p-${index}`)}
        </p>
      );
    });

    fecharLista("fim");

    return blocos;
  }

  function atualizarSolicitacao(campo, valor) {
    setDadosSolicitacao((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function abrirFormularioPedido() {
    if (!produto) return;

    const variacaoFinal = variacaoSelecionada || primeiraVariacaoProduto(produto);

    setDadosSolicitacao({
      name: "",
      whatsapp: "",
      email: "",
      instagram: "",
      address: "",
      description: variacaoFinal
        ? `Tenho interesse em personalizar: ${produto.name}. ${etiquetaVariacao(
            produto
          )}: ${variacaoFinal.name}.`
        : `Tenho interesse em personalizar: ${produto.name}.`,
      quantity: 1,
    });

    setFormularioAberto(true);
  }

  function montarMensagemWhatsApp(dados, variacao = null) {
    const nomeProduto = produto?.name || "Orçamento personalizado";
    const valorProduto = produto
      ? formatarPreco(precoProduto(produto, variacao))
      : "A definir";

    const linhaVariacao =
      produto && variacao
        ? `${etiquetaVariacao(produto)}: ${variacao.name}\n`
        : "";

    return (
      `Olá! Vim pela loja da ${config.store_name} e gostaria de fazer um orçamento.\n\n` +
      `Produto: ${nomeProduto}\n` +
      linhaVariacao +
      `Quantidade: ${dados.quantity || 1}\n` +
      `Valor de referência: ${valorProduto}\n\n` +
      `Link do produto:\n${window.location.href}\n\n` +
      `Meus dados:\n` +
      `Nome: ${dados.name}\n` +
      `Telefone: ${dados.whatsapp}\n` +
      `E-mail: ${dados.email || "Não informado"}\n` +
      `Instagram: ${dados.instagram || "Não informado"}\n` +
      `Endereço: ${dados.address || "Não informado"}\n\n` +
      `Descrição do pedido:\n${dados.description}`
    );
  }

  async function salvarSolicitacao(e) {
    e.preventDefault();

    if (!dadosSolicitacao.name.trim()) {
      alert("Preencha seu nome.");
      return;
    }

    if (!dadosSolicitacao.whatsapp.trim()) {
      alert("Preencha seu telefone/WhatsApp.");
      return;
    }

    if (!dadosSolicitacao.description.trim()) {
      alert("Conte o que você deseja personalizar.");
      return;
    }

    setSalvandoSolicitacao(true);

    try {
      const quantidade = Number(dadosSolicitacao.quantity || 1);
      const variacaoFinal =
        variacaoSelecionada || primeiraVariacaoProduto(produto);
      const valorUnitario = precoProduto(produto, variacaoFinal);
      const valorTotal = valorUnitario * quantidade;

      const clienteRef = await addDoc(collection(db, "clients"), {
        name: dadosSolicitacao.name.trim(),
        whatsapp: dadosSolicitacao.whatsapp.trim(),
        email: dadosSolicitacao.email.trim(),
        instagram: dadosSolicitacao.instagram.trim(),
        address: dadosSolicitacao.address.trim(),
        city: "",
        notes: dadosSolicitacao.description.trim(),
        source: "Página do produto",
        created_at: new Date(),
      });

      await addDoc(collection(db, "quotes"), {
        client_id: clienteRef.id,
        client_name: dadosSolicitacao.name.trim(),
        client_whatsapp: dadosSolicitacao.whatsapp.trim(),
        client_email: dadosSolicitacao.email.trim(),
        client_instagram: dadosSolicitacao.instagram.trim(),
        client_address: dadosSolicitacao.address.trim(),
        type: "produto",
        product_id: produto?.id || "",
        product_name: produto?.name || "Orçamento personalizado",
        product_slug: produto?.slug || gerarSlug(produto?.name),
        product_url: window.location.href,
        product_variation_label:
          produto && variacaoFinal ? etiquetaVariacao(produto) : "",
        product_variation_name: variacaoFinal?.name || "",
        product_variation_price: variacaoFinal?.price || 0,
        quantity: quantidade,
        unit_value: valorUnitario,
        total_value: valorTotal,
        production_time: produto?.production_time || "A combinar",
        valid_until: "",
        status: "aberto",
        source: "Página do produto",
        seller: "Site",
        notes: variacaoFinal
          ? `${etiquetaVariacao(produto)}: ${variacaoFinal.name}\n${dadosSolicitacao.description.trim()}`
          : dadosSolicitacao.description.trim(),
        created_at: new Date(),
      });

      const mensagem = montarMensagemWhatsApp(dadosSolicitacao, variacaoFinal);

      setFormularioAberto(false);

      registrarConversaoWhatsApp(
        `https://wa.me/${numeroWhatsApp()}?text=${encodeURIComponent(mensagem)}`
      );
    } catch (erro) {
      console.error("Erro ao salvar solicitação:", erro);
      alert("Erro ao salvar sua solicitação. Tente novamente.");
    } finally {
      setSalvandoSolicitacao(false);
    }
  }

  function avaliacaoEstaPublica(item) {
    const status = String(item?.status || "").toLowerCase().trim();
    return ["aprovado", "aprovada", "publicado", "publicada"].includes(status);
  }

  function textoSeguro(valor, fallback = "") {
    return String(valor || fallback).trim();
  }

  function nomeAvaliacao(item) {
    return textoSeguro(
      item?.client_name || item?.name || item?.customer_name,
      "Cliente NM"
    );
  }

  function produtoAvaliacao(item) {
    return textoSeguro(
      item?.product_name || item?.product || item?.product_title,
      "Produto personalizado"
    );
  }

  function comentarioAvaliacao(item) {
    return textoSeguro(
      item?.comment || item?.text || item?.message || item?.review,
      "Produto lindo e atendimento impecável."
    );
  }

  function estrelasAvaliacao(item) {
    const nota = Math.max(1, Math.min(5, Number(item?.rating || item?.stars || 5)));
    return "★".repeat(nota) + "☆".repeat(5 - nota);
  }

  const corPrincipal = config.primary_color || "#EC1971";
  const corSecundaria = config.secondary_color || "#7B1FA2";
  const logoUrl = config.logo_url || "";

  const midias = midiasProduto(produto);
  const midiaAtual = midias[midiaIndex] || null;
  const variacoes = variacoesProduto(produto);
  const temVariacoes = produtoTemVariacoes(produto);
  const variacaoAtual = variacaoSelecionada || primeiraVariacaoProduto(produto);
  const precoAtual = precoProduto(produto, variacaoAtual);
  const descricao =
    produto?.full_description ||
    produto?.description ||
    produto?.short_description ||
    "";
  const avaliacoesPublicadas = avaliacoes.filter(avaliacaoEstaPublica);

  const midiaFit = "contain";
  const midiaPositionX = 50;
  const midiaPositionY = 50;
  const midiaZoom = 1;

  if (carregando) {
    return (
      <div style={pagina}>
        <div style={carregandoBox}>Carregando produto...</div>
      </div>
    );
  }

  if (!produto) {
    return (
      <div style={pagina}>
        <header style={topo}>
          <Link to="/" style={logoLink}>
            {logoUrl ? (
              <img
                src={otimizarImagem(logoUrl, 180)}
                alt={config.store_name}
                style={logoImagem}
              />
            ) : (
              <div style={{ ...logo, background: corPrincipal }}>NM</div>
            )}
          </Link>

          <Link to="/" style={{ ...botaoVoltar, color: corPrincipal }}>
            ← Voltar para a loja
          </Link>
        </header>

        <main style={container}>
          <div style={produtoNaoEncontrado}>
            <h1>Produto não encontrado</h1>
            <p>
              Esse link não encontrou nenhum produto disponível. Talvez o produto
              tenha sido removido, desativado ou o link esteja errado.
            </p>
            <Link to="/" style={{ ...botaoPrincipal, background: corPrincipal }}>
              Ver catálogo
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={pagina}>
      <header style={topo}>
        <Link to="/" style={logoLink}>
          {logoUrl ? (
            <img
              src={otimizarImagem(logoUrl, 180)}
              alt={config.store_name}
              style={logoImagem}
              loading="eager"
              decoding="async"
            />
          ) : (
            <div style={{ ...logo, background: corPrincipal }}>NM</div>
          )}
        </Link>

        <Link to="/" style={{ ...botaoVoltar, color: corPrincipal }}>
          ← Voltar para a loja
        </Link>
      </header>

      <main style={container}>
        <section style={produtoHero}>
          <div>
            <div style={midiaPrincipalBox}>
              {midiaAtual ? (
                midiaAtual.type === "video" ? (
                  <video
                    src={midiaAtual.url}
                    controls
                    preload="metadata"
                    style={midiaVideo}
                  />
                ) : (
                  <img
                    src={otimizarImagem(midiaAtual.url, 1300)}
                    alt={produto.name}
                    style={{
                      ...midiaImagem,
                      objectFit: midiaFit,
                      objectPosition: `${midiaPositionX}% ${midiaPositionY}%`,
                      transform: `scale(${midiaZoom})`,
                    }}
                    loading="eager"
                    decoding="async"
                  />
                )
              ) : (
                <div style={semImagem}>✨</div>
              )}

              {midias.length > 1 && (
                <>
                  <button
                    type="button"
                    style={{ ...setaCarrossel, left: "14px" }}
                    onClick={() => midiaAnterior(midias.length)}
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    style={{ ...setaCarrossel, right: "14px" }}
                    onClick={() => proximaMidia(midias.length)}
                  >
                    ›
                  </button>

                  <div style={contadorMidia}>
                    {midiaIndex + 1} / {midias.length}
                  </div>
                </>
              )}
            </div>

            {midias.length > 1 && (
              <div style={miniaturasBox}>
                {midias.map((midia, index) => (
                  <button
                    key={`${midia.url}-${index}`}
                    type="button"
                    onClick={() => setMidiaIndex(index)}
                    style={{
                      ...miniaturaBotao,
                      borderColor: index === midiaIndex ? corPrincipal : "#f6cfe0",
                    }}
                  >
                    {midia.type === "video" ? (
                      <span style={miniaturaVideo}>▶</span>
                    ) : (
                      <img
                        src={otimizarImagem(midia.url, 180)}
                        alt={`Imagem ${index + 1}`}
                        style={miniaturaImagem}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={produtoConteudo}>
            <span style={{ ...tag, color: corPrincipal }}>
              {produto.category || "Personalizado"}
            </span>

            <h1 style={tituloProduto}>{produto.name}</h1>

            {config.show_prices && (
              <h2 style={{ ...precoProdutoEstilo, color: corPrincipal }}>
                {temVariacoes ? "A partir de " : ""}
                {formatarPreco(precoAtual)}
              </h2>
            )}

            <p style={descricaoCurta}>
              {produto.short_description ||
                "Produto personalizado feito sob encomenda."}
            </p>

            {temVariacoes && (
              <div style={variacoesBox}>
                <strong style={variacoesTitulo}>
                  Escolha {etiquetaVariacao(produto).toLowerCase()}:
                </strong>

                <div style={variacoesGrid}>
                  {variacoes.map((variacao, index) => {
                    const selecionada = (variacaoAtual?.name || "") === variacao.name;

                    return (
                      <button
                        key={`${variacao.name}-${index}`}
                        type="button"
                        onClick={() => setVariacaoSelecionada(variacao)}
                        style={{
                          ...variacaoBotao,
                          ...(selecionada
                            ? {
                                borderColor: corPrincipal,
                                background: "#fff0f7",
                                boxShadow: "0 10px 24px rgba(236,25,113,0.12)",
                              }
                            : {}),
                        }}
                      >
                        <span>{variacao.name}</span>
                        <strong>{formatarPreco(variacao.price)}</strong>
                        {variacao.note && <small>{variacao.note}</small>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={infoRapidaGrid}>
              {produto.production_time && (
                <div style={infoRapidaCard}>
                  <strong>Prazo</strong>
                  <span>{produto.production_time}</span>
                </div>
              )}

              {produto.size && (
                <div style={infoRapidaCard}>
                  <strong>Tamanho</strong>
                  <span>{produto.size}</span>
                </div>
              )}

              {produto.finish && (
                <div style={infoRapidaCard}>
                  <strong>Acabamento</strong>
                  <span>{produto.finish}</span>
                </div>
              )}
            </div>

            <button
              onClick={abrirFormularioPedido}
              style={{ ...botaoWhatsappGrande, background: corPrincipal }}
            >
              💬 Solicitar orçamento no WhatsApp
            </button>

            <div style={boxAviso}>
              <strong>Produto sob encomenda</strong>
              <span>
                O valor pode variar conforme quantidade, personalização,
                acabamento e prazo.
              </span>
            </div>
          </div>
        </section>

        <section style={secaoDetalhes}>
          <div style={tituloSecao}>
            <span style={tituloEtiqueta}>Detalhes</span>
            <h2>Sobre este produto</h2>
          </div>

          <div style={descricaoCompletaBox}>
            {renderizarTextoFormatado(descricao)}

            {produto.personalization && (
              <p style={textoParagrafo}>
                <strong>Personalização:</strong> {produto.personalization}
              </p>
            )}
          </div>
        </section>

        <section style={secaoDetalhes}>
          <div style={tituloSecao}>
            <span style={tituloEtiqueta}>Vantagens</span>
            <h2>Por que escolher este produto?</h2>
          </div>

          <div style={destaquesGrid}>
            {[
              produto.highlight_1,
              produto.highlight_2,
              produto.highlight_3,
              produto.highlight_4,
            ]
              .filter(Boolean)
              .map((item, index) => (
                <div key={`${item}-${index}`} style={destaqueCard}>
                  <span style={{ ...destaqueNumero, background: corPrincipal }}>
                    {index + 1}
                  </span>
                  <strong>{item}</strong>
                </div>
              ))}
          </div>
        </section>

        {config.show_reviews && (
          <section style={secaoDetalhes}>
            <div style={tituloSecao}>
              <span style={tituloEtiqueta}>Avaliações</span>
              <h2>Quem já comprou e recomenda</h2>
            </div>

            <div style={avaliacoesGrid}>
              {avaliacoesPublicadas.length > 0 ? (
                avaliacoesPublicadas.slice(0, 3).map((item) => (
                  <div key={item.id} style={reviewCard}>
                    <div style={{ ...estrelas, color: corPrincipal }}>
                      {estrelasAvaliacao(item)}
                    </div>
                    <p>“{comentarioAvaliacao(item)}”</p>
                    <strong>{nomeAvaliacao(item)}</strong>
                    <span style={reviewProduto}>{produtoAvaliacao(item)}</span>
                  </div>
                ))
              ) : (
                <div style={reviewCard}>
                  <div style={{ ...estrelas, color: corPrincipal }}>★★★★★</div>
                  <p>“Produto lindo e atendimento impecável.”</p>
                  <strong>Cliente NM</strong>
                  <span style={reviewProduto}>Produto personalizado</span>
                </div>
              )}
            </div>
          </section>
        )}

        <section
          style={{
            ...ctaFinal,
            background: `linear-gradient(135deg, ${corPrincipal}, ${corSecundaria})`,
          }}
        >
          <div>
            <h2>Gostou desse produto?</h2>
            <p>Envie sua ideia pelo WhatsApp e receba um orçamento personalizado.</p>
          </div>

          <button onClick={abrirFormularioPedido} style={botaoClaro}>
            💬 Fazer orçamento
          </button>
        </section>
      </main>

      <footer style={rodape}>
        <strong>{config.store_name}</strong>
        <p>Personalizados criativos feitos sob medida.</p>
        <span>
          {config.instagram} • {config.address}
        </span>
      </footer>

      {formularioAberto && (
        <div style={modalOverlay} onClick={() => setFormularioAberto(false)}>
          <form
            style={leadModal}
            onSubmit={salvarSolicitacao}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={fecharModal}
              onClick={() => setFormularioAberto(false)}
            >
              ×
            </button>

            <span style={tituloEtiqueta}>Solicitar orçamento</span>
            <h2 style={leadTitulo}>Antes de ir para o WhatsApp</h2>
            <p style={leadTexto}>
              Preencha seus dados para sua solicitação já entrar em Clientes e
              Orçamentos no Admin.
            </p>

            <div style={leadResumoProduto}>
              <div>
                <strong>{produto.name}</strong>
                {variacaoAtual && (
                  <small style={leadVariacaoTexto}>
                    {etiquetaVariacao(produto)}: {variacaoAtual.name}
                  </small>
                )}
              </div>
              <span>{formatarPreco(precoProduto(produto, variacaoAtual))}</span>
            </div>

            <div style={leadGrid}>
              <label style={leadCampoBox}>
                Nome completo *
                <input
                  value={dadosSolicitacao.name}
                  onChange={(e) => atualizarSolicitacao("name", e.target.value)}
                  style={leadInput}
                  placeholder="Seu nome"
                />
              </label>

              <label style={leadCampoBox}>
                Telefone / WhatsApp *
                <input
                  value={dadosSolicitacao.whatsapp}
                  onChange={(e) => atualizarSolicitacao("whatsapp", e.target.value)}
                  style={leadInput}
                  placeholder="(11) 99999-9999"
                />
              </label>

              <label style={leadCampoBox}>
                E-mail
                <input
                  type="email"
                  value={dadosSolicitacao.email}
                  onChange={(e) => atualizarSolicitacao("email", e.target.value)}
                  style={leadInput}
                  placeholder="seuemail@exemplo.com"
                />
              </label>

              <label style={leadCampoBox}>
                Instagram
                <input
                  value={dadosSolicitacao.instagram}
                  onChange={(e) => atualizarSolicitacao("instagram", e.target.value)}
                  style={leadInput}
                  placeholder="@seuperfil"
                />
              </label>

              <label style={leadCampoBox}>
                Quantidade
                <input
                  type="number"
                  min="1"
                  value={dadosSolicitacao.quantity}
                  onChange={(e) => atualizarSolicitacao("quantity", e.target.value)}
                  style={leadInput}
                />
              </label>

              <label style={leadCampoBox}>
                Endereço
                <input
                  value={dadosSolicitacao.address}
                  onChange={(e) => atualizarSolicitacao("address", e.target.value)}
                  style={leadInput}
                  placeholder="Rua, número, bairro, cidade"
                />
              </label>
            </div>

            <label style={{ ...leadCampoBox, marginTop: "14px" }}>
              Descreva o que você quer personalizar *
              <textarea
                value={dadosSolicitacao.description}
                onChange={(e) => atualizarSolicitacao("description", e.target.value)}
                style={leadTextarea}
                placeholder="Tema, nome, cor, tamanho, data, detalhes da arte..."
              />
            </label>

            <button
              type="submit"
              disabled={salvandoSolicitacao}
              style={{
                ...botaoRosaGrande,
                background: corPrincipal,
                marginTop: "16px",
              }}
            >
              {salvandoSolicitacao
                ? "Salvando..."
                : "Salvar e enviar para o WhatsApp"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const pagina = {
  minHeight: "100vh",
  background: "#fff1f7",
  color: "#33272f",
  fontFamily: "Inter, Arial, sans-serif",
};

const carregandoBox = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  color: "#8b1747",
  fontWeight: "900",
  fontSize: "20px",
};

const topo = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid #f7cfe0",
  padding: "14px 7%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
};

const logoLink = {
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const logo = {
  width: "58px",
  height: "58px",
  borderRadius: "16px",
  color: "#fff",
  display: "grid",
  placeItems: "center",
  fontWeight: "900",
};

const logoImagem = {
  height: "70px",
  width: "auto",
  objectFit: "contain",
};

const botaoVoltar = {
  background: "#fff",
  border: "1px solid #f6cfe0",
  borderRadius: "999px",
  padding: "11px 18px",
  textDecoration: "none",
  fontWeight: "900",
};

const container = {
  width: "min(1180px, 92%)",
  margin: "0 auto",
  padding: "34px 0 70px",
};

const produtoHero = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 510px) minmax(0, 1fr)",
  gap: "38px",
  alignItems: "start",
};

const midiaPrincipalBox = {
  background: "#fff",
  border: "1px solid #f6cfe0",
  borderRadius: "26px",
  overflow: "hidden",
  position: "relative",
  width: "100%",
  aspectRatio: "4 / 5",
  display: "grid",
  placeItems: "center",
  boxShadow: "0 18px 45px rgba(236,25,113,0.10)",
};

const midiaImagem = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  background: "#fff",
  transformOrigin: "center center",
};

const midiaVideo = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  background: "#000",
};

const semImagem = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  fontSize: "42px",
  background: "#ffe5f0",
};

const setaCarrossel = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  border: "none",
  background: "rgba(236,25,113,0.92)",
  color: "#fff",
  fontSize: "32px",
  lineHeight: "1",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
};

const contadorMidia = {
  position: "absolute",
  right: "14px",
  bottom: "14px",
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  borderRadius: "999px",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: "900",
};

const miniaturasBox = {
  display: "flex",
  gap: "10px",
  overflowX: "auto",
  padding: "12px 2px 6px",
};

const miniaturaBotao = {
  width: "74px",
  height: "74px",
  border: "2px solid #f6cfe0",
  borderRadius: "14px",
  overflow: "hidden",
  background: "#fff4f9",
  cursor: "pointer",
  padding: 0,
  flex: "0 0 auto",
};

const miniaturaImagem = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  background: "#fff",
};

const miniaturaVideo = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  color: "#EC1971",
  fontSize: "24px",
  fontWeight: "900",
};

const produtoConteudo = {
  background: "#fff",
  border: "1px solid #f6cfe0",
  borderRadius: "26px",
  padding: "30px",
  boxShadow: "0 18px 45px rgba(236,25,113,0.08)",
};

const tag = {
  display: "inline-block",
  background: "#ffe3ef",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
};

const tituloProduto = {
  fontSize: "42px",
  color: "#241925",
  lineHeight: "1.08",
  margin: "18px 0 12px",
};

const precoProdutoEstilo = {
  fontSize: "34px",
  margin: "0 0 18px",
};

const descricaoCurta = {
  color: "#68495a",
  lineHeight: "1.7",
  fontSize: "17px",
  margin: "0 0 20px",
};

const variacoesBox = {
  background: "#fff",
  border: "1px solid #f6cfe0",
  borderRadius: "20px",
  padding: "18px",
  marginBottom: "18px",
};

const variacoesTitulo = {
  display: "block",
  color: "#8b1747",
  marginBottom: "12px",
};

const variacoesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: "10px",
};

const variacaoBotao = {
  border: "1px solid #f6cfe0",
  background: "#fff8fb",
  color: "#4d3542",
  borderRadius: "16px",
  padding: "12px",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  textAlign: "left",
  fontWeight: "800",
};

const infoRapidaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "10px",
  margin: "18px 0",
};

const infoRapidaCard = {
  background: "#fff8fb",
  border: "1px solid #f6cfe0",
  borderRadius: "16px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  color: "#68495a",
};

const botaoWhatsappGrande = {
  width: "100%",
  border: "none",
  color: "#fff",
  padding: "16px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "16px",
  marginTop: "10px",
};

const boxAviso = {
  marginTop: "14px",
  background: "#fff8fb",
  border: "1px dashed #f2bfd5",
  borderRadius: "16px",
  padding: "14px",
  color: "#68495a",
  display: "flex",
  flexDirection: "column",
  gap: "5px",
};

const secaoDetalhes = {
  marginTop: "54px",
};

const tituloSecao = {
  textAlign: "center",
  marginBottom: "22px",
};

const tituloEtiqueta = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  background: "#fff",
  color: "#EC1971",
  border: "1px solid #f6cfe0",
  borderRadius: "999px",
  padding: "7px 14px",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "0.8px",
  textTransform: "uppercase",
  boxShadow: "0 8px 18px rgba(236,25,113,0.08)",
};

const descricaoCompletaBox = {
  background: "#fff",
  border: "1px solid #f6cfe0",
  borderRadius: "22px",
  padding: "26px",
  color: "#4d3542",
  lineHeight: "1.7",
  fontSize: "16px",
};

const textoParagrafo = {
  margin: "0 0 12px",
};

const listaFormatada = {
  margin: "0 0 14px",
  paddingLeft: "22px",
};

const destaquesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const destaqueCard = {
  background: "#fff",
  border: "1px solid #f6cfe0",
  borderRadius: "20px",
  padding: "22px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  boxShadow: "0 8px 24px rgba(236,25,113,0.06)",
};

const destaqueNumero = {
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  color: "#fff",
  display: "grid",
  placeItems: "center",
  fontWeight: "900",
  flexShrink: 0,
};

const avaliacoesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "18px",
};

const reviewCard = {
  background: "#fff",
  border: "1px solid #f6cfe0",
  borderRadius: "18px",
  padding: "24px",
  textAlign: "center",
  boxShadow: "0 8px 24px rgba(236,25,113,0.06)",
};

const reviewProduto = {
  display: "block",
  marginTop: "8px",
  color: "#9b687f",
  fontSize: "13px",
  fontWeight: "800",
};

const estrelas = {
  color: "#EC1971",
  letterSpacing: "3px",
};

const ctaFinal = {
  marginTop: "70px",
  color: "#fff",
  borderRadius: "22px",
  padding: "38px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
};

const botaoClaro = {
  border: "none",
  background: "#fff",
  color: "#EC1971",
  padding: "14px 24px",
  borderRadius: "999px",
  fontWeight: "900",
  cursor: "pointer",
};

const rodape = {
  background: "#fff",
  borderTop: "1px solid #f6cfe0",
  padding: "34px 7%",
  textAlign: "center",
  color: "#8b6072",
};

const produtoNaoEncontrado = {
  background: "#fff",
  border: "1px solid #f6cfe0",
  borderRadius: "26px",
  padding: "44px",
  textAlign: "center",
};

const botaoPrincipal = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  color: "#fff",
  padding: "14px 22px",
  borderRadius: "999px",
  fontWeight: "900",
  marginTop: "16px",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  zIndex: 50,
  display: "grid",
  placeItems: "center",
  padding: "20px",
};

const leadModal = {
  background: "#fff",
  borderRadius: "26px",
  padding: "30px",
  width: "min(760px, 96vw)",
  maxHeight: "92vh",
  overflowY: "auto",
  position: "relative",
  boxShadow: "0 30px 80px rgba(0,0,0,0.18)",
};

const fecharModal = {
  position: "absolute",
  right: "18px",
  top: "14px",
  border: "none",
  background: "#ffe3ef",
  color: "#ec1971",
  borderRadius: "50%",
  width: "36px",
  height: "36px",
  fontSize: "22px",
  cursor: "pointer",
};

const leadTitulo = {
  fontSize: "30px",
  color: "#241925",
  margin: "16px 0 6px",
  lineHeight: "1.1",
};

const leadTexto = {
  color: "#7b5a6a",
  margin: "0 0 18px",
  lineHeight: "1.5",
};

const leadResumoProduto = {
  background: "#fff4f9",
  border: "1px solid #f6cfe0",
  borderRadius: "18px",
  padding: "16px",
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "center",
  marginBottom: "18px",
  color: "#8b1747",
};

const leadVariacaoTexto = {
  display: "block",
  marginTop: "4px",
  color: "#9b687f",
  fontSize: "13px",
  fontWeight: "800",
};

const leadGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const leadCampoBox = {
  display: "flex",
  flexDirection: "column",
  gap: "7px",
  color: "#4d3542",
  fontWeight: "800",
  fontSize: "14px",
};

const leadInput = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #f2bfd5",
  borderRadius: "14px",
  padding: "13px 14px",
  outline: "none",
  fontSize: "15px",
  background: "#fff",
  color: "#8b1747",
  fontWeight: "600",
};

const leadTextarea = {
  ...leadInput,
  minHeight: "110px",
  resize: "vertical",
};

const botaoRosaGrande = {
  width: "100%",
  border: "none",
  color: "#fff",
  padding: "15px",
  borderRadius: "14px",
  fontWeight: "900",
  cursor: "pointer",
};
