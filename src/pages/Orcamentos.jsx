import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

const STATUS = {
  novo: "Novo",
  negociacao: "Em negociação",
  aprovado: "Aprovado",
  perdido: "Perdido",
  convertido: "Convertido",
};

export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [convertendoId, setConvertendoId] = useState(null);

  useEffect(() => {
    carregarOrcamentos();
  }, []);

  async function carregarOrcamentos() {
    try {
      setCarregando(true);

      const q = query(collection(db, "quotes"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);

      const lista = snap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setOrcamentos(lista);
    } catch (erro) {
      console.error("Erro ao carregar orçamentos:", erro);
    } finally {
      setCarregando(false);
    }
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data) {
    if (!data) return "Sem data";

    try {
      if (data?.toDate) {
        return data.toDate().toLocaleDateString("pt-BR");
      }

      return new Date(data).toLocaleDateString("pt-BR");
    } catch {
      return "Sem data";
    }
  }

  function normalizarStatus(status) {
    const valor = String(status || "").toLowerCase();

    if (valor.includes("negocia")) return STATUS.negociacao;
    if (valor.includes("aprov")) return STATUS.aprovado;
    if (valor.includes("perd")) return STATUS.perdido;
    if (valor.includes("convert")) return STATUS.convertido;
    if (valor.includes("aberto")) return STATUS.novo;
    if (valor.includes("novo")) return STATUS.novo;

    return STATUS.novo;
  }

  function corStatus(status) {
    const atual = normalizarStatus(status);

    if (atual === STATUS.novo) return { bg: "#fff4d6", color: "#9a6a00" };
    if (atual === STATUS.negociacao) return { bg: "#e0f2fe", color: "#0369a1" };
    if (atual === STATUS.aprovado) return { bg: "#dcfce7", color: "#15803d" };
    if (atual === STATUS.perdido) return { bg: "#fee2e2", color: "#b91c1c" };
    if (atual === STATUS.convertido) return { bg: "#f3e8ff", color: "#7e22ce" };

    return { bg: "#f4f4f5", color: "#52525b" };
  }

  async function alterarStatus(orcamento, novoStatus) {
    try {
      await updateDoc(doc(db, "quotes", orcamento.id), {
        status: novoStatus,
        updated_at: serverTimestamp(),
      });

      setOrcamentos((lista) =>
        lista.map((item) =>
          item.id === orcamento.id ? { ...item, status: novoStatus } : item
        )
      );
    } catch (erro) {
      console.error("Erro ao alterar status:", erro);
      alert("Erro ao alterar status.");
    }
  }

  async function excluirOrcamento(orcamento) {
    const confirmar = window.confirm(
      `Excluir orçamento de ${orcamento.client_name || "cliente"}?`
    );

    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "quotes", orcamento.id));
      setOrcamentos((lista) => lista.filter((item) => item.id !== orcamento.id));
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
      alert("Erro ao excluir orçamento.");
    }
  }

  async function converterEmPedido(orcamento) {
    const confirmar = window.confirm(
      `Converter este orçamento em pedido?\n\nCliente: ${
        orcamento.client_name || "Sem nome"
      }\nProduto: ${orcamento.product_name || "Produto personalizado"}`
    );

    if (!confirmar) return;

    try {
      setConvertendoId(orcamento.id);

      const quantidade = Number(orcamento.quantity || 1);
      const valorUnitario = Number(
        orcamento.unit_value || orcamento.price || orcamento.total_value || 0
      );
      const valorTotal = Number(orcamento.total_value || valorUnitario * quantidade);

      const pedidoRef = await addDoc(collection(db, "orders"), {
        quote_id: orcamento.id,

        client_id: orcamento.client_id || "",
        client_name: orcamento.client_name || "",
        client_whatsapp: orcamento.client_whatsapp || "",
        client_email: orcamento.client_email || "",
        client_instagram: orcamento.client_instagram || "",
        client_address: orcamento.client_address || "",

        product_id: orcamento.product_id || "",
        product_name: orcamento.product_name || "Produto personalizado",
        quantity: quantidade,
        unit_value: valorUnitario,
        total_value: valorTotal,

        signal_value: 0,
        remaining_value: valorTotal,

        payment_method: "pix",
        payment_status: "nao_pago",

        order_status: "aguardando_sinal",
        production_status: "a_confirmar",

        delivery_date: orcamento.delivery_date || "",
        production_time: orcamento.production_time || "A combinar",

        notes: orcamento.notes || "",
        internal_notes: `Convertido automaticamente do orçamento ${orcamento.id}`,

        source: "Orçamento",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      await addDoc(collection(db, "production"), {
        order_id: pedidoRef.id,
        quote_id: orcamento.id,
        client_name: orcamento.client_name || "",
        client_whatsapp: orcamento.client_whatsapp || "",
        product_name: orcamento.product_name || "Produto personalizado",
        quantity: quantidade,
        status: "a_confirmar",
        delivery_date: orcamento.delivery_date || "",
        notes: orcamento.notes || "",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      await updateDoc(doc(db, "quotes", orcamento.id), {
        status: STATUS.convertido,
        converted_to_order: true,
        order_id: pedidoRef.id,
        converted_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      setOrcamentos((lista) =>
        lista.map((item) =>
          item.id === orcamento.id
            ? {
                ...item,
                status: STATUS.convertido,
                converted_to_order: true,
                order_id: pedidoRef.id,
              }
            : item
        )
      );

      alert("Orçamento convertido em pedido.");
    } catch (erro) {
      console.error("Erro ao converter:", erro);
      alert("Erro ao converter orçamento.");
    } finally {
      setConvertendoId(null);
    }
  }

  function abrirWhatsApp(orcamento) {
    const numero = String(orcamento.client_whatsapp || "").replace(/\D/g, "");

    if (!numero) {
      alert("Este orçamento não tem WhatsApp cadastrado.");
      return;
    }

    const numeroFinal = numero.startsWith("55") ? numero : `55${numero}`;

    const mensagem = `Olá, ${orcamento.client_name || ""}! 😊

Vi que você solicitou um orçamento conosco para:
${orcamento.product_name || "produto personalizado"}

Posso te ajudar a finalizar seu pedido ou tirar alguma dúvida?`;

    window.open(
      `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensagem)}`,
      "_blank"
    );
  }

  const orcamentosFiltrados = orcamentos.filter((orcamento) => {
    const termo = busca.toLowerCase().trim();
    const statusNormalizado = normalizarStatus(orcamento.status);

    const bateBusca =
      !termo ||
      String(orcamento.client_name || "").toLowerCase().includes(termo) ||
      String(orcamento.client_whatsapp || "").toLowerCase().includes(termo) ||
      String(orcamento.product_name || "").toLowerCase().includes(termo) ||
      String(orcamento.source || "").toLowerCase().includes(termo);

    const bateStatus =
      filtroStatus === "todos" || statusNormalizado === filtroStatus;

    return bateBusca && bateStatus;
  });

  const metricas = useMemo(() => {
    const total = orcamentos.length;
    const novos = orcamentos.filter(
      (item) => normalizarStatus(item.status) === STATUS.novo
    ).length;
    const negociacao = orcamentos.filter(
      (item) => normalizarStatus(item.status) === STATUS.negociacao
    ).length;
    const convertidos = orcamentos.filter(
      (item) => normalizarStatus(item.status) === STATUS.convertido
    ).length;
    const valorTotal = orcamentos.reduce(
      (soma, item) => soma + Number(item.total_value || 0),
      0
    );
    const taxaConversao = total > 0 ? Math.round((convertidos / total) * 100) : 0;

    return {
      total,
      novos,
      negociacao,
      convertidos,
      valorTotal,
      taxaConversao,
    };
  }, [orcamentos]);

  const filtros = [
    { id: "todos", label: "Todos" },
    { id: STATUS.novo, label: "Novo" },
    { id: STATUS.negociacao, label: "Em negociação" },
    { id: STATUS.aprovado, label: "Aprovado" },
    { id: STATUS.perdido, label: "Perdido" },
    { id: STATUS.convertido, label: "Convertido" },
  ];

  return (
    <div style={pagina}>
      <header style={cabecalho}>
        <span style={miniTitulo}>Comercial</span>
        <h1 style={titulo}>Orçamentos</h1>
        <p style={subtitulo}>
          Solicitações da loja, negociações e conversões em pedido.
        </p>
      </header>

      <section style={funilBox}>
        <h2 style={tituloFunil}>Funil comercial da NM</h2>

        <div style={funilGrid}>
          <FunilItem label="Loja" valor={metricas.total} />
          <FunilSeta />
          <FunilItem label="Orçamento" valor={metricas.total} />
          <FunilSeta />
          <FunilItem label="Pedido" valor={metricas.convertidos} />
          <FunilSeta />
          <FunilItem label="Produção" valor={metricas.convertidos} />
          <FunilSeta />
          <FunilItem label="Financeiro" valor={formatarMoeda(metricas.valorTotal)} />
        </div>
      </section>

      <section style={metricasGrid}>
        <MetricaCard numero={metricas.total} label="Orçamentos" />
        <MetricaCard numero={metricas.novos} label="Novos" />
        <MetricaCard numero={metricas.negociacao} label="Negociação" />
        <MetricaCard numero={metricas.convertidos} label="Fechados" />
        <MetricaCard numero={`${metricas.taxaConversao}%`} label="Conversão" destaque />
      </section>

      <section style={barraBusca}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente, WhatsApp, produto ou origem..."
          style={inputBusca}
        />
      </section>

      <section style={filtrosBox}>
        {filtros.map((filtro) => (
          <button
            key={filtro.id}
            onClick={() => setFiltroStatus(filtro.id)}
            style={{
              ...filtroBotao,
              ...(filtroStatus === filtro.id ? filtroBotaoAtivo : {}),
            }}
          >
            {filtro.label}
          </button>
        ))}
      </section>

      {carregando ? (
        <div style={mensagem}>Carregando orçamentos...</div>
      ) : orcamentosFiltrados.length === 0 ? (
        <div style={mensagem}>Nenhum orçamento encontrado.</div>
      ) : (
        <section style={lista}>
          {orcamentosFiltrados.map((orcamento) => {
            const statusAtual = normalizarStatus(orcamento.status);
            const cor = corStatus(orcamento.status);

            return (
              <article key={orcamento.id} style={card}>
                <div style={cardTopo}>
                  <div>
                    <h2 style={cardTitulo}>
                      {orcamento.product_name || "Produto personalizado"}
                    </h2>

                    <p style={cliente}>
                      Cliente: <strong>{orcamento.client_name || "Sem nome"}</strong>
                    </p>

                    <p style={detalhes}>
                      WhatsApp: {orcamento.client_whatsapp || "Não informado"}
                    </p>

                    <p style={detalhes}>
                      Origem: {orcamento.source || "Loja"} • Criado em{" "}
                      {formatarData(orcamento.created_at)}
                    </p>
                  </div>

                  <span style={{ ...statusBadge, background: cor.bg, color: cor.color }}>
                    {statusAtual}
                  </span>
                </div>

                <div style={valorBox}>
                  <strong>{formatarMoeda(orcamento.total_value)}</strong>
                  <span>
                    Qtd: {orcamento.quantity || 1} • Unit.:{" "}
                    {formatarMoeda(orcamento.unit_value)}
                  </span>
                </div>

                {orcamento.notes && <p style={observacao}>📝 {orcamento.notes}</p>}

                <div style={acoesLinha}>
                  <button
                    onClick={() => alterarStatus(orcamento, STATUS.novo)}
                    style={botaoNeutro}
                  >
                    Novo
                  </button>

                  <button
                    onClick={() => alterarStatus(orcamento, STATUS.negociacao)}
                    style={botaoAzul}
                  >
                    Negociação
                  </button>

                  <button
                    onClick={() => alterarStatus(orcamento, STATUS.aprovado)}
                    style={botaoVerdeClaro}
                  >
                    Aprovar
                  </button>

                  <button
                    onClick={() => alterarStatus(orcamento, STATUS.perdido)}
                    style={botaoAmarelo}
                  >
                    Perdido
                  </button>

                  <button onClick={() => abrirWhatsApp(orcamento)} style={botaoWhats}>
                    💬 WhatsApp
                  </button>

                  <button
                    onClick={() => converterEmPedido(orcamento)}
                    disabled={statusAtual === STATUS.convertido || convertendoId === orcamento.id}
                    style={{
                      ...botaoPrincipal,
                      opacity:
                        statusAtual === STATUS.convertido || convertendoId === orcamento.id
                          ? 0.55
                          : 1,
                    }}
                  >
                    {convertendoId === orcamento.id
                      ? "Convertendo..."
                      : statusAtual === STATUS.convertido
                      ? "Já virou"
                      : "Virou pedido"}
                  </button>

                  <button
                    onClick={() => excluirOrcamento(orcamento)}
                    style={botaoExcluir}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function MetricaCard({ numero, label, destaque }) {
  return (
    <div style={{ ...metricaCard, ...(destaque ? metricaDestaque : {}) }}>
      <strong>{numero}</strong>
      <span>{label}</span>
    </div>
  );
}

function FunilItem({ label, valor }) {
  return (
    <div style={funilItem}>
      <strong>{valor}</strong>
      <span>{label}</span>
    </div>
  );
}

function FunilSeta() {
  return <div style={funilSeta}>↓</div>;
}

const pagina = {
  color: "#3b2430",
  fontFamily: "Inter, Arial, sans-serif",
};

const cabecalho = {
  textAlign: "center",
  marginBottom: "18px",
};

const miniTitulo = {
  display: "inline-block",
  background: "#ffe3ef",
  color: "#ec1971",
  padding: "7px 14px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "11px",
  letterSpacing: "1px",
  textTransform: "uppercase",
};

const titulo = {
  fontSize: "38px",
  margin: "10px 0 6px",
  lineHeight: "1",
  color: "#3b2430",
  fontWeight: "900",
};

const subtitulo = {
  fontSize: "15px",
  color: "#7b5a6a",
  maxWidth: "680px",
  margin: "0 auto",
  lineHeight: "1.4",
};

const funilBox = {
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "18px",
  padding: "18px",
  marginBottom: "16px",
  boxShadow: "0 10px 24px rgba(236,25,113,0.05)",
};

const tituloFunil = {
  textAlign: "center",
  margin: "0 0 14px",
  fontSize: "18px",
  color: "#3b2430",
};

const funilGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 26px 1fr 26px 1fr 26px 1fr 26px 1fr",
  gap: "8px",
  alignItems: "center",
};

const funilItem = {
  background: "#fff1f7",
  border: "1px solid #f4cfe0",
  borderRadius: "14px",
  padding: "12px 10px",
  textAlign: "center",
  color: "#3b2430",
  fontSize: "13px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
};

const funilSeta = {
  textAlign: "center",
  color: "#ec1971",
  fontWeight: "900",
  fontSize: "18px",
};

const metricasGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: "12px",
  marginBottom: "16px",
};

const metricaCard = {
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "16px",
  padding: "16px 10px",
  textAlign: "center",
  boxShadow: "0 10px 24px rgba(236,25,113,0.05)",
  color: "#3b2430",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
};

const metricaDestaque = {
  background: "linear-gradient(135deg, #ec1971, #7b1fa2)",
  color: "#fff",
};

const barraBusca = {
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "18px",
  padding: "14px",
  marginBottom: "14px",
};

const inputBusca = {
  width: "100%",
  border: "1px solid #f3bfd5",
  borderRadius: "12px",
  padding: "12px 14px",
  outline: "none",
  fontSize: "14px",
  color: "#8b1747",
  background: "#ffffff",
  boxSizing: "border-box",
};

const filtrosBox = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "18px",
};

const filtroBotao = {
  border: "1px solid #f4cfe0",
  background: "#fff",
  color: "#ec1971",
  borderRadius: "999px",
  padding: "8px 14px",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "12px",
};

const filtroBotaoAtivo = {
  background: "#ec1971",
  color: "#fff",
};

const lista = {
  display: "grid",
  gap: "14px",
};

const card = {
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "18px",
  padding: "18px",
  boxShadow: "0 10px 24px rgba(236,25,113,0.05)",
  color: "#3b2430",
};

const cardTopo = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "flex-start",
};

const cardTitulo = {
  margin: "0 0 8px",
  fontSize: "18px",
  color: "#3b2430",
};

const cliente = {
  margin: "0 0 5px",
  color: "#4b3a45",
  fontSize: "14px",
};

const detalhes = {
  margin: "0 0 4px",
  color: "#7c6672",
  fontSize: "13px",
};

const statusBadge = {
  padding: "7px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  whiteSpace: "nowrap",
  fontSize: "12px",
};

const valorBox = {
  marginTop: "14px",
  background: "#fff1f7",
  border: "1px solid #f4cfe0",
  borderRadius: "14px",
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "center",
  color: "#3b2430",
  fontSize: "13px",
};

const observacao = {
  background: "#fff8fb",
  border: "1px dashed #f4cfe0",
  padding: "12px",
  borderRadius: "13px",
  color: "#6b4e5b",
  fontSize: "13px",
  margin: "12px 0 0",
};

const acoesLinha = {
  display: "flex",
  flexWrap: "nowrap",
  gap: "7px",
  marginTop: "14px",
  overflowX: "auto",
  paddingBottom: "2px",
};

const botaoBase = {
  border: "none",
  borderRadius: "9px",
  padding: "7px 10px",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "11px",
  lineHeight: "1",
  whiteSpace: "nowrap",
};

const botaoNeutro = {
  ...botaoBase,
  background: "#f4f4f5",
  color: "#3f3f46",
};

const botaoAzul = {
  ...botaoBase,
  background: "#e0f2fe",
  color: "#0369a1",
};

const botaoVerdeClaro = {
  ...botaoBase,
  background: "#dcfce7",
  color: "#15803d",
};

const botaoAmarelo = {
  ...botaoBase,
  background: "#fef3c7",
  color: "#92400e",
};

const botaoWhats = {
  ...botaoBase,
  background: "#22c55e",
  color: "#fff",
};

const botaoPrincipal = {
  ...botaoBase,
  background: "#ec1971",
  color: "#fff",
};

const botaoExcluir = {
  ...botaoBase,
  background: "#fee2e2",
  color: "#b91c1c",
};

const mensagem = {
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "18px",
  padding: "24px",
  textAlign: "center",
  color: "#7c6672",
};