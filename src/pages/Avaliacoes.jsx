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

const avaliacaoInicial = {
  client_id: "",
  client_name: "",
  client_whatsapp: "",
  order_id: "",
  product_name: "",
  rating: 5,
  comment: "",
  image_url: "",
  status: "pendente",
  featured: false,
  instagram_ready: true,
  source: "WhatsApp",
  notes: "",
};

export default function Avaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [avaliacao, setAvaliacao] = useState(avaliacaoInicial);
  const [avaliacaoEditandoId, setAvaliacaoEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroNota, setFiltroNota] = useState("todas");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    await Promise.all([carregarAvaliacoes(), carregarClientes(), carregarPedidos()]);
  }

  async function carregarAvaliacoes() {
    const snapshot = await getDocs(collection(db, "reviews"));
    const lista = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    lista.sort((a, b) => {
      const dataA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
      const dataB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
      return dataB - dataA;
    });

    setAvaliacoes(lista);
  }

  async function carregarClientes() {
    const snapshot = await getDocs(collection(db, "clients"));
    const lista = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    lista.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    setClientes(lista);
  }

  async function carregarPedidos() {
    const snapshot = await getDocs(collection(db, "orders"));
    const lista = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    lista.sort((a, b) => {
      const dataA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at || 0);
      const dataB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at || 0);
      return dataB - dataA;
    });

    setPedidos(lista);
  }

  function atualizarAvaliacao(campo, valor) {
    setAvaliacao((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function selecionarCliente(clienteId) {
    const clienteSelecionado = clientes.find((item) => item.id === clienteId);

    if (!clienteSelecionado) {
      setAvaliacao((prev) => ({
        ...prev,
        client_id: "",
        client_name: "",
        client_whatsapp: "",
      }));
      return;
    }

    setAvaliacao((prev) => ({
      ...prev,
      client_id: clienteSelecionado.id,
      client_name: clienteSelecionado.name || "",
      client_whatsapp: clienteSelecionado.whatsapp || "",
    }));
  }

  function selecionarPedido(pedidoId) {
    const pedidoSelecionado = pedidos.find((item) => item.id === pedidoId);

    if (!pedidoSelecionado) {
      setAvaliacao((prev) => ({
        ...prev,
        order_id: "",
        product_name: "",
      }));
      return;
    }

    setAvaliacao((prev) => ({
      ...prev,
      order_id: pedidoSelecionado.id,
      client_id: pedidoSelecionado.client_id || prev.client_id || "",
      client_name: pedidoSelecionado.client_name || prev.client_name || "",
      client_whatsapp: pedidoSelecionado.client_whatsapp || prev.client_whatsapp || "",
      product_name: pedidoSelecionado.product_name || "",
    }));
  }

  function formatarData(valor) {
    if (!valor) return "Sem data";

    try {
      if (valor?.toDate) return valor.toDate().toLocaleDateString("pt-BR");
      const data = new Date(valor);
      if (Number.isNaN(data.getTime())) return "Sem data";
      return data.toLocaleDateString("pt-BR");
    } catch {
      return "Sem data";
    }
  }

  function traduzirStatus(status) {
    const mapa = {
      pendente: "Pendente",
      publicado: "Publicado",
      oculto: "Oculto",
    };

    return mapa[status] || status || "Não informado";
  }

  function corStatus(status) {
    const mapa = {
      pendente: "#F59E0B",
      publicado: "#16A34A",
      oculto: "#64748B",
    };

    return mapa[status] || "#64748B";
  }

  function estrelas(nota) {
    const valor = Number(nota || 0);
    return "★".repeat(valor) + "☆".repeat(Math.max(5 - valor, 0));
  }

  const avaliacoesFiltradas = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return avaliacoes.filter((item) => {
      const statusOk = filtroStatus === "todos" || item.status === filtroStatus;
      const notaOk = filtroNota === "todas" || Number(item.rating || 0) === Number(filtroNota);

      if (!statusOk || !notaOk) return false;
      if (!termo) return true;

      return (
        String(item.client_name || "").toLowerCase().includes(termo) ||
        String(item.product_name || "").toLowerCase().includes(termo) ||
        String(item.comment || "").toLowerCase().includes(termo) ||
        String(item.source || "").toLowerCase().includes(termo)
      );
    });
  }, [avaliacoes, busca, filtroStatus, filtroNota]);

  const totalAvaliacoes = avaliacoes.length;
  const publicadas = avaliacoes.filter((item) => item.status === "publicado").length;
  const pendentes = avaliacoes.filter((item) => item.status === "pendente").length;
  const destaques = avaliacoes.filter((item) => item.featured).length;
  const mediaGeral = avaliacoes.length
    ? avaliacoes.reduce((total, item) => total + Number(item.rating || 0), 0) / avaliacoes.length
    : 0;

  const produtosRanking = Object.values(
    avaliacoes.reduce((acc, item) => {
      const nome = item.product_name || "Produto não informado";
      if (!acc[nome]) {
        acc[nome] = { nome, quantidade: 0, soma: 0 };
      }
      acc[nome].quantidade += 1;
      acc[nome].soma += Number(item.rating || 0);
      return acc;
    }, {})
  )
    .map((item) => ({ ...item, media: item.quantidade ? item.soma / item.quantidade : 0 }))
    .sort((a, b) => b.media - a.media || b.quantidade - a.quantidade)
    .slice(0, 5);

  async function salvarAvaliacao(e) {
    e.preventDefault();

    if (!avaliacao.client_name.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    if (!avaliacao.comment.trim()) {
      alert("Escreva o comentário/depoimento do cliente.");
      return;
    }

    setSalvando(true);

    try {
      const dados = {
        ...avaliacao,
        rating: Number(avaliacao.rating || 5),
        updated_at: new Date(),
      };

      if (avaliacaoEditandoId) {
        await updateDoc(doc(db, "reviews", avaliacaoEditandoId), dados);
        alert("Avaliação atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "reviews"), {
          ...dados,
          created_at: new Date(),
        });
        alert("Avaliação cadastrada com sucesso!");
      }

      fecharModal();
      carregarAvaliacoes();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao salvar avaliação.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalNovaAvaliacao() {
    setAvaliacaoEditandoId(null);
    setAvaliacao({ ...avaliacaoInicial });
    setModalAberto(true);
  }

  function editarAvaliacao(item) {
    setAvaliacaoEditandoId(item.id);
    setAvaliacao({
      client_id: item.client_id || "",
      client_name: item.client_name || "",
      client_whatsapp: item.client_whatsapp || "",
      order_id: item.order_id || "",
      product_name: item.product_name || "",
      rating: item.rating || 5,
      comment: item.comment || "",
      image_url: item.image_url || "",
      status: item.status || "pendente",
      featured: Boolean(item.featured),
      instagram_ready: item.instagram_ready !== false,
      source: item.source || "WhatsApp",
      notes: item.notes || "",
    });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setAvaliacaoEditandoId(null);
    setAvaliacao({ ...avaliacaoInicial });
  }

  async function excluirAvaliacao(id) {
    const confirmar = confirm("Tem certeza que deseja excluir esta avaliação?");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "reviews", id));
      alert("Avaliação excluída com sucesso!");
      carregarAvaliacoes();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao excluir avaliação.");
    }
  }

  async function atualizarStatusRapido(item, novoStatus) {
    try {
      await updateDoc(doc(db, "reviews", item.id), {
        status: novoStatus,
        updated_at: new Date(),
      });
      carregarAvaliacoes();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao atualizar status.");
    }
  }

  async function alternarDestaque(item) {
    try {
      await updateDoc(doc(db, "reviews", item.id), {
        featured: !item.featured,
        updated_at: new Date(),
      });
      carregarAvaliacoes();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao atualizar destaque.");
    }
  }

  async function copiarDepoimento(item) {
    const texto = `Depoimento de ${item.client_name}\n\n${estrelas(item.rating)}\n\n“${item.comment}”\n\nProduto: ${item.product_name || "NM Serviços"}`;

    try {
      await navigator.clipboard.writeText(texto);
      alert("Depoimento copiado para usar no Instagram!");
    } catch (erro) {
      console.error(erro);
      alert("Não consegui copiar automaticamente. Copie manualmente pelo card.");
    }
  }

  return (
    <div style={pageContainer}>
      <div style={pageHeaderCompacto}>
        <div>
          <h1 style={pageTitleCompacto}>Avaliações</h1>
          <p style={pageDescriptionCompacto}>
            {totalAvaliacoes} avaliação(ões) cadastrada(s)
          </p>
        </div>

        <button type="button" onClick={abrirModalNovaAvaliacao} style={btnPrimary}>
          + Nova avaliação
        </button>
      </div>

      <div style={metricasGrid}>
        <div style={metricaCard}>
          <span>⭐</span>
          <strong>{mediaGeral.toFixed(1)}</strong>
          <small>Média geral</small>
        </div>

        <div style={metricaCard}>
          <span>✅</span>
          <strong>{publicadas}</strong>
          <small>Publicadas</small>
        </div>

        <div style={metricaCard}>
          <span>⏳</span>
          <strong>{pendentes}</strong>
          <small>Pendentes</small>
        </div>

        <div style={metricaCardDestaque}>
          <span>💖</span>
          <strong>{destaques}</strong>
          <small>Destaques para Instagram</small>
        </div>
      </div>

      <div style={toolbarCard}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente, produto, comentário ou origem..."
          style={inputStyle}
        />

        <div style={filtrosLinha}>
          {[
            ["todos", "Todos"],
            ["pendente", "Pendente"],
            ["publicado", "Publicado"],
            ["oculto", "Oculto"],
          ].map(([valor, label]) => (
            <button
              type="button"
              key={valor}
              onClick={() => setFiltroStatus(valor)}
              style={filtroStatus === valor ? filtroAtivo : filtroBotao}
            >
              {label}
            </button>
          ))}

          {["todas", "5", "4", "3", "2", "1"].map((nota) => (
            <button
              type="button"
              key={nota}
              onClick={() => setFiltroNota(nota)}
              style={filtroNota === nota ? filtroAtivo : filtroBotao}
            >
              {nota === "todas" ? "Todas as notas" : `${nota}★`}
            </button>
          ))}
        </div>
      </div>

      <div style={conteudoGrid}>
        <section>
          <div style={listaTopo}>
            <div>
              <h2 style={{ margin: 0 }}>Depoimentos</h2>
              <p style={{ margin: "6px 0 0", color: "#666" }}>
                {avaliacoesFiltradas.length} avaliação(ões) encontrada(s)
              </p>
            </div>
          </div>

          {avaliacoesFiltradas.length === 0 ? (
            <div style={cardBase}>
              <p>Nenhuma avaliação encontrada.</p>
            </div>
          ) : (
            <div style={avaliacoesLista}>
              {avaliacoesFiltradas.map((item) => (
                <article key={item.id} style={avaliacaoCard}>
                  <div style={avaliacaoHeader}>
                    <div>
                      <strong style={clienteNome}>{item.client_name || "Cliente sem nome"}</strong>
                      <p style={textoCinza}>{item.product_name || "Produto não informado"}</p>
                    </div>

                    <span style={{ ...badgeStatus, background: corStatus(item.status) }}>
                      {traduzirStatus(item.status)}
                    </span>
                  </div>

                  <div style={notaLinha}>
                    <span>{estrelas(item.rating)}</span>
                    <strong>{Number(item.rating || 0).toFixed(1)}</strong>
                  </div>

                  <p style={comentarioTexto}>“{item.comment}”</p>

                  {item.image_url && (
                    <div style={imagemBox}>
                      <img src={item.image_url} alt="Produto avaliado" style={imagemPreview} />
                    </div>
                  )}

                  <div style={metaLinha}>
                    <span>Origem: {item.source || "Não informada"}</span>
                    <span>{formatarData(item.created_at)}</span>
                    {item.featured && <strong>💖 Destaque</strong>}
                  </div>

                  <div style={acoesLinha}>
                    <button type="button" onClick={() => copiarDepoimento(item)} style={botaoInstagram}>
                      📋 Copiar
                    </button>

                    <button type="button" onClick={() => alternarDestaque(item)} style={botaoDestaque}>
                      {item.featured ? "Remover destaque" : "Destacar"}
                    </button>

                    {item.status !== "publicado" && (
                      <button type="button" onClick={() => atualizarStatusRapido(item, "publicado")} style={botaoPublicar}>
                        Publicar
                      </button>
                    )}

                    <button type="button" onClick={() => editarAvaliacao(item)} style={botaoEditar}>
                      Editar
                    </button>

                    <button type="button" onClick={() => excluirAvaliacao(item.id)} style={botaoExcluir}>
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside style={rankingCard}>
          <div style={rankingHeader}>
            <span>🏆</span>
            <div>
              <h3>Produtos melhor avaliados</h3>
              <p>Ranking por média de nota.</p>
            </div>
          </div>

          {produtosRanking.length === 0 ? (
            <p style={textoCinza}>Ainda não há dados suficientes para ranking.</p>
          ) : (
            produtosRanking.map((produto, index) => (
              <div key={produto.nome} style={rankingLinha}>
                <span>{index + 1}º</span>
                <div>
                  <strong>{produto.nome}</strong>
                  <p>{produto.quantidade} avaliação(ões)</p>
                </div>
                <strong>{produto.media.toFixed(1)}★</strong>
              </div>
            ))
          )}
        </aside>
      </div>

      {modalAberto && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={modalHeader}>
              <div>
                <div style={modalTag}>⭐ {avaliacaoEditandoId ? "EDITANDO AVALIAÇÃO" : "NOVA AVALIAÇÃO"}</div>
                <h2 style={modalTitle}>{avaliacaoEditandoId ? "Editar avaliação" : "Cadastrar avaliação"}</h2>
                <p style={modalSubtitle}>
                  Registre depoimentos reais para usar como prova social no catálogo, WhatsApp e Instagram.
                </p>
              </div>

              <button type="button" onClick={fecharModal} style={modalClose}>✕</button>
            </div>

            <form onSubmit={salvarAvaliacao}>
              <div style={modalBody}>
                <div style={campoModal}>
                  <label>Cliente cadastrado</label>
                  <select value={avaliacao.client_id} onChange={(e) => selecionarCliente(e.target.value)} style={inputStyle}>
                    <option value="">Selecione um cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.name} - {cliente.whatsapp || "sem WhatsApp"}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Pedido vinculado</label>
                  <select value={avaliacao.order_id} onChange={(e) => selecionarPedido(e.target.value)} style={inputStyle}>
                    <option value="">Selecione um pedido</option>
                    {pedidos.map((pedido) => (
                      <option key={pedido.id} value={pedido.id}>
                        {pedido.client_name} - {pedido.product_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Nome do cliente</label>
                  <input value={avaliacao.client_name} onChange={(e) => atualizarAvaliacao("client_name", e.target.value)} style={inputStyle} placeholder="Ex: Vanessa" />
                </div>

                <div style={campoModal}>
                  <label>WhatsApp</label>
                  <input value={avaliacao.client_whatsapp} onChange={(e) => atualizarAvaliacao("client_whatsapp", e.target.value)} style={inputStyle} placeholder="11999999999" />
                </div>

                <div style={campoModalGrande}>
                  <label>Produto avaliado</label>
                  <input value={avaliacao.product_name} onChange={(e) => atualizarAvaliacao("product_name", e.target.value)} style={inputStyle} placeholder="Ex: Planner Personalizado A5" />
                </div>

                <div style={campoModal}>
                  <label>Nota</label>
                  <select value={avaliacao.rating} onChange={(e) => atualizarAvaliacao("rating", e.target.value)} style={inputStyle}>
                    <option value="5">5 estrelas</option>
                    <option value="4">4 estrelas</option>
                    <option value="3">3 estrelas</option>
                    <option value="2">2 estrelas</option>
                    <option value="1">1 estrela</option>
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Status</label>
                  <select value={avaliacao.status} onChange={(e) => atualizarAvaliacao("status", e.target.value)} style={inputStyle}>
                    <option value="pendente">Pendente</option>
                    <option value="publicado">Publicado</option>
                    <option value="oculto">Oculto</option>
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Origem</label>
                  <select value={avaliacao.source} onChange={(e) => atualizarAvaliacao("source", e.target.value)} style={inputStyle}>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Site">Site</option>
                    <option value="Google">Google</option>
                    <option value="Indicação">Indicação</option>
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Imagem do produto/depoimento</label>
                  <input value={avaliacao.image_url} onChange={(e) => atualizarAvaliacao("image_url", e.target.value)} style={inputStyle} placeholder="Cole a URL da imagem" />
                </div>

                <div style={campoModalGrande}>
                  <label>Comentário do cliente</label>
                  <textarea value={avaliacao.comment} onChange={(e) => atualizarAvaliacao("comment", e.target.value)} style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }} placeholder="Cole aqui o depoimento do cliente..." />
                </div>

                <div style={checkboxLinha}>
                  <label>
                    <input type="checkbox" checked={avaliacao.featured} onChange={(e) => atualizarAvaliacao("featured", e.target.checked)} />
                    Marcar como destaque
                  </label>

                  <label>
                    <input type="checkbox" checked={avaliacao.instagram_ready} onChange={(e) => atualizarAvaliacao("instagram_ready", e.target.checked)} />
                    Pronto para Instagram
                  </label>
                </div>

                <div style={campoModalGrande}>
                  <label>Observações internas</label>
                  <textarea value={avaliacao.notes} onChange={(e) => atualizarAvaliacao("notes", e.target.value)} style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} placeholder="Ex: autorização, contexto, observações..." />
                </div>
              </div>

              <div style={modalFooter}>
                <button type="button" onClick={fecharModal} style={btnSecondary}>Cancelar</button>
                <button type="submit" disabled={salvando} style={btnPrimary}>
                  {salvando ? "Salvando..." : avaliacaoEditandoId ? "Atualizar avaliação" : "Salvar avaliação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const pageContainer = { width: "100%" };

const pageHeaderCompacto = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "24px",
};

const pageTitleCompacto = {
  margin: 0,
  color: "#222",
  fontSize: "42px",
  fontWeight: 800,
  lineHeight: 1,
};

const pageDescriptionCompacto = {
  margin: "8px 0 0",
  color: "#666",
  fontSize: "16px",
};

const metricasGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const metricaCard = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "20px",
  padding: "18px",
  boxShadow: "0 10px 30px rgba(236, 28, 104, 0.06)",
  display: "grid",
  gap: "6px",
};

const metricaCardDestaque = {
  ...metricaCard,
  background: "linear-gradient(135deg, #EC1971, #7B2CBF)",
  color: "#ffffff",
};

const toolbarCard = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "22px",
  padding: "18px",
  boxShadow: "0 10px 30px rgba(236, 28, 104, 0.06)",
  marginBottom: "18px",
};

const inputStyle = {
  width: "100%",
  background: "#ffffff",
  border: "2px solid #F3D7E5",
  borderRadius: "12px",
  color: "#333333",
  padding: "12px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
};

const filtrosLinha = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const filtroBotao = {
  border: "1px solid #F3D7E5",
  background: "#ffffff",
  color: "#ec1971",
  padding: "9px 13px",
  borderRadius: "999px",
  fontWeight: 700,
  cursor: "pointer",
};

const filtroAtivo = {
  ...filtroBotao,
  background: "#ec1971",
  color: "#ffffff",
};

const conteudoGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 320px",
  gap: "20px",
  alignItems: "start",
};

const listaTopo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  margin: "18px 0 14px",
  flexWrap: "wrap",
};

const cardBase = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "22px",
  padding: "22px",
  boxShadow: "0 10px 30px rgba(236, 28, 104, 0.06)",
};

const avaliacoesLista = {
  display: "grid",
  gap: "14px",
};

const avaliacaoCard = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "24px",
  padding: "22px",
  boxShadow: "0 10px 30px rgba(236, 28, 104, 0.06)",
};

const avaliacaoHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const clienteNome = {
  fontSize: "18px",
  color: "#222",
};

const textoCinza = {
  margin: "4px 0",
  color: "#666",
};

const badgeStatus = {
  color: "#ffffff",
  borderRadius: "999px",
  padding: "7px 12px",
  fontSize: "12px",
  fontWeight: 800,
};

const notaLinha = {
  marginTop: "12px",
  color: "#F59E0B",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "18px",
};

const comentarioTexto = {
  margin: "14px 0",
  color: "#333",
  fontSize: "16px",
  lineHeight: 1.7,
};

const imagemBox = {
  width: "100%",
  maxHeight: "220px",
  overflow: "hidden",
  borderRadius: "18px",
  border: "1px solid #F3D7E5",
  margin: "12px 0",
};

const imagemPreview = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const metaLinha = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  color: "#666",
  fontSize: "13px",
  marginTop: "10px",
};

