import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

const STATUS_FLUXO = [
  { id: "aguardando_sinal", label: "Aguardando sinal", icon: "🟡", color: "#92400e", bg: "#fef3c7" },
  { id: "em_producao", label: "Em produção", icon: "🔵", color: "#0369a1", bg: "#e0f2fe" },
  { id: "aguardando_aprovacao", label: "Aguardando aprovação", icon: "🟣", color: "#7e22ce", bg: "#f3e8ff" },
  { id: "finalizado", label: "Finalizado", icon: "🟢", color: "#15803d", bg: "#dcfce7" },
  { id: "entregue", label: "Entregue", icon: "🚚", color: "#0f766e", bg: "#ccfbf1" },
];

export default function Producao() {
  const [tarefas, setTarefas] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [movendoId, setMovendoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState(null);

  const [form, setForm] = useState({
    delivery_date: "",
    payment_due_date: "",
    production_responsible: "",
    estimated_time: "",
    signal_value: "",
    internal_notes: "",
    approved_art_url: "",
  });

  useEffect(() => {
    carregarProducao();
  }, []);

  async function carregarProducao() {
  try {
    setCarregando(true);

    const q = query(collection(db, "production"), orderBy("created_at", "desc"));
    const snap = await getDocs(q);

    const pedidosSnap = await getDocs(collection(db, "orders"));
    const pedidosMap = {};

    pedidosSnap.docs.forEach((docItem) => {
      pedidosMap[docItem.id] = {
        id: docItem.id,
        ...docItem.data(),
      };
    });

    const lista = snap.docs
      .map((item) => {
        const tarefa = { id: item.id, ...item.data() };
        const pedido = pedidosMap[tarefa.order_id] || {};

        const total = Number(
          pedido.total_value ||
            tarefa.total_value ||
            tarefa.value ||
            tarefa.price ||
            0
        );

        const sinal = Number(
          pedido.signal_value ||
            tarefa.signal_value ||
            0
        );

        const restante = Math.max(total - sinal, 0);

        return {
          ...tarefa,
          client_name: tarefa.client_name || pedido.client_name || "",
          client_whatsapp: tarefa.client_whatsapp || pedido.client_whatsapp || "",
          product_name: tarefa.product_name || pedido.product_name || "",
          quantity: tarefa.quantity || pedido.quantity || 1,
          total_value: total,
          value: total,
          signal_value: sinal,
          remaining_value: restante,
          payment_due_date: tarefa.payment_due_date || pedido.payment_due_date || "",
          payment_method: tarefa.payment_method || pedido.payment_method || "pix",
        };
      })
      .filter((item) => !item.deleted && item.status !== "excluido");

    setTarefas(lista);
  } catch (erro) {
    console.error("Erro ao carregar produção:", erro);
  } finally {
    setCarregando(false);
  }
}

  function normalizarStatus(status) {
    const valor = String(status || "").toLowerCase();

    if (valor.includes("sinal") || valor.includes("confirmar")) return "aguardando_sinal";
    if (valor.includes("producao") || valor.includes("produção")) return "em_producao";
    if (valor.includes("aprov")) return "aguardando_aprovacao";
    if (valor.includes("final")) return "finalizado";
    if (valor.includes("entreg")) return "entregue";

    return "aguardando_sinal";
  }

  function proximoStatus(statusAtual) {
    const idAtual = normalizarStatus(statusAtual);
    const indexAtual = STATUS_FLUXO.findIndex((item) => item.id === idAtual);

    if (indexAtual === -1) return STATUS_FLUXO[1];
    if (indexAtual >= STATUS_FLUXO.length - 1) return null;

    return STATUS_FLUXO[indexAtual + 1];
  }

  function numeroPedido(tarefa) {
    return String(tarefa.order_id || tarefa.quote_id || tarefa.id).slice(-4).toUpperCase();
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function numero(valor) {
    return Number(String(valor || 0).replace(",", "."));
  }

  function formatarData(data) {
    if (!data) return "Sem data";

    try {
      if (data?.toDate) return data.toDate().toLocaleDateString("pt-BR");
      return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
    } catch {
      return "Sem data";
    }
  }

  function tarefaAtrasada(tarefa) {
    if (!tarefa.delivery_date) return false;
    if (normalizarStatus(tarefa.status) === "entregue") return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const entrega = new Date(`${tarefa.delivery_date}T00:00:00`);
    entrega.setHours(0, 0, 0, 0);

    return entrega < hoje;
  }

  function obterValorTotal(tarefa, pedido = {}) {
    return Number(
      pedido.total_value ||
        pedido.total ||
        pedido.total_amount ||
        pedido.valor_total ||
        pedido.value ||
        tarefa.total_value ||
        tarefa.total ||
        tarefa.total_amount ||
        tarefa.valor_total ||
        tarefa.value ||
        tarefa.price ||
        0
    );
  }

  async function criarCobrancaFinanceira(tarefa) {
    try {
      let pedido = {};

      if (tarefa.order_id) {
        const pedidoSnap = await getDoc(doc(db, "orders", tarefa.order_id));
        if (pedidoSnap.exists()) {
          pedido = { id: pedidoSnap.id, ...pedidoSnap.data() };
        }
      }

      const valorTotal = obterValorTotal(tarefa, pedido);
      const valorRecebido = Number(
        tarefa.signal_value ||
          pedido.signal_value ||
          0
      );

      const valorRestante = Math.max(valorTotal - valorRecebido, 0);

      if (valorRestante <= 0) {
        if (tarefa.order_id) {
          await updateDoc(doc(db, "orders", tarefa.order_id), {
            payment_status: "pago_total",
            remaining_value: 0,
            financial_status: "recebido",
            updated_at: serverTimestamp(),
          });
        }

        await updateDoc(doc(db, "production", tarefa.id), {
          financial_status: "recebido",
          remaining_value: 0,
          updated_at: serverTimestamp(),
        });

        return;
      }

      const paymentId = `production_${tarefa.id}`;

      await setDoc(
        doc(db, "payments", paymentId),
        {
          type: "a_receber",
          status: "a_receber",
          value: valorRestante,
          description: `Saldo a receber - Pedido #${numeroPedido(tarefa)}`,
          method: pedido.payment_method || tarefa.payment_method || "pix",
          category: "vendas",
          date: tarefa.payment_due_date || new Date().toISOString().slice(0, 10),
          due_date: tarefa.payment_due_date || new Date().toISOString().slice(0, 10),

          related_order: tarefa.order_id || "",
          production_id: tarefa.id,
          quote_id: tarefa.quote_id || "",

          client_name: pedido.client_name || tarefa.client_name || "",
          client_whatsapp: pedido.client_whatsapp || tarefa.client_whatsapp || "",
          product_name: pedido.product_name || tarefa.product_name || "",

          total_order_value: valorTotal,
          signal_value: valorRecebido,
          remaining_value: valorRestante,

          source: "Produção",
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );

      if (tarefa.order_id) {
        await updateDoc(doc(db, "orders", tarefa.order_id), {
          payment_status: valorRecebido > 0 ? "sinal_pago" : "nao_pago",
          signal_value: valorRecebido,
          remaining_value: valorRestante,
          payment_due_date: tarefa.payment_due_date || "",
          financial_status: "a_receber",
          financial_payment_id: paymentId,
          updated_at: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, "production", tarefa.id), {
        financial_payment_id: paymentId,
        financial_status: "a_receber",
        signal_value: valorRecebido,
        remaining_value: valorRestante,
        payment_due_date: tarefa.payment_due_date || "",
        updated_at: serverTimestamp(),
      });
    } catch (erro) {
      console.error("Erro ao criar cobrança financeira:", erro);
      alert("Pedido entregue, mas houve erro ao criar cobrança no financeiro.");
    }
  }

  async function alterarStatus(tarefa, novoStatus) {
    try {
      setMovendoId(tarefa.id);

      await updateDoc(doc(db, "production", tarefa.id), {
        status: novoStatus,
        updated_at: serverTimestamp(),
      });

      if (tarefa.order_id) {
        await updateDoc(doc(db, "orders", tarefa.order_id), {
          production_status: novoStatus,
          order_status: novoStatus === "entregue" ? "entregue" : "em_andamento",
          updated_at: serverTimestamp(),
        });
      }

      if (novoStatus === "entregue") {
        await criarCobrancaFinanceira({ ...tarefa, status: novoStatus });
      }

      setTarefas((lista) =>
        lista.map((item) =>
          item.id === tarefa.id
            ? {
                ...item,
                status: novoStatus,
                financial_status:
                  novoStatus === "entregue"
                    ? "a_receber"
                    : item.financial_status || "",
              }
            : item
        )
      );
    } catch (erro) {
      console.error("Erro ao alterar status:", erro);
      alert("Erro ao mover tarefa.");
    } finally {
      setMovendoId(null);
    }
  }

  async function moverProximaEtapa(tarefa) {
    const proximo = proximoStatus(tarefa.status);

    if (!proximo) {
      alert("Este pedido já está como entregue.");
      return;
    }

    await alterarStatus(tarefa, proximo.id);
  }

  async function excluirTarefa(tarefa) {
    const confirmar = window.confirm(
      `Excluir esta produção?\n\nPedido #${numeroPedido(tarefa)}\nCliente: ${tarefa.client_name || "Sem nome"}`
    );

    if (!confirmar) return;

    try {
      if (tarefa.financial_payment_id) {
        await deleteDoc(doc(db, "payments", tarefa.financial_payment_id));
      } else {
        await deleteDoc(doc(db, "payments", `production_${tarefa.id}`)).catch(() => {});
      }

      await deleteDoc(doc(db, "production", tarefa.id));

      if (tarefa.order_id) {
        await updateDoc(doc(db, "orders", tarefa.order_id), {
          production_status: "excluido",
          financial_status: "",
          financial_payment_id: "",
          updated_at: serverTimestamp(),
        });
      }

      setTarefas((lista) => lista.filter((item) => item.id !== tarefa.id));
    } catch (erro) {
      console.error("Erro ao excluir produção:", erro);
      alert("Erro ao excluir produção.");
    }
  }

  function abrirWhatsApp(tarefa) {
    const numeroLimpo = String(tarefa.client_whatsapp || "").replace(/\D/g, "");

    if (!numeroLimpo) {
      alert("Esta tarefa não tem WhatsApp cadastrado.");
      return;
    }

    const numeroFinal = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;

    const statusAtual =
      STATUS_FLUXO.find((item) => item.id === normalizarStatus(tarefa.status)) ||
      STATUS_FLUXO[0];

    const mensagem = `Olá, ${tarefa.client_name || ""}! 😊

Passando para atualizar seu pedido:
${tarefa.product_name || "Produto personalizado"}

Status atual: ${statusAtual.label}

Qualquer dúvida, estou à disposição. 💕`;

    window.open(
      `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensagem)}`,
      "_blank"
    );
  }

  function abrirModal(tarefa) {
    setTarefaEditando(tarefa);

    setForm({
      delivery_date: tarefa.delivery_date || "",
      payment_due_date: tarefa.payment_due_date || "",
      production_responsible: tarefa.production_responsible || "",
      estimated_time: tarefa.estimated_time || "",
      signal_value: tarefa.signal_value || "",
      internal_notes: tarefa.internal_notes || "",
      approved_art_url: tarefa.approved_art_url || "",
    });

    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setTarefaEditando(null);
  }

  async function salvarEdicao() {
    if (!tarefaEditando) return;

    try {
      const valorTotal = obterValorTotal(tarefaEditando);
      const sinal = numero(form.signal_value);
      const restante = Math.max(valorTotal - sinal, 0);

      const dados = {
        delivery_date: form.delivery_date,
        payment_due_date: form.payment_due_date,
        production_responsible: form.production_responsible,
        estimated_time: form.estimated_time,
        signal_value: sinal,
        remaining_value: restante,
        internal_notes: form.internal_notes,
        approved_art_url: form.approved_art_url,
        updated_at: serverTimestamp(),
      };

      await updateDoc(doc(db, "production", tarefaEditando.id), dados);

      if (tarefaEditando.order_id) {
        await updateDoc(doc(db, "orders", tarefaEditando.order_id), {
          delivery_date: form.delivery_date,
          payment_due_date: form.payment_due_date,
          production_responsible: form.production_responsible,
          estimated_time: form.estimated_time,
          signal_value: sinal,
          remaining_value: restante,
          payment_status:
            restante <= 0 ? "pago_total" : sinal > 0 ? "sinal_pago" : "nao_pago",
          updated_at: serverTimestamp(),
        });
      }

      if (tarefaEditando.financial_payment_id || normalizarStatus(tarefaEditando.status) === "entregue") {
        await criarCobrancaFinanceira({
          ...tarefaEditando,
          ...dados,
          signal_value: sinal,
          remaining_value: restante,
        });
      }

      setTarefas((lista) =>
        lista.map((item) =>
          item.id === tarefaEditando.id
            ? { ...item, ...dados, signal_value: sinal, remaining_value: restante }
            : item
        )
      );

      fecharModal();
    } catch (erro) {
      console.error("Erro ao salvar produção:", erro);
      alert("Erro ao salvar edição da produção.");
    }
  }

  const tarefasFiltradas = tarefas.filter((tarefa) => {
    const termo = busca.toLowerCase().trim();

    return (
      !termo ||
      String(tarefa.client_name || "").toLowerCase().includes(termo) ||
      String(tarefa.client_whatsapp || "").toLowerCase().includes(termo) ||
      String(tarefa.product_name || "").toLowerCase().includes(termo)
    );
  });

  const tarefasPorStatus = useMemo(() => {
    return STATUS_FLUXO.reduce((acc, status) => {
      acc[status.id] = tarefasFiltradas.filter(
        (tarefa) => normalizarStatus(tarefa.status) === status.id
      );
      return acc;
    }, {});
  }, [tarefasFiltradas]);

  const metricas = useMemo(() => {
    const porStatus = STATUS_FLUXO.reduce((acc, status) => {
      acc[status.id] = tarefas.filter(
        (item) => normalizarStatus(item.status) === status.id
      ).length;
      return acc;
    }, {});

    return { total: tarefas.length, ...porStatus };
  }, [tarefas]);

  return (
    <div style={pagina}>
      <header style={cabecalho}>
        <span style={miniTitulo}>Operação</span>
        <h1 style={titulo}>Produção</h1>
        <p style={subtitulo}>
          Kanban profissional para acompanhar cada pedido até a entrega.
        </p>
      </header>

      <section style={metricasGrid}>
        <MetricaCard numero={metricas.total} label="Total" icone="📦" />
        <MetricaCard numero={metricas.aguardando_sinal || 0} label="Aguardando sinal" icone="🟡" />
        <MetricaCard numero={metricas.em_producao || 0} label="Em produção" icone="🔵" />
        <MetricaCard numero={metricas.aguardando_aprovacao || 0} label="Aguardando aprovação" icone="🟣" />
        <MetricaCard numero={metricas.entregue || 0} label="Entregues" icone="🚚" destaque />
      </section>

      <section style={barraBusca}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente, WhatsApp ou produto..."
          style={inputBusca}
        />
      </section>

      {carregando ? (
        <div style={mensagem}>Carregando produção...</div>
      ) : (
        <section style={kanban}>
          {STATUS_FLUXO.map((status) => (
            <div key={status.id} style={coluna}>
              <div style={colunaTopo}>
                <div style={colunaTituloBox}>
                  <span
                    style={{
                      ...colunaIcone,
                      background: status.bg,
                      color: status.color,
                    }}
                  >
                    {status.icon}
                  </span>

                  <div>
                    <h2 style={colunaTitulo}>{status.label}</h2>
                    <p style={colunaContador}>
                      {(tarefasPorStatus[status.id] || []).length} tarefa(s)
                    </p>
                  </div>
                </div>
              </div>

              <div style={cardsColuna}>
                {(tarefasPorStatus[status.id] || []).length === 0 ? (
                  <div style={colunaVazia}>Nenhuma tarefa aqui.</div>
                ) : (
                  tarefasPorStatus[status.id].map((tarefa) => (
                    <TarefaCard
                      key={tarefa.id}
                      tarefa={tarefa}
                      status={status}
                      movendoId={movendoId}
                      numeroPedido={numeroPedido}
                      formatarMoeda={formatarMoeda}
                      formatarData={formatarData}
                      tarefaAtrasada={tarefaAtrasada}
                      moverProximaEtapa={moverProximaEtapa}
                      alterarStatus={alterarStatus}
                      abrirWhatsApp={abrirWhatsApp}
                      abrirModal={abrirModal}
                      excluirTarefa={excluirTarefa}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {modalAberto && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={modalHeader}>
              <div>
                <span style={miniTitulo}>Editar produção</span>
                <h2 style={modalTitulo}>Pedido #{numeroPedido(tarefaEditando || {})}</h2>
              </div>

              <button onClick={fecharModal} style={botaoFechar}>
                ×
              </button>
            </div>

            <div style={modalGrid}>
              <label style={campoLabel}>
                📅 Data prevista de entrega
                <input
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                  style={inputModal}
                />
              </label>

              <label style={campoLabel}>
                💰 Data para pagar restante
                <input
                  type="date"
                  value={form.payment_due_date}
                  onChange={(e) => setForm({ ...form, payment_due_date: e.target.value })}
                  style={inputModal}
                />
              </label>

              <label style={campoLabel}>
                👩‍🎨 Responsável pela produção
                <input
                  type="text"
                  value={form.production_responsible}
                  onChange={(e) => setForm({ ...form, production_responsible: e.target.value })}
                  placeholder="Ex: Naty"
                  style={inputModal}
                />
              </label>

              <label style={campoLabel}>
                ⏱ Tempo estimado
                <input
                  type="text"
                  value={form.estimated_time}
                  onChange={(e) => setForm({ ...form, estimated_time: e.target.value })}
                  placeholder="Ex: 2h30"
                  style={inputModal}
                />
              </label>

              <label style={campoLabel}>
                💵 Sinal pago
                <input
                  type="number"
                  step="0.01"
                  value={form.signal_value}
                  onChange={(e) => setForm({ ...form, signal_value: e.target.value })}
                  placeholder="Ex: 30"
                  style={inputModal}
                />
              </label>

              <label style={campoLabel}>
                📎 Link da arte aprovada
                <input
                  type="url"
                  value={form.approved_art_url}
                  onChange={(e) => setForm({ ...form, approved_art_url: e.target.value })}
                  placeholder="Cole aqui o link da arte"
                  style={inputModal}
                />
              </label>
            </div>

            <label style={campoLabel}>
              📝 Observações internas
              <textarea
                value={form.internal_notes}
                onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
                placeholder="Detalhes importantes da produção..."
                style={textareaModal}
              />
            </label>

            <div style={modalAcoes}>
              <button onClick={fecharModal} style={botaoCancelar}>
                Cancelar
              </button>

              <button onClick={salvarEdicao} style={botaoSalvar}>
                Salvar produção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TarefaCard({
  tarefa,
  status,
  movendoId,
  numeroPedido,
  formatarMoeda,
  formatarData,
  tarefaAtrasada,
  moverProximaEtapa,
  alterarStatus,
  abrirWhatsApp,
  abrirModal,
  excluirTarefa,
}) {
  const atualIndex = STATUS_FLUXO.findIndex((item) => item.id === status.id);
  const proximo =
    atualIndex === -1 || atualIndex >= STATUS_FLUXO.length - 1
      ? null
      : STATUS_FLUXO[atualIndex + 1];

  const atrasado = tarefaAtrasada(tarefa);

  return (
    <article style={{ ...card, ...(atrasado ? cardAtrasado : {}) }}>
      <div style={cardLinhaTopo}>
        <span style={pedidoTag}>Pedido #{numeroPedido(tarefa)}</span>

        {atrasado ? (
          <span style={atrasadoTag}>🚨 Atrasado</span>
        ) : (
          <span style={{ ...statusBolinha, background: status.bg, color: status.color }}>
            {status.icon}
          </span>
        )}
      </div>

      <p style={clienteNome}>👤 {tarefa.client_name || "Sem nome"}</p>

      <div style={infoLinha}>
        <span>📅 {formatarData(tarefa.delivery_date)}</span>
        <span>👩‍🎨 {tarefa.production_responsible || "Sem responsável"}</span>
      </div>

      <div style={infoLinha}>
        <span>⏱ {tarefa.estimated_time || "--"}</span>
        <span>{tarefa.quantity || 1} un.</span>
      </div>

      <h3 style={produtoNome}>
        {tarefa.product_name || "Produto personalizado"}
      </h3>

      <div style={infoRapida}>
        <span>{formatarMoeda(tarefa.total_value || tarefa.value || tarefa.price || 0)}</span>
      </div>

      {(Number(tarefa.signal_value || 0) > 0 || Number(tarefa.remaining_value || 0) > 0) && (
        <div style={financeiroResumo}>
          <span>Sinal: {formatarMoeda(tarefa.signal_value || 0)}</span>
          <span>Restante: {formatarMoeda(tarefa.remaining_value || 0)}</span>
        </div>
      )}

      {tarefa.payment_due_date && (
        <p style={vencimentoTexto}>💰 Restante vence em {formatarData(tarefa.payment_due_date)}</p>
      )}

      {tarefa.financial_status === "a_receber" && (
        <span style={financeiroTag}>💰 Financeiro criado</span>
      )}

      {tarefa.internal_notes && (
        <p style={notaInterna}>📝 {tarefa.internal_notes}</p>
      )}

      <div style={atalhosStatus}>
        {STATUS_FLUXO.map((item) => (
          <button
            key={item.id}
            onClick={() => alterarStatus(tarefa, item.id)}
            title={item.label}
            style={{
              ...atalhoBotao,
              ...(item.id === status.id
                ? {
                    background: item.bg,
                    borderColor: item.bg,
                    color: item.color,
                  }
                : {}),
            }}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <div style={acoes}>
        {tarefa.approved_art_url && (
          <button
            onClick={() => window.open(tarefa.approved_art_url, "_blank")}
            style={botaoArte}
          >
            📎 Ver Arte
          </button>
        )}

        <button onClick={() => abrirModal(tarefa)} style={botaoEditar}>
          ✏️ Editar
        </button>

        <button onClick={() => abrirWhatsApp(tarefa)} style={botaoWhats}>
          💬 WhatsApp
        </button>

        <button
          onClick={() => moverProximaEtapa(tarefa)}
          disabled={!proximo || movendoId === tarefa.id}
          style={{
            ...botaoPrincipal,
            opacity: !proximo || movendoId === tarefa.id ? 0.55 : 1,
          }}
        >
          {movendoId === tarefa.id
            ? "Movendo..."
            : proximo
            ? `Mover para ${proximo.label}`
            : "Entregue"}
        </button>

        <button onClick={() => excluirTarefa(tarefa)} style={botaoExcluir}>
          🗑️ Excluir
        </button>
      </div>
    </article>
  );
}

function MetricaCard({ numero, label, icone, destaque }) {
  return (
    <div style={{ ...metricaCard, ...(destaque ? metricaDestaque : {}) }}>
      <div style={metricaIcone}>{icone}</div>
      <strong style={metricaNumero}>{numero}</strong>
      <span style={metricaTexto}>{label}</span>
    </div>
  );
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
  padding: "18px 12px",
  textAlign: "center",
  boxShadow: "0 10px 24px rgba(236,25,113,0.05)",
  color: "#3b2430",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
};

const metricaDestaque = {
  background: "linear-gradient(135deg, #ec1971, #7b1fa2)",
  color: "#fff",
};

const metricaIcone = {
  fontSize: "24px",
  marginBottom: "4px",
};

const metricaNumero = {
  fontSize: "32px",
  fontWeight: "900",
  lineHeight: "1",
};

const metricaTexto = {
  fontSize: "14px",
  fontWeight: "700",
  textAlign: "center",
};

const barraBusca = {
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "18px",
  padding: "14px",
  marginBottom: "18px",
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

const kanban = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(260px, 1fr))",
  gap: "14px",
  alignItems: "start",
  overflowX: "auto",
  paddingBottom: "10px",
};

const coluna = {
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "18px",
  padding: "12px",
  minHeight: "360px",
  boxShadow: "0 10px 24px rgba(236,25,113,0.05)",
  boxSizing: "border-box",
  overflow: "hidden",
};

const colunaTopo = {
  paddingBottom: "10px",
  borderBottom: "1px solid #fde1ec",
  marginBottom: "12px",
};

const colunaTituloBox = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const colunaIcone = {
  width: "36px",
  height: "36px",
  borderRadius: "12px",
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
};

const colunaTitulo = {
  margin: 0,
  fontSize: "15px",
  color: "#3b2430",
  lineHeight: "1.2",
};

const colunaContador = {
  margin: "2px 0 0",
  fontSize: "12px",
  color: "#9b687f",
};

const cardsColuna = {
  display: "grid",
  gap: "10px",
  width: "100%",
  boxSizing: "border-box",
};

const colunaVazia = {
  border: "1px dashed #f4cfe0",
  borderRadius: "14px",
  padding: "18px",
  textAlign: "center",
  color: "#b18498",
  fontSize: "13px",
  background: "#fff8fb",
};

const card = {
  background: "#fff8fb",
  border: "1px solid #f4cfe0",
  borderRadius: "14px",
  padding: "12px",
  color: "#3b2430",
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const cardAtrasado = {
  border: "2px solid #ef4444",
  background: "#fff5f5",
};

const cardLinhaTopo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  marginBottom: "8px",
};

const pedidoTag = {
  fontSize: "11px",
  color: "#a06b84",
  fontWeight: "900",
};

const statusBolinha = {
  width: "28px",
  height: "28px",
  borderRadius: "10px",
  display: "grid",
  placeItems: "center",
  fontSize: "13px",
};

const atrasadoTag = {
  background: "#fee2e2",
  color: "#b91c1c",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "10px",
  fontWeight: "900",
};

const financeiroTag = {
  display: "inline-flex",
  background: "#dcfce7",
  color: "#15803d",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "10px",
  fontWeight: "900",
  marginBottom: "8px",
};

const financeiroResumo = {
  display: "grid",
  gap: "4px",
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "10px",
  padding: "8px",
  fontSize: "11px",
  color: "#8b1747",
  fontWeight: "800",
  marginBottom: "8px",
};

const vencimentoTexto = {
  margin: "0 0 8px",
  fontSize: "11px",
  color: "#92400e",
  fontWeight: "800",
};

const clienteNome = {
  fontSize: "13px",
  color: "#5b4350",
  margin: "0 0 8px",
};

const infoLinha = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  fontSize: "11px",
  color: "#7c6672",
  marginBottom: "6px",
};

const produtoNome = {
  fontSize: "13px",
  fontWeight: "900",
  lineHeight: "1.25",
  margin: "10px 0 8px",
  color: "#3b2430",
};

const infoRapida = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  fontSize: "13px",
  fontWeight: "900",
  marginBottom: "10px",
  color: "#ec1971",
};

const notaInterna = {
  background: "#fff",
  border: "1px dashed #f4cfe0",
  padding: "8px",
  borderRadius: "10px",
  color: "#6b4e5b",
  fontSize: "11px",
  margin: "8px 0 0",
};

const atalhosStatus = {
  display: "flex",
  gap: "6px",
  marginTop: "10px",
  overflowX: "auto",
};

const atalhoBotao = {
  border: "1px solid #f4cfe0",
  background: "#fff",
  borderRadius: "9px",
  padding: "6px 8px",
  cursor: "pointer",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const acoes = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "7px",
  marginTop: "10px",
};

const botaoBase = {
  border: "none",
  borderRadius: "10px",
  padding: "8px 8px",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "10px",
  lineHeight: "1.2",
  color: "#fff",
};

const botaoArte = {
  ...botaoBase,
  background: "#8b5cf6",
};

const botaoEditar = {
  ...botaoBase,
  background: "#f59e0b",
};

const botaoWhats = {
  ...botaoBase,
  background: "#22c55e",
};

const botaoPrincipal = {
  ...botaoBase,
  background: "#ec1971",
};

const botaoExcluir = {
  ...botaoBase,
  background: "#ef4444",
};

const mensagem = {
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "18px",
  padding: "24px",
  textAlign: "center",
  color: "#7c6672",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "20px",
};

const modalBox = {
  width: "720px",
  maxWidth: "96vw",
  background: "#fff",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.18)",
  border: "1px solid #f4cfe0",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  marginBottom: "18px",
};

const modalTitulo = {
  margin: "10px 0 0",
  color: "#3b2430",
};

const botaoFechar = {
  width: "38px",
  height: "38px",
  border: "none",
  borderRadius: "12px",
  background: "#ffe3ef",
  color: "#ec1971",
  fontSize: "22px",
  cursor: "pointer",
};

const modalGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const campoLabel = {
  display: "grid",
  gap: "6px",
  color: "#5b4350",
  fontWeight: "800",
  fontSize: "13px",
};

const inputModal = {
  border: "1px solid #f3bfd5",
  borderRadius: "12px",
  padding: "12px 14px",
  outline: "none",
  fontSize: "14px",
  color: "#8b1747",
  background: "#fff",
  boxSizing: "border-box",
};

const textareaModal = {
  ...inputModal,
  minHeight: "110px",
  resize: "vertical",
  marginTop: "14px",
};

const modalAcoes = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "18px",
};

const botaoCancelar = {
  border: "1px solid #f4cfe0",
  background: "#fff",
  color: "#3b2430",
  borderRadius: "12px",
  padding: "12px 18px",
  fontWeight: "900",
  cursor: "pointer",
};

const botaoSalvar = {
  border: "none",
  background: "#ec1971",
  color: "#fff",
  borderRadius: "12px",
  padding: "12px 18px",
  fontWeight: "900",
  cursor: "pointer",
};