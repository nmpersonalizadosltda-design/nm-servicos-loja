import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

const produtoInicial = {
  name: "",
  slug: "",
  price: "",
  category: "",
  short_description: "",
  full_description: "",
  image_url_1: "",
  image_url_2: "",
  image_url_3: "",
  image_url_4: "",
  video_url: "",
  production_time: "",
  size: "",
  finish: "",
  personalization: "",
  highlight_1: "Feito sob encomenda",
  highlight_2: "Personalização completa",
  highlight_3: "Produção artesanal",
  highlight_4: "Atendimento pelo WhatsApp",
  has_variations: false,
  variation_label: "Tamanho",
  variations: [],
  available: true,
  featured: false,
};

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [produto, setProduto] = useState(produtoInicial);
  const [produtoEditandoId, setProdutoEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarProdutos();
    carregarCategorias();
  }, []);

  async function carregarProdutos() {
    const snapshot = await getDocs(collection(db, "products"));
    const lista = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    lista.sort((a, b) => {
      const dataA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
      const dataB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
      return dataB - dataA;
    });

    setProdutos(lista);
  }

  async function carregarCategorias() {
    const snapshot = await getDocs(collection(db, "categories"));
    const lista = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    lista.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    setCategorias(lista);
  }

  function atualizarProduto(campo, valor) {
    setProduto((prev) => ({
      ...prev,
      [campo]: valor,
    }));
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

  function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function abrirModalNovoProduto() {
    setProdutoEditandoId(null);
    setProduto(produtoInicial);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setProdutoEditandoId(null);
    setProduto(produtoInicial);
  }

  function editarProduto(produtoSelecionado) {
    setProdutoEditandoId(produtoSelecionado.id);
    setProduto({
      name: produtoSelecionado.name || "",
      slug: produtoSelecionado.slug || "",
      price: produtoSelecionado.price || "",
      category: produtoSelecionado.category || "",
      short_description: produtoSelecionado.short_description || "",
      full_description: produtoSelecionado.full_description || "",
      image_url_1: produtoSelecionado.image_url_1 || "",
      image_url_2: produtoSelecionado.image_url_2 || "",
      image_url_3: produtoSelecionado.image_url_3 || "",
      image_url_4: produtoSelecionado.image_url_4 || "",
      video_url: produtoSelecionado.video_url || "",
      production_time: produtoSelecionado.production_time || "",
      size: produtoSelecionado.size || "",
      finish: produtoSelecionado.finish || "",
      personalization: produtoSelecionado.personalization || "",
      highlight_1: produtoSelecionado.highlight_1 || "Feito sob encomenda",
      highlight_2: produtoSelecionado.highlight_2 || "Personalização completa",
      highlight_3: produtoSelecionado.highlight_3 || "Produção artesanal",
      highlight_4: produtoSelecionado.highlight_4 || "Atendimento pelo WhatsApp",
      has_variations: produtoSelecionado.has_variations ?? false,
      variation_label: produtoSelecionado.variation_label || "Tamanho",
      variations: Array.isArray(produtoSelecionado.variations)
        ? produtoSelecionado.variations.map((item) => ({
            name: item.name || "",
            price: item.price ?? "",
            description: item.description || "",
          }))
        : [],
      available: produtoSelecionado.available ?? true,
      featured: produtoSelecionado.featured ?? false,
    });
    setModalAberto(true);
  }

  async function excluirProduto(id) {
    const confirmar = confirm("Tem certeza que deseja excluir este produto?");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "products", id));
      await carregarProdutos();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao excluir produto.");
    }
  }

  async function copiarTexto(texto) {
    if (!texto) {
      alert("Nenhuma URL para copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(texto);
      alert("URL copiada com sucesso!");
    } catch (erro) {
      console.error(erro);
      alert("Copie manualmente pelo campo. Sim, tecnologia às vezes só decora o ambiente.");
    }
  }

  function abrirUrlExterna(url) {
    if (!url) {
      alert("Nenhuma URL informada.");
      return;
    }

    window.open(url, "_blank");
  }

  function adicionarVariacao() {
    setProduto((prev) => ({
      ...prev,
      has_variations: true,
      variation_label: prev.variation_label || "Tamanho",
      variations: [
        ...(Array.isArray(prev.variations) ? prev.variations : []),
        { name: "", price: "", description: "" },
      ],
    }));
  }

  function atualizarVariacao(index, campo, valor) {
    setProduto((prev) => {
      const lista = Array.isArray(prev.variations) ? [...prev.variations] : [];
      lista[index] = {
        ...(lista[index] || { name: "", price: "", description: "" }),
        [campo]: valor,
      };

      return {
        ...prev,
        variations: lista,
      };
    });
  }

  function removerVariacao(index) {
    setProduto((prev) => {
      const lista = Array.isArray(prev.variations) ? [...prev.variations] : [];
      lista.splice(index, 1);

      return {
        ...prev,
        variations: lista,
        has_variations: lista.length > 0 ? prev.has_variations : false,
      };
    });
  }

  function variacoesValidas() {
    return (produto.variations || [])
      .filter((item) => String(item.name || "").trim())
      .map((item) => ({
        name: String(item.name || "").trim(),
        price: Number(item.price || 0),
        description: String(item.description || "").trim(),
      }));
  }

  async function salvarProduto(e) {
    e.preventDefault();

    if (!produto.name.trim()) {
      alert("Preencha o nome do produto.");
      return;
    }

    const variacoesLimpas = variacoesValidas();

    if (produto.has_variations && variacoesLimpas.length === 0) {
      alert("Adicione pelo menos uma variação com nome.");
      return;
    }

    if (!produto.price && !produto.has_variations) {
      alert("Preencha o preço do produto.");
      return;
    }

    const menorPrecoVariacao = variacoesLimpas.length
      ? Math.min(...variacoesLimpas.map((item) => Number(item.price || 0)))
      : 0;

    setSalvando(true);

    try {
      const dadosProduto = {
        ...produto,
        slug: produto.slug || gerarSlug(produto.name),
        price: Number(produto.price || menorPrecoVariacao || 0),
        has_variations: Boolean(produto.has_variations),
        variation_label: produto.variation_label || "Tamanho",
        variations: produto.has_variations ? variacoesLimpas : [],
        updated_at: new Date(),
      };

      if (produtoEditandoId) {
        await updateDoc(doc(db, "products", produtoEditandoId), dadosProduto);
        alert("Produto atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "products"), {
          ...dadosProduto,
          created_at: new Date(),
        });
        alert("Produto cadastrado com sucesso!");
      }

      fecharModal();
      await carregarProdutos();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao salvar produto.");
    } finally {
      setSalvando(false);
    }
  }

  const produtosFiltrados = useMemo(() => {
    const texto = busca.toLowerCase().trim();

    return produtos.filter((item) => {
      const passaBusca =
        !texto ||
        String(item.name || "").toLowerCase().includes(texto) ||
        String(item.category || "").toLowerCase().includes(texto) ||
        String(item.short_description || "").toLowerCase().includes(texto);

      const passaFiltro =
        filtro === "todos" ||
        (filtro === "disponivel" && item.available) ||
        (filtro === "destaque" && item.featured) ||
        (filtro === "indisponivel" && !item.available);

      return passaBusca && passaFiltro;
    });
  }, [produtos, busca, filtro]);

  const totalDisponiveis = produtos.filter((item) => item.available).length;
  const totalDestaques = produtos.filter((item) => item.featured).length;
  const totalComVariacoes = produtos.filter((item) => item.has_variations).length;

  function renderCampoUrl(campo, label, tipo = "imagem") {
    const valor = produto[campo];

    return (
      <div style={urlBox}>
        <div style={linhaEntreItens}>
          <label style={labelMini}>{label}</label>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => copiarTexto(valor)} style={botaoPequenoNeutro}>Copiar</button>
            <button type="button" onClick={() => abrirUrlExterna(valor)} style={botaoPequenoRosa}>Abrir</button>
          </div>
        </div>

        <input
          value={valor}
          onChange={(e) => atualizarProduto(campo, e.target.value)}
          style={campoEstilo}
          placeholder={tipo === "video" ? "Cole o link do vídeo" : `Cole a URL da ${label.toLowerCase()}`}
        />

        {valor ? (
          tipo === "video" ? (
            <div style={previewVazio}>🎬 Vídeo cadastrado. Use “Abrir” para conferir.</div>
          ) : (
            <div style={previewImagemBox}>
              <img
                src={valor}
                alt={`Prévia ${label}`}
                style={previewImagem}
                onError={(evento) => {
                  evento.currentTarget.style.display = "none";
                }}
              />
            </div>
          )
        ) : (
          <div style={previewVazio}>{tipo === "video" ? "🎬 Cole uma URL de vídeo." : "🖼️ Cole uma URL para ver a prévia."}</div>
        )}
      </div>
    );
  }

  return (
    <section>
      <div style={paginaCabecalho}>
        <div>
          <span style={tag}>CATÁLOGO</span>
          <h1 style={tituloPagina}>Produtos</h1>
          <p style={subtitulo}>Gerencie seu catálogo com busca, filtros e cadastro em modal. Civilização, finalmente.</p>
        </div>

        <button type="button" onClick={abrirModalNovoProduto} style={botaoPrincipalTopo}>
          + Novo produto
        </button>
      </div>

      <div style={resumoGrid}>
        <div style={resumoCard}>
          <strong>{produtos.length}</strong>
          <span>Produtos cadastrados</span>
        </div>
        <div style={resumoCard}>
          <strong>{totalDisponiveis}</strong>
          <span>Disponíveis</span>
        </div>
        <div style={resumoCard}>
          <strong>{totalDestaques}</strong>
          <span>Em destaque</span>
        </div>
        <div style={resumoCard}>
          <strong>{totalComVariacoes}</strong>
          <span>Com variações</span>
        </div>
      </div>

      <div style={cardBusca}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto por nome, categoria ou descrição..."
          style={{ ...campoEstilo, marginBottom: 0 }}
        />
      </div>

      <div style={filtrosLinha}>
        {[
          ["todos", "Todos"],
          ["disponivel", "Disponíveis"],
          ["destaque", "Destaques"],
          ["indisponivel", "Indisponíveis"],
        ].map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setFiltro(valor)}
            style={filtro === valor ? filtroAtivo : filtroBotao}
          >
            {texto}
          </button>
        ))}
      </div>

      <div style={listaTopo}>
        <div>
          <h2 style={{ margin: 0 }}>Produtos cadastrados</h2>
          <p style={{ margin: "6px 0 0", color: "#777" }}>{produtosFiltrados.length} produto(s) encontrado(s)</p>
        </div>
      </div>

      {produtosFiltrados.length === 0 ? (
        <div style={cardVazio}>Nenhum produto encontrado.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {produtosFiltrados.map((item) => (
            <div key={item.id} style={produtoLinha}>
              <div style={produtoInfoArea}>
                <div style={thumbBox}>
                  {item.image_url_1 ? (
                    <img src={item.image_url_1} alt={item.name} style={thumbImagem} />
                  ) : (
                    <span>📦</span>
                  )}
                </div>

                <div>
                  <h3 style={{ margin: "0 0 5px" }}>{item.name}</h3>
                  <p style={{ margin: "0 0 6px", color: "#777" }}>{item.short_description || "Sem descrição curta"}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badgeClaro}>{item.category || "Sem categoria"}</span>
                    <span style={item.available ? badgeVerde : badgeCinza}>{item.available ? "Disponível" : "Indisponível"}</span>
                    {item.featured && <span style={badgeRosa}>Destaque</span>}
                    {item.has_variations && (
                      <span style={badgeRoxo}>
                        {item.variations?.length || 0} variação(ões)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={produtoAcoesArea}>
                <strong style={{ color: "#ec1971", fontSize: 18 }}>
                  {item.has_variations ? "A partir de " : ""}
                  {formatarPreco(item.price)}
                </strong>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => editarProduto(item)} style={botaoIcone}>✏️</button>
                  <button type="button" onClick={() => excluirProduto(item.id)} style={botaoIcone}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div style={modalOverlay}>
          <form onSubmit={salvarProduto} style={modalConteudo}>
            <div style={modalHeader}>
              <div>
                <span style={tag}>{produtoEditandoId ? "EDIÇÃO" : "NOVO"}</span>
                <h2 style={{ margin: "6px 0 0" }}>{produtoEditandoId ? "Editar produto" : "Novo produto"}</h2>
              </div>
              <button type="button" onClick={fecharModal} style={fecharModalBotao}>×</button>
            </div>

            <div style={modalBody}>
              <div style={formGridDuasColunas}>
                <div>
                  <label>Nome do produto *</label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={produto.name}
                    onChange={(e) => atualizarProduto("name", e.target.value)}
                    style={campoEstilo}
                    placeholder="Ex: Planner Simples Personalizado A5"
                  />
                </div>

                <div>
                  <label>Preço *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={produto.price}
                    onChange={(e) => atualizarProduto("price", e.target.value)}
                    style={campoEstilo}
                    placeholder="64.90"
                  />
                </div>

                <div>
                  <label>Slug</label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={produto.slug}
                    onChange={(e) => atualizarProduto("slug", e.target.value)}
                    style={campoEstilo}
                    placeholder="planner-simples-personalizado-a5"
                  />
                </div>

                <div>
                  <label>Categoria</label>
                  <select
                    value={produto.category}
                    onChange={(e) => atualizarProduto("category", e.target.value)}
                    style={campoEstilo}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.slug}>
                        {categoria.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label>Descrição curta</label>
              <textarea
                value={produto.short_description}
                onChange={(e) => atualizarProduto("short_description", e.target.value)}
                style={{ ...campoEstilo, minHeight: 70 }}
                placeholder="Resumo rápido para o catálogo"
              />

              <label>Descrição completa</label>
              <textarea
                value={produto.full_description}
                onChange={(e) => atualizarProduto("full_description", e.target.value)}
                style={{ ...campoEstilo, minHeight: 110 }}
                placeholder="Detalhes, materiais, tamanhos e personalização"
              />

              <h3 style={subtituloBloco}>Variações do produto</h3>
              <div style={variacoesBox}>
                <label style={checkboxVariacao}>
                  <input
                    type="checkbox"
                    checked={produto.has_variations}
                    onChange={(e) => {
                      const marcado = e.target.checked;
                      setProduto((prev) => ({
                        ...prev,
                        has_variations: marcado,
                        variation_label: prev.variation_label || "Tamanho",
                        variations:
                          marcado && (!prev.variations || prev.variations.length === 0)
                            ? [{ name: "", price: prev.price || "", description: "" }]
                            : prev.variations || [],
                      }));
                    }}
                  />
                  Este produto possui variações
                </label>

                {produto.has_variations && (
                  <>
                    <div style={formGridDuasColunas}>
                      <div>
                        <label>Nome da variação</label>
                        <input
                          value={produto.variation_label}
                          onChange={(e) => atualizarProduto("variation_label", e.target.value)}
                          style={campoEstilo}
                          placeholder="Ex: Tamanho, Modelo, Formato"
                        />
                      </div>

                      <div>
                        <label>Preço base do anúncio</label>
                        <input
                          type="number"
                          step="0.01"
                          value={produto.price}
                          onChange={(e) => atualizarProduto("price", e.target.value)}
                          style={campoEstilo}
                          placeholder="Ex: menor valor para aparecer como a partir de"
                        />
                      </div>
                    </div>

                    <div style={variacoesLista}>
                      {(produto.variations || []).map((variacao, index) => (
                        <div key={`variacao-${index}`} style={variacaoLinha}>
                          <div style={variacaoNumero}>{index + 1}</div>

                          <input
                            value={variacao.name}
                            onChange={(e) => atualizarVariacao(index, "name", e.target.value)}
                            style={{ ...campoEstilo, marginBottom: 0 }}
                            placeholder="Ex: 25mm, Agenda A5, Chaveiro dupla face"
                          />

                          <input
                            type="number"
                            step="0.01"
                            value={variacao.price}
                            onChange={(e) => atualizarVariacao(index, "price", e.target.value)}
                            style={{ ...campoEstilo, marginBottom: 0 }}
                            placeholder="Preço"
                          />

                          <input
                            value={variacao.description}
                            onChange={(e) => atualizarVariacao(index, "description", e.target.value)}
                            style={{ ...campoEstilo, marginBottom: 0 }}
                            placeholder="Observação opcional"
                          />

                          <button
                            type="button"
                            onClick={() => removerVariacao(index)}
                            style={botaoRemoverVariacao}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={adicionarVariacao}
                      style={botaoAdicionarVariacao}
                    >
                      + Adicionar variação
                    </button>

                    <p style={ajudaVariacao}>
                      Exemplo para bottons: 25mm, 32mm, 37mm, 44mm e 58mm. O preço base aparece na vitrine como “a partir de”.
                    </p>
                  </>
                )}
              </div>

              <h3 style={subtituloBloco}>Fotos e vídeo</h3>
              <div style={urlGrid}>
                {renderCampoUrl("image_url_1", "Imagem 1")}
                {renderCampoUrl("image_url_2", "Imagem 2")}
                {renderCampoUrl("image_url_3", "Imagem 3")}
                {renderCampoUrl("image_url_4", "Imagem 4")}
              </div>
              {renderCampoUrl("video_url", "Vídeo", "video")}

              <h3 style={subtituloBloco}>Informações do produto</h3>
              <div style={formGridTresColunas}>
                <input value={produto.production_time} onChange={(e) => atualizarProduto("production_time", e.target.value)} style={campoEstilo} placeholder="Prazo de produção" />
                <input value={produto.size} onChange={(e) => atualizarProduto("size", e.target.value)} style={campoEstilo} placeholder="Tamanho" />
                <input value={produto.finish} onChange={(e) => atualizarProduto("finish", e.target.value)} style={campoEstilo} placeholder="Acabamento" />
              </div>

              <textarea
                value={produto.personalization}
                onChange={(e) => atualizarProduto("personalization", e.target.value)}
                style={{ ...campoEstilo, minHeight: 80 }}
                placeholder="Personalização disponível"
              />

              <h3 style={subtituloBloco}>Destaques</h3>
              <div style={formGridDuasColunas}>
                <input value={produto.highlight_1} onChange={(e) => atualizarProduto("highlight_1", e.target.value)} style={campoEstilo} />
                <input value={produto.highlight_2} onChange={(e) => atualizarProduto("highlight_2", e.target.value)} style={campoEstilo} />
                <input value={produto.highlight_3} onChange={(e) => atualizarProduto("highlight_3", e.target.value)} style={campoEstilo} />
                <input value={produto.highlight_4} onChange={(e) => atualizarProduto("highlight_4", e.target.value)} style={campoEstilo} />
              </div>

              <div style={checkboxLinha}>
                <label>
                  <input type="checkbox" checked={produto.available} onChange={(e) => atualizarProduto("available", e.target.checked)} /> Produto disponível
                </label>
                <label>
                  <input type="checkbox" checked={produto.featured} onChange={(e) => atualizarProduto("featured", e.target.checked)} /> Produto em destaque
                </label>
              </div>
            </div>

            <div style={modalFooter}>
              <button type="button" onClick={fecharModal} style={botaoSecundario}>Cancelar</button>
              <button type="submit" disabled={salvando} style={botaoPrincipal}>
                {salvando ? "Salvando..." : produtoEditandoId ? "Atualizar produto" : "Cadastrar produto"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

const paginaCabecalho = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 24,
};

const tag = {
  color: "#ec1971",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 1.2,
};

const tituloPagina = {
  margin: "8px 0 4px",
  fontSize: 38,
  color: "#271b24",
};

const subtitulo = {
  margin: 0,
  color: "#806b78",
};

const resumoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 18,
};

const resumoCard = {
  background: "#fff",
  borderRadius: 18,
  border: "1px solid #f1d6e3",
  padding: 22,
  boxShadow: "0 10px 25px rgba(70, 20, 50, .06)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  textAlign: "center",
};

const cardBusca = {
  background: "#fff",
  border: "1px solid #f1d6e3",
  borderRadius: 18,
  padding: 16,
  marginBottom: 14,
};

const campoEstilo = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 12,
  border: "2px solid #F3D7E5",
  background: "#FFFFFF",
  color: "#333333",
  fontSize: 14,
  outline: "none",
  marginBottom: 12,
};

const filtrosLinha = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  margin: "12px 0 20px",
};

const filtroBotao = {
  border: "1px solid #f1d6e3",
  background: "#fff",
  color: "#7a6370",
  padding: "9px 16px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};

const filtroAtivo = {
  ...filtroBotao,
  background: "#ec1971",
  color: "#fff",
  borderColor: "#ec1971",
};

const listaTopo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  margin: "20px 0 12px",
};

const cardVazio = {
  background: "#fff",
  border: "1px solid #f1d6e3",
  borderRadius: 18,
  padding: 30,
  color: "#806b78",
  textAlign: "center",
};

const produtoLinha = {
  background: "#fff",
  border: "1px solid #f1d6e3",
  borderRadius: 18,
  padding: 18,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  boxShadow: "0 8px 20px rgba(70, 20, 50, .045)",
};

const produtoInfoArea = {
  display: "flex",
  gap: 14,
  alignItems: "center",
  minWidth: 0,
};

const thumbBox = {
  width: 72,
  height: 72,
  borderRadius: 16,
  background: "#fff4f8",
  border: "1px solid #f1d6e3",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  flexShrink: 0,
};

const thumbImagem = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const produtoAcoesArea = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 12,
  flexShrink: 0,
};

const badgeClaro = {
  background: "#fff4f8",
  color: "#806b78",
  border: "1px solid #f1d6e3",
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 700,
};

const badgeVerde = {
  ...badgeClaro,
  background: "#e8f8ef",
  color: "#24844f",
  borderColor: "#d4f1e0",
};

const badgeCinza = {
  ...badgeClaro,
  background: "#f1f1f1",
  color: "#777",
  borderColor: "#e5e5e5",
};

const badgeRosa = {
  ...badgeClaro,
  background: "#ec1971",
  color: "#fff",
  borderColor: "#ec1971",
};

const badgeRoxo = {
  ...badgeClaro,
  background: "#f0ebff",
  color: "#7b1fa2",
  borderColor: "#ded2ff",
};

const botaoIcone = {
  border: "1px solid #f1d6e3",
  background: "#fff",
  width: 38,
  height: 38,
  borderRadius: 12,
  cursor: "pointer",
};

const botaoPrincipalTopo = {
  background: "#ec1971",
  color: "#fff",
  border: "none",
  padding: "13px 22px",
  borderRadius: 14,
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 10px 25px rgba(236,25,113,.20)",
};

const botaoPrincipal = {
  background: "#ec1971",
  color: "#fff",
  border: "none",
  padding: "12px 20px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 800,
};

const botaoSecundario = {
  background: "#fff",
  color: "#5a4851",
  border: "1px solid #f1d6e3",
  padding: "12px 20px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, .55)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const modalConteudo = {
  width: 920,
  maxWidth: "96vw",
  maxHeight: "92vh",
  overflow: "hidden",
  background: "#fff",
  borderRadius: 24,
  boxShadow: "0 30px 80px rgba(0,0,0,.25)",
  display: "flex",
  flexDirection: "column",
};

const modalHeader = {
  padding: "24px 28px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #f8e3ed",
};

const fecharModalBotao = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "none",
  background: "#fff4f8",
  color: "#8b6b7a",
  fontSize: 24,
  cursor: "pointer",
};

const modalBody = {
  padding: "20px 28px",
  overflowY: "auto",
};

const modalFooter = {
  padding: "16px 28px 24px",
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  borderTop: "1px solid #f8e3ed",
};

const formGridDuasColunas = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const formGridTresColunas = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const subtituloBloco = {
  margin: "18px 0 12px",
  color: "#271b24",
};

const urlGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const urlBox = {
  border: "1px solid #f1d6e3",
  borderRadius: 18,
  padding: 14,
  background: "#fffafd",
};

const linhaEntreItens = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};

const labelMini = {
  margin: 0,
  fontWeight: 700,
  color: "#5a4851",
};

const botaoPequenoNeutro = {
  border: "1px solid #f1d6e3",
  background: "#fff",
  color: "#5a4851",
  borderRadius: 999,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const botaoPequenoRosa = {
  ...botaoPequenoNeutro,
  background: "#ec1971",
  color: "#fff",
  borderColor: "#ec1971",
};

const previewImagemBox = {
  minHeight: 150,
  borderRadius: 16,
  border: "1px dashed #f1c5d8",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const previewImagem = {
  width: "100%",
  height: 170,
  objectFit: "cover",
};

const previewVazio = {
  minHeight: 120,
  borderRadius: 16,
  border: "1px dashed #f1c5d8",
  background: "#fff",
  color: "#9a8290",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: 18,
};

const variacoesBox = {
  border: "1px solid #f1d6e3",
  borderRadius: 18,
  padding: 16,
  background: "#fffafd",
  marginBottom: 18,
};

const checkboxVariacao = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 800,
  color: "#5a4851",
  marginBottom: 14,
};

const variacoesLista = {
  display: "grid",
  gap: 10,
  marginTop: 4,
};

const variacaoLinha = {
  display: "grid",
  gridTemplateColumns: "34px 1.2fr 0.65fr 1fr 38px",
  gap: 10,
  alignItems: "center",
  background: "#fff",
  border: "1px solid #f1d6e3",
  borderRadius: 14,
  padding: 10,
};

const variacaoNumero = {
  width: 28,
  height: 28,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "#fff0f6",
  color: "#ec1971",
  fontWeight: 900,
  fontSize: 13,
};

const botaoRemoverVariacao = {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "none",
  background: "#fff0f6",
  color: "#ec1971",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  fontWeight: 900,
};

const botaoAdicionarVariacao = {
  marginTop: 12,
  border: "1px solid #ec1971",
  background: "#fff",
  color: "#ec1971",
  padding: "11px 16px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 900,
};

const ajudaVariacao = {
  margin: "10px 0 0",
  color: "#806b78",
  fontSize: 13,
  lineHeight: 1.5,
};

const checkboxLinha = {
  display: "flex",
  gap: 20,
  flexWrap: "wrap",
  marginTop: 12,
};