const acoesLinha = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const botaoBase = {
  border: "none",
  padding: "10px 13px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: 700,
};

const botaoInstagram = { ...botaoBase, background: "#EC1971", color: "#fff" };
const botaoDestaque = { ...botaoBase, background: "#FFF0F6", color: "#EC1971" };
const botaoPublicar = { ...botaoBase, background: "#DCFCE7", color: "#166534" };
const botaoEditar = { ...botaoBase, background: "#fff0f6", color: "#ec1971" };
const botaoExcluir = { ...botaoBase, background: "#fee2e2", color: "#b91c1c" };

const rankingCard = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "24px",
  padding: "20px",
  boxShadow: "0 10px 30px rgba(236, 28, 104, 0.06)",
  position: "sticky",
  top: "24px",
};

const rankingHeader = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "16px",
};

const rankingLinha = {
  display: "grid",
  gridTemplateColumns: "36px minmax(0, 1fr) 52px",
  gap: "10px",
  alignItems: "center",
  padding: "12px 0",
  borderBottom: "1px solid #F3D7E5",
};

const btnPrimary = {
  background: "#ec1971",
  color: "#ffffff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: 700,
};

const btnSecondary = {
  background: "#ffffff",
  color: "#333333",
  border: "1px solid #F3D7E5",
  padding: "12px 20px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: 700,
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999999,
  padding: "24px",
};

