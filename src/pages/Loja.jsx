import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import ReviewForm from "../components/ReviewForm";

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

export default function Loja() {
  const [config, setConfig] = useState(configPadrao);
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  const [produtoAberto, setProdutoAberto] = useState(null);
  const [midiaIndex, setMidiaIndex] = useState(0);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
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
  }, []);

  async function carregarDados() {
    try {
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

      const categoriasSnap = await getDocs(collection(db, "categories"));
      const listaCategorias = categoriasSnap.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      const reviewsSnap = await getDocs(collection(db, "reviews"));
      const listaReviews = reviewsSnap.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      setProdutos(listaProdutos.filter((item) => item.available !== false));
      setCategorias(listaCategorias);
      setAvaliacoes(listaReviews.filter((item) => item.status !== "oculto"));
    } catch (erro) {
      console.error("Erro ao carregar loja:", erro);
    }
  }

  function limparNumero(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function numeroWhatsApp() {
    const numero = limparNumero(config.whatsapp);
    if (numero.startsWith("55")) return numero;
    return `55${numero}`;
  }

  function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function imagemProduto(produto) {
    return produto.image_url_1 || produto.image_url || produto.photo_url || "";
  }

  function imagensProduto(produto) {
    if (!produto) return [];

    const urls = [
      produto.image_url_1,
      produto.image_url_2,
      produto.image_url_3,
      produto.image_url_4,
      produto.image_url_5,
      produto.image_url,
      produto.photo_url,
    ]
      .filter(Boolean)
      .map((url) => String(url).trim())
      .filter(Boolean);

    return [...new Set(urls)];
  }

  function videoProduto(produto) {
    return (
      produto?.video_url ||
      produto?.video ||
      produto?.video_link ||
      produto?.reel_url ||
      ""
    );
  }

  function abrirDetalhesProduto(produto) {
    setMidiaIndex(0);
    setProdutoAberto(produto);
  }

  function midiasProduto(produto) {
    const imagens = imagensProduto(produto).map((url) => ({
      type: "image",
      url,
    }));

    const video = videoProduto(produto);

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
        <p style={modalTextoParagrafo}>
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
        <ul key={`lista-${key}`} style={modalListaFormatada}>
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
        <p key={`p-${index}`} style={modalTextoParagrafo}>
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

  function abrirFormularioPedido(produto = null) {
    setProdutoSelecionado(produto);
    setProdutoAberto(null);
    setDadosSolicitacao({
      name: "",
      whatsapp: "",
      email: "",
      instagram: "",
      address: "",
      description: produto
        ? `Tenho interesse em personalizar: ${produto.name}.`
        : "Gostaria de fazer um orçamento personalizado.",
      quantity: 1,
    });
    setFormularioAberto(true);
  }

  function montarMensagemWhatsApp(produto, dados) {
    const nomeProduto = produto?.name || "Orçamento personalizado";
    const valorProduto = produto?.price ? formatarPreco(produto.price) : "A definir";

    return `Olá! Vim pela loja da ${config.store_name} e gostaria de fazer um orçamento.

` +
      `Produto: ${nomeProduto}
` +
      `Quantidade: ${dados.quantity || 1}
` +
      `Valor de referência: ${valorProduto}

` +
      `Meus dados:
` +
      `Nome: ${dados.name}
` +
      `Telefone: ${dados.whatsapp}
` +
      `E-mail: ${dados.email || "Não informado"}
` +
      `Instagram: ${dados.instagram || "Não informado"}
` +
      `Endereço: ${dados.address || "Não informado"}

` +
      `Descrição do pedido:
${dados.description}`;
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
      const valorUnitario = Number(produtoSelecionado?.price || 0);
      const valorTotal = valorUnitario * quantidade;

      const clienteRef = await addDoc(collection(db, "clients"), {
        name: dadosSolicitacao.name.trim(),
        whatsapp: dadosSolicitacao.whatsapp.trim(),
        email: dadosSolicitacao.email.trim(),
        instagram: dadosSolicitacao.instagram.trim(),
        address: dadosSolicitacao.address.trim(),
        city: "",
        notes: dadosSolicitacao.description.trim(),
        source: "Loja",
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
        product_id: produtoSelecionado?.id || "",
        product_name: produtoSelecionado?.name || "Orçamento personalizado",
        quantity: quantidade,
        unit_value: valorUnitario,
        total_value: valorTotal,
        production_time: produtoSelecionado?.production_time || "A combinar",
        valid_until: "",
        status: "aberto",
        source: "Loja",
        seller: "Site",
        notes: dadosSolicitacao.description.trim(),
        created_at: new Date(),
      });

      const mensagem = montarMensagemWhatsApp(produtoSelecionado, dadosSolicitacao);

      setFormularioAberto(false);
      setProdutoSelecionado(null);

      window.open(
        `https://wa.me/${numeroWhatsApp()}?text=${encodeURIComponent(mensagem)}`,
        "_blank"
      );
    } catch (erro) {
      console.error("Erro ao salvar solicitação:", erro);
      alert("Erro ao salvar sua solicitação. Tente novamente.");
    } finally {
      setSalvandoSolicitacao(false);
    }
  }

  const categoriasVisiveis = useMemo(() => {
    const lista = categorias.length
      ? categorias
      : [
          { id: "cartonagem", name: "Cartonagem", slug: "cartonagem" },
          { id: "agendas", name: "Agendas", slug: "agendas" },
          { id: "cadernetas", name: "Cadernetas", slug: "cadernetas" },
        ];

    return [{ id: "todos", name: "Todos", slug: "todos" }, ...lista];
  }, [categorias]);

  const produtosFiltrados = produtos.filter((produto) => {
    const termo = busca.toLowerCase().trim();

    const bateBusca =
      !termo ||
      String(produto.name || "").toLowerCase().includes(termo) ||
      String(produto.short_description || "").toLowerCase().includes(termo) ||
      String(produto.category || "").toLowerCase().includes(termo);

    const bateCategoria =
      categoriaAtiva === "todos" || produto.category === categoriaAtiva;

    return bateBusca && bateCategoria;
  });

  const destaques = produtosFiltrados
    .filter((produto) => produto.featured)
    .slice(0, 4);

  const corPrincipal = config.primary_color || "#EC1971";
  const corSecundaria = config.secondary_color || "#7B1FA2";
  const bannerUrl = config.banner_url || configPadrao.banner_url;

  return (
    <div style={pagina}>
      <header style={topo}>
        <div style={marcaBox}>
          {config.logo_url ? (
            <img src={config.logo_url} alt={config.store_name} style={logoImagem} />
          ) : (
            <div style={{ ...logo, background: corPrincipal }}>NM</div>
          )}
        </div>

        <div style={buscaTopo}>
          <span>🔎</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto, categoria..."
            style={inputBusca}
          />
        </div>

        <nav style={menu}>
          <a href="#produtos">Produtos</a>
          <a href="#como-comprar">Como comprar</a>
          <a href="#avaliar">Avaliar</a>

          {config.show_whatsapp_button && (
            <button
              onClick={() => abrirFormularioPedido(null)}
              style={{ ...botaoWhatsappTopo, background: corPrincipal }}
            >
              <span>💬</span> WhatsApp
            </button>
          )}
        </nav>
      </header>

      <main style={container}>
        <section style={hero}>
          <img src={bannerUrl} alt={config.store_name} style={bannerImagem} />
        </section>

        <p style={subHero}>{config.store_subtitle}</p>

        <section style={categoriasBox}>
          {categoriasVisiveis.slice(0, 9).map((categoria) => (
            <button
              key={categoria.id}
              onClick={() => setCategoriaAtiva(categoria.slug)}
              style={{
                ...categoriaChip,
                ...(categoriaAtiva === categoria.slug
                  ? {
                      background: corPrincipal,
                      color: "#fff",
                      borderColor: corPrincipal,
                    }
                  : {}),
              }}
            >
              {categoria.slug === "todos" ? "🛍️" : "🎁"}
              <span>{categoria.name}</span>
            </button>
          ))}
        </section>

        {destaques.length > 0 && (
          <section style={secao}>
            <div style={tituloSecao}>
              <span style={tituloEtiqueta}>✨ Destaques</span>
              <h2 style={tituloPrincipalSecao}>Mais pedidos da NM</h2>
            </div>

            <div style={gridDestaques}>
              {destaques.map((produto) => (
                <ProdutoCard
                  key={produto.id}
                  produto={produto}
                  config={config}
                  corPrincipal={corPrincipal}
                  formatarPreco={formatarPreco}
                  imagemProduto={imagemProduto}
                  onDetalhes={() => abrirDetalhesProduto(produto)}
                  onWhatsApp={() => abrirFormularioPedido(produto)}
                />
              ))}
            </div>
          </section>
        )}

        <section style={secao} id="produtos">
          <div style={tituloSecao}>
            <span style={tituloEtiqueta}>🛍️ Catálogo</span>
            <h2 style={tituloPrincipalSecao}>Nossa coleção</h2>
            <p style={textoSecao}>{produtosFiltrados.length} produto(s) encontrado(s)</p>
          </div>

          <div style={gridProdutos}>
            {produtosFiltrados.length === 0 ? (
              <div style={vazio}>Nenhum produto encontrado.</div>
            ) : (
              produtosFiltrados.map((produto) => (
                <ProdutoCard
                  key={produto.id}
                  produto={produto}
                  config={config}
                  corPrincipal={corPrincipal}
                  formatarPreco={formatarPreco}
                  imagemProduto={imagemProduto}
                  onDetalhes={() => abrirDetalhesProduto(produto)}
                  onWhatsApp={() => abrirFormularioPedido(produto)}
                />
              ))
            )}
          </div>
        </section>

        <section style={comoComprar} id="como-comprar">
          <div style={tituloSecao}>
            <span style={tituloEtiqueta}>💕 Passo a passo</span>
            <h2 style={tituloPrincipalSecao}>Como funciona?</h2>
            <p style={textoSecao}>Em poucos passinhos você recebe seu produto personalizado.</p>
          </div>

          <div style={passosGrid}>
            <Passo numero="1" emoji="🛍️" titulo="Escolha o produto" texto="Navegue pelo catálogo e selecione o que deseja." cor="#ffe7f3" numeroCor="#ff4d94" />
            <Passo numero="2" emoji="📐" titulo="Escolha as opções" texto="Tamanho, cor e personalização." cor="#f0ebff" numeroCor="#7b61ff" />
            <Passo numero="3" emoji="🧮" titulo="Envie pelo WhatsApp" texto="Finalize o pedido diretamente conosco." cor="#e6fff3" numeroCor="#00b96b" />
            <Passo numero="4" emoji="🏠" titulo="Receba em casa" texto="Entrega rápida ou retirada no local." cor="#fff8d8" numeroCor="#d89b00" />
          </div>
        </section>

        {config.show_reviews && (
          <>
            <section style={avaliacoesBox} id="avaliacoes">
              <div style={tituloSecao}>
                <span style={tituloEtiqueta}>⭐ Depoimentos</span>
                <h2 style={tituloPrincipalSecao}>Quem já comprou e recomenda</h2>
              </div>

              <div style={avaliacoesGrid}>
                {avaliacoes.filter((item) => item.status === "aprovado").length > 0 ? (
                  avaliacoes
                    .filter((item) => item.status === "aprovado")
                    .slice(0, 3)
                    .map((item) => (
                      <div key={item.id} style={reviewCard}>
                        <div style={{ ...estrelas, color: corPrincipal }}>★★★★★</div>
                        <p>
                          “
                          {item.comment ||
                            item.text ||
                            "Produto lindo e atendimento impecável."}
                          ”
                        </p>
                        <strong>{item.client_name || item.name || "Cliente NM"}</strong>
                      </div>
                    ))
                ) : (
                  <>
                    <Review texto="Produto lindo e atendimento impecável." />
                    <Review texto="Ficou perfeito, do jeitinho que eu queria. Atendimento ótimo e acabamento lindo." />
                  </>
                )}
              </div>
            </section>
              </>
        )}

        <div id="avaliar">
          <ReviewForm corPrincipal={corPrincipal} />
        </div>

        <section
          style={{
            ...ctaFinal,
            background: `linear-gradient(135deg, ${corPrincipal}, ${corSecundaria})`,
          }}
        >
          <div>
            <h2>Quer um produto personalizado?</h2>
            <p>Me chama no WhatsApp e vamos transformar sua ideia em algo único.</p>
          </div>

          <button onClick={() => abrirFormularioPedido(null)} style={botaoClaro}>
            <span>💬</span> Fazer orçamento
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

      {config.show_whatsapp_button && (
        <button onClick={() => abrirFormularioPedido(null)} style={botaoFlutuante}>
          💬
        </button>
      )}

      {formularioAberto && (
        <div style={modalOverlay} onClick={() => setFormularioAberto(false)}>
          <form style={leadModal} onSubmit={salvarSolicitacao} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={fecharModal} onClick={() => setFormularioAberto(false)}>
              ×
            </button>

            <span style={tituloEtiqueta}>💬 Solicitar orçamento</span>
            <h2 style={leadTitulo}>Antes de ir para o WhatsApp</h2>
            <p style={leadTexto}>
              Preencha seus dados para sua solicitação já entrar em Clientes e Orçamentos no Admin.
            </p>

            <div style={leadResumoProduto}>
              <strong>{produtoSelecionado?.name || "Orçamento personalizado"}</strong>
              <span>
                {produtoSelecionado?.price
                  ? formatarPreco(produtoSelecionado.price)
                  : "Valor a definir"}
              </span>
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
              style={{ ...botaoRosaGrande, background: corPrincipal, marginTop: "16px" }}
            >
              {salvandoSolicitacao ? "Salvando..." : "Salvar e enviar para o WhatsApp"}
            </button>
          </form>
        </div>
      )}

      {produtoAberto && (
        <div style={modalOverlay} onClick={() => setProdutoAberto(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <button style={fecharModal} onClick={() => setProdutoAberto(null)}>
              ×
            </button>

            {(() => {
              const midias = midiasProduto(produtoAberto);
              const midiaAtual = midias[midiaIndex] || null;
              const descricao =
                produtoAberto.full_description ||
                produtoAberto.description ||
                produtoAberto.short_description ||
                "";

              return (
                <div style={modalGrid}>
                  <div style={modalImagemBox}>
                    {midiaAtual ? (
                      midiaAtual.type === "video" ? (
                        <video
                          src={midiaAtual.url}
                          controls
                          style={modalVideo}
                        />
                      ) : (
                        <img
                          src={midiaAtual.url}
                          alt={produtoAberto.name}
                          style={modalImagem}
                        />
                      )
                    ) : (
                      <div style={semImagem}>✨</div>
                    )}

                    {midias.length > 1 && (
                      <>
                        <button
                          type="button"
                          style={{ ...setaCarrossel, left: "12px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            midiaAnterior(midias.length);
                          }}
                        >
                          ‹
                        </button>

                        <button
                          type="button"
                          style={{ ...setaCarrossel, right: "12px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            proximaMidia(midias.length);
                          }}
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
                            borderColor:
                              index === midiaIndex ? corPrincipal : "#f6cfe0",
                          }}
                        >
                          {midia.type === "video" ? (
                            <span style={miniaturaVideo}>▶</span>
                          ) : (
                            <img
                              src={midia.url}
                              alt={`Imagem ${index + 1}`}
                              style={miniaturaImagem}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={modalConteudo}>
                    <span style={{ ...tag, color: corPrincipal }}>
                      {produtoAberto.category || "Personalizado"}
                    </span>

                    <h2 style={modalTitulo}>{produtoAberto.name}</h2>

                    {config.show_prices && (
                      <h3 style={{ ...modalPreco, color: corPrincipal }}>
                        {formatarPreco(produtoAberto.price)}
                      </h3>
                    )}

                    <div style={modalDescricaoBox}>
                      {renderizarTextoFormatado(descricao)}
                    </div>

                    <ul style={listaDetalhes}>
                      {produtoAberto.production_time && (
                        <li>
                          <strong>Prazo:</strong> {produtoAberto.production_time}
                        </li>
                      )}
                      {produtoAberto.size && (
                        <li>
                          <strong>Tamanho:</strong> {produtoAberto.size}
                        </li>
                      )}
                      {produtoAberto.finish && (
                        <li>
                          <strong>Acabamento:</strong> {produtoAberto.finish}
                        </li>
                      )}
                      {produtoAberto.personalization && (
                        <li>{produtoAberto.personalization}</li>
                      )}
                    </ul>

                    <button
                      onClick={() => abrirFormularioPedido(produtoAberto)}
                      style={{ ...botaoRosaGrande, background: corPrincipal }}
                    >
                      💬 Pedir pelo WhatsApp
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function ProdutoCard({ produto, config, corPrincipal, formatarPreco, imagemProduto, onDetalhes, onWhatsApp }) {
  return (
    <div style={produtoCard}>
      <div style={produtoImagemBox}>
        {produto.featured && <span style={{ ...destaqueBadge, background: corPrincipal }}>Destaque</span>}
        {imagemProduto(produto) ? <img src={imagemProduto(produto)} alt={produto.name} style={produtoImagem} /> : <div style={semImagem}>✨</div>}
      </div>

      <div style={produtoInfo}>
        <span style={{ ...tag, color: corPrincipal }}>{produto.category || "Personalizado"}</span>
        <h3 style={produtoNome}>{produto.name}</h3>
        <p style={produtoDescricao}>{produto.short_description || "Produto personalizado feito sob encomenda."}</p>
        <div style={precoBox}>
          {config.show_prices && <strong style={{ ...produtoPreco, color: corPrincipal }}>{formatarPreco(produto.price)}</strong>}
          <span style={produtoObservacao}>Personalizado sob orçamento</span>
        </div>
        <div style={produtoAcoes}>
          <button onClick={onDetalhes} style={{ ...botaoOutline, color: corPrincipal }}>Ver produto</button>
          <button onClick={onWhatsApp} style={{ ...botaoPedido, background: corPrincipal }}>💬 Pedir</button>
        </div>
      </div>
    </div>
  );
}

function Passo({ numero, emoji, titulo, texto, cor, numeroCor }) {
  return (
    <div style={{ ...passoCard, background: cor, position: "relative" }}>
      <div style={{ position: "absolute", top: "-12px", right: "-12px", width: "34px", height: "34px", borderRadius: "50%", background: numeroCor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px" }}>
        {numero}
      </div>
      <div style={{ fontSize: "38px", marginBottom: "16px" }}>{emoji}</div>
      <h3>{titulo}</h3>
      <p>{texto}</p>
    </div>
  );
}

function Review({ texto }) {
  return (
    <div style={reviewCard}>
      <div style={estrelas}>★★★★★</div>
      <p>“{texto}”</p>
      <strong>Cliente NM</strong>
    </div>
  );
}

const pagina = { minHeight: "100vh", background: "#fff1f7", color: "#33272f", fontFamily: "Inter, Arial, sans-serif" };
const topo = { position: "sticky", top: 0, zIndex: 20, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #f7cfe0", padding: "14px 7%", display: "grid", gridTemplateColumns: "140px 1fr auto", gap: "24px", alignItems: "center" };
const marcaBox = { display: "flex", alignItems: "center" };
const logo = { width: "58px", height: "58px", borderRadius: "16px", color: "#fff", display: "grid", placeItems: "center", fontWeight: "900" };
const logoImagem = { height: "70px", width: "auto", objectFit: "contain" };
const buscaTopo = { background: "#fff", border: "1px solid #f3bfd5", borderRadius: "999px", padding: "0 16px", display: "flex", alignItems: "center", gap: "8px" };
const inputBusca = { width: "100%", height: "42px", border: "none", outline: "none", background: "transparent" };
const menu = { display: "flex", alignItems: "center", gap: "18px", fontWeight: "800", fontSize: "14px" };
const botaoWhatsappTopo = { border: "none", color: "#fff", padding: "12px 20px", borderRadius: "999px", fontWeight: "900", cursor: "pointer" };
const container = { width: "min(1180px, 92%)", margin: "0 auto", padding: "34px 0 70px" };
const hero = { borderRadius: "24px", overflow: "hidden", boxShadow: "0 20px 50px rgba(236,25,113,0.13)" };
const bannerImagem = { width: "100%", display: "block" };
const subHero = { textAlign: "center", color: "#9b687f", margin: "18px 0 26px" };
const categoriasBox = { display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "12px", marginBottom: "42px" };
const categoriaChip = { border: "1px solid #f2bfd5", background: "#fff", color: "#9b4266", padding: "12px 18px", borderRadius: "999px", cursor: "pointer", fontWeight: "800", display: "flex", gap: "8px", alignItems: "center" };
const secao = { marginTop: "50px" };
const tituloSecao = { textAlign: "center", marginBottom: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" };
const tituloEtiqueta = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "#fff", color: "#EC1971", border: "1px solid #f6cfe0", borderRadius: "999px", padding: "7px 14px", fontSize: "11px", fontWeight: "900", letterSpacing: "0.8px", textTransform: "uppercase", boxShadow: "0 8px 18px rgba(236,25,113,0.08)" };
const tituloPrincipalSecao = { fontSize: "30px", lineHeight: "1.1", color: "#8b1747", margin: "4px 0 0", fontFamily: "Georgia, serif" };
const textoSecao = { color: "#9b687f", fontSize: "15px", margin: "4px 0 0" };
const gridProdutos = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(245px, 1fr))", gap: "24px" };
const gridDestaques = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" };
const produtoCard = { background: "#fff", borderRadius: "18px", overflow: "hidden", border: "1px solid #f6cfe0", boxShadow: "0 10px 30px rgba(236,25,113,0.08)" };
const produtoImagemBox = { height: "250px", background: "#ffe5f0", position: "relative", overflow: "hidden" };
const produtoImagem = { width: "100%", height: "100%", objectFit: "cover" };
const semImagem = { width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: "42px", background: "#ffe5f0" };
const destaqueBadge = { position: "absolute", right: "10px", top: "10px", color: "#fff", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "900", zIndex: 2 };
const produtoInfo = { padding: "24px 20px 22px", textAlign: "center" };
const tag = { display: "inline-block", background: "#ffe3ef", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "900" };
const produtoAcoes = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px" };
const botaoOutline = { border: "1px solid #f2bfd5", background: "#fff4f9", padding: "11px", borderRadius: "12px", fontWeight: "900", cursor: "pointer" };
const botaoPedido = { border: "none", color: "#fff", padding: "11px", borderRadius: "12px", fontWeight: "900", cursor: "pointer" };
const comoComprar = { marginTop: "70px" };
const passosGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" };
const passoCard = { padding: "28px 20px", borderRadius: "20px", textAlign: "center", border: "1px solid rgba(0,0,0,0.06)" };
const avaliacoesBox = { marginTop: "70px" };
const avaliacoesGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "18px" };
const reviewCard = { background: "#fff", border: "1px solid #f6cfe0", borderRadius: "18px", padding: "24px", textAlign: "center", boxShadow: "0 8px 24px rgba(236,25,113,0.06)" };
const estrelas = { color: "#EC1971", letterSpacing: "3px" };
const ctaFinal = { marginTop: "70px", color: "#fff", borderRadius: "22px", padding: "38px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" };
const botaoClaro = { border: "none", background: "#fff", color: "#EC1971", padding: "14px 24px", borderRadius: "999px", fontWeight: "900", cursor: "pointer" };
const rodape = { background: "#fff", borderTop: "1px solid #f6cfe0", padding: "34px 7%", textAlign: "center", color: "#8b6072" };
const botaoFlutuante = { position: "fixed", right: "24px", bottom: "24px", width: "54px", height: "54px", borderRadius: "50%", border: "none", background: "#25D366", color: "#fff", fontSize: "24px", cursor: "pointer", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" };
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
  color: "#8b1747",           // ← texto vinho/rosa escuro
  fontWeight: "600",
};

const leadTextarea = {
  ...leadInput,
  minHeight: "110px",
  resize: "vertical",
  color: "#8b1747",
};

const modalOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "grid", placeItems: "center", padding: "20px" };
const modal = {
  background: "#fff",
  borderRadius: "28px",
  padding: "28px",
  width: "min(1180px, 96vw)",
  maxHeight: "92vh",
  overflowY: "auto",
  position: "relative",
  boxShadow: "0 30px 90px rgba(0,0,0,0.22)",
};
const fecharModal = { position: "absolute", right: "18px", top: "14px", border: "none", background: "#ffe3ef", color: "#ec1971", borderRadius: "50%", width: "36px", height: "36px", fontSize: "22px", cursor: "pointer" };
const modalGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(340px, 470px) minmax(360px, 1fr)",
  gap: "34px",
  alignItems: "start",
};
const modalImagemBox = {
  background: "#fff",
  border: "1px solid #f6cfe0",
  borderRadius: "22px",
  overflow: "hidden",
  position: "relative",
  width: "100%",
  aspectRatio: "4 / 5",
  display: "grid",
  placeItems: "center",
};
const modalImagem = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  background: "#fff",
};
const modalVideo = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  background: "#000",
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
  gridColumn: "1 / 2",
  display: "flex",
  gap: "10px",
  overflowX: "auto",
  padding: "2px 0 6px",
  marginTop: "-18px",
};

const miniaturaBotao = {
  width: "70px",
  height: "70px",
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
  objectFit: "cover",
  display: "block",
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

const modalConteudo = {
  minWidth: 0,
  alignSelf: "start",
  gridColumn: "2 / 3",
  gridRow: "1 / 3",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  alignItems: "stretch",
  paddingTop: "0px",
};

const modalTitulo = {
  fontSize: "32px",
  color: "#241925",
  lineHeight: "1.12",
  margin: "16px 0 10px",
};

const modalPreco = {
  fontSize: "28px",
  margin: "0 0 18px",
};

const modalDescricaoBox = {
  background: "#fff8fb",
  border: "1px solid #f6cfe0",
  borderRadius: "20px",
  padding: "20px",
  color: "#4d3542",
  lineHeight: "1.7",
  maxHeight: "430px",
  overflowY: "auto",
  marginBottom: "18px",
  fontSize: "15px",
};

const modalTextoParagrafo = {
  margin: "0 0 12px",
};

const modalListaFormatada = {
  margin: "0 0 14px",
  paddingLeft: "22px",
};
const listaDetalhes = {
  lineHeight: "1.8",
  color: "#68495a",
  paddingLeft: "20px",
  margin: "18px 0",
};
const botaoRosaGrande = { width: "100%", border: "none", color: "#fff", padding: "15px", borderRadius: "14px", fontWeight: "900", cursor: "pointer" };
const vazio = { gridColumn: "1 / -1", background: "#fff", border: "1px dashed #f2bfd5", padding: "35px", borderRadius: "18px", textAlign: "center" };
const produtoNome = { fontSize: "22px", fontWeight: "900", lineHeight: "1.18", color: "#241925", margin: "18px 0 12px" };
const produtoDescricao = { fontSize: "16px", lineHeight: "1.45", color: "#5f4b58", margin: "0 0 18px", minHeight: "68px" };
const precoBox = { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", margin: "8px 0 16px" };
const produtoPreco = { fontSize: "24px", fontWeight: "950", lineHeight: "1" };
const produtoObservacao = { fontSize: "12px", color: "#9b687f", fontWeight: "700" };