const modalContent = {
  width: "1050px",
  maxWidth: "95vw",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#ffffff",
  borderRadius: "32px",
  padding: "46px",
  boxShadow: "0 30px 80px rgba(0,0,0,.18)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "34px",
  paddingBottom: "28px",
  borderBottom: "2px solid #F8D9E8",
};

const modalTag = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  background: "#FFF0F6",
  color: "#EC1971",
  padding: "10px 18px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: "700",
  marginBottom: "18px",
};

const modalTitle = {
  margin: 0,
  fontSize: "42px",
  fontWeight: "800",
  color: "#111827",
  lineHeight: "1.1",
};

const modalSubtitle = {
  marginTop: "14px",
  marginBottom: 0,
  color: "#6B7280",
  fontSize: "17px",
  lineHeight: "1.7",
  maxWidth: "720px",
};

const modalClose = {
  border: "none",
  background: "#fff0f6",
  color: "#ec1971",
  borderRadius: "12px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: "16px",
};

const modalBody = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
};

const campoModal = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const campoModalGrande = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  gridColumn: "1 / -1",
};

const checkboxLinha = {
  display: "flex",
  gap: "18px",
  flexWrap: "wrap",
  gridColumn: "1 / -1",
  background: "#FFF8FB",
  border: "1px solid #F3D7E5",
  padding: "14px",
  borderRadius: "16px",
};

const modalFooter = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "30px",
  paddingTop: "24px",
  borderTop: "1px solid #F3D7E5",
  flexWrap: "wrap",
};
