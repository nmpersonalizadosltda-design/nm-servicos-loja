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

const pedidoInicial = {
  client_id: "",
  client_name: "",
  client_whatsapp: "",
  product_name: "",
  quantity: 1,
  unit_value: "",
  total_value: 0,
  signal_value: "",
  remaining_value: 0,
  payment_due_date: "",
  payment_status: "nao_pago",
  payment_method: "pix",
  order_status: "aguardando_sinal",
  delivery_date: "",
  delivery_time: "",
  delivery_type: "entrega",
  delivery_address: "",
  priority: "normal",
  notes: "",
  internal_notes: "",
};

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pedido, setPedido] = useState(pedidoInicial);
  const [pedidoEditandoId, setPedidoEditandoId] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroPagamento, setFiltroPagamento] = useState("todos");
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarPedidos();
    carregarClientes();
  }, []);

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

  async function carregarClientes() {
    const snapshot = await getDocs(collection(db, "clients"));
    const lista = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    lista.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    setClientes(lista);
  }

  function numero(valor) {
    return Number(String(valor || 0).replace(",", "."));
  }

  function recalcularPedido(dados) {
    const quantidade = Number(dados.quantity || 1);
    const unitario = numero(dados.unit_value);
    const total = quantidade * unitario;
    const sinal = numero(dados.signal_value);
    const restante = Math.max(total - sinal, 0);

    let payment_status = dados.payment_status || "nao_pago";

    if (total > 0 && restante <= 0) {
      payment_status = "pago_total";
    } else if (sinal > 0) {
      payment_status = "sinal_pago";
    } else {
      payment_status = "nao_pago";
    }

    return {
      ...dados,
      quantity: quantidade,
      unit_value: unitario || dados.unit_value,
      total_value: total,
      signal_value: sinal,
      remaining_value: restante,
      payment_status,
    };
  }

  function atualizarPedido(campo, valor) {
    setPedido((prev) => {
      const novoPedido = {
        ...prev,
        [campo]: valor,
      };

      if (["quantity", "unit_value", "signal_value"].includes(campo)) {
        return recalcularPedido(novoPedido);
      }

      return novoPedido;
    });
  }

  function selecionarCliente(clienteId) {
    const clienteSelecionado = clientes.find((item) => item.id === clienteId);

    if (!clienteSelecionado) {
      setPedido((prev) => ({
        ...prev,
        client_id: "",
        client_name: "",
        client_whatsapp: "",
      }));
      return;
    }

    setPedido((prev) => ({
      ...prev,
      client_id: clienteSelecionado.id,
      client_name: clienteSelecionado.name || "",
      client_whatsapp: clienteSelecionado.whatsapp || "",
      delivery_address: clienteSelecionado.address || prev.delivery_address || "",
    }));
  }

  function limparNumero(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(valor) {
    if (!valor) return "Sem data";

    try {
      if (valor?.toDate) return valor.toDate().toLocaleDateString("pt-BR");
      const data = new Date(`${valor}T00:00:00`);
      if (Number.isNaN(data.getTime())) return String(valor);
      return data.toLocaleDateString("pt-BR");
    } catch {
      return String(valor);
    }
  }

  function obterStatusPedido(pedidoItem) {
    return pedidoItem.order_status || pedidoItem.status || "aguardando_sinal";
  }

  function obterPagamentoPedido(pedidoItem) {
    return pedidoItem.payment_status || "nao_pago";
  }

  function traduzirStatusPedido(status) {
    const mapa = {
      novo: "Novo",
      aguardando_sinal: "A confirmar",
      confirmado: "Confirmado",
      em_producao: "Em produção",
      pronto: "Pronto",
      entregue: "Entregue",
      cancelado: "Cancelado",
      arquivado: "Arquivado",
    };

    return mapa[status] || status || "Não informado";
  }

  function traduzirPagamento(status) {
    const mapa = {
      nao_pago: "A receber",
      pendente: "A receber",
      sinal_pago: "Sinal pago",
      pago: "Pago",
      pago_total: "Pago",
      recebido: "Recebido",
    };

    return mapa[status] || status || "Não informado";
  }

  function corStatus(status) {
    const mapa = {
      novo: "#64748B",
      aguardando_sinal: "#F97316",
      confirmado: "#1976D2",
      em_producao: "#8E24AA",
      pronto: "#16A34A",
      entregue: "#10B981",
      cancelado: "#DC2626",
      arquivado: "#64748B",
    };

    return mapa[status] || "#64748B";
  }

  function isPago(pedidoItem) {
    const pagamento = obterPagamentoPedido(pedidoItem);
    return ["pago", "pago_total", "recebido"].includes(pagamento);
  }

  function isAReceber(pedidoItem) {
    return !isPago(pedidoItem);
  }

  const pedidosAtivos = pedidos.filter((item) => obterStatusPedido(item) !== "arquivado");
  const pedidosArquivados = pedidos.filter((item) => obterStatusPedido(item) === "arquivado");
  const pedidosBase = mostrarArquivados ? pedidosArquivados : pedidosAtivos;

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return pedidosBase.filter((pedidoItem) => {
      const status = obterStatusPedido(pedidoItem);
      const pagamento = obterPagamentoPedido(pedidoItem);

      const statusOk = filtroStatus === "todos" || status === filtroStatus;
      if (!statusOk) return false;

      const pagamentoOk =
        filtroPagamento === "todos" ||
        (filtroPagamento === "a_receber" && isAReceber(pedidoItem)) ||
        (filtroPagamento === "pagos" && isPago(pedidoItem)) ||
        pagamento === filtroPagamento;

      if (!pagamentoOk) return false;
      if (!termo) return true;

      return (
        String(pedidoItem.client_name || "").toLowerCase().includes(termo) ||
        String(pedidoItem.client_whatsapp || "").toLowerCase().includes(termo) ||
        String(pedidoItem.product_name || "").toLowerCase().includes(termo) ||
        String(pedidoItem.id || "").toLowerCase().includes(termo)
      );
    });
  }, [pedidosBase, busca, filtroStatus, filtroPagamento]);

  async function salvarPedido(e) {
    e.preventDefault();

    if (!pedido.client_name.trim()) {
      alert("Informe o nome da cliente.");
      return;
    }

    if (!pedido.product_name.trim()) {
      alert("Informe o produto do pedido.");
      return;
    }

    if (!pedido.unit_value) {
      alert("Informe o valor unitário.");
      return;
    }

    setSalvando(true);

    try {
      const dadosCalculados = recalcularPedido(pedido);

      const dadosPedido = {
        ...dadosCalculados,
        updated_at: new Date(),
      };

      if (pedidoEditandoId) {
        await updateDoc(doc(db, "orders", pedidoEditandoId), dadosPedido);
        alert("Pedido atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "orders"), {
          ...dadosPedido,
          created_at: new Date(),
        });
        alert("Pedido cadastrado com sucesso!");
      }

      fecharModalPedido();
      carregarPedidos();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao salvar pedido.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalNovoPedido() {
    setPedidoEditandoId(null);
    setPedido({ ...pedidoInicial });
    setModalAberto(true);
  }

  function editarPedido(pedidoSelecionado) {
    const quantidade = Number(pedidoSelecionado.quantity || 1);
    const total = numero(pedidoSelecionado.total_value);
    const unitario =
      pedidoSelecionado.unit_value ||
      pedidoSelecionado.price ||
      (total > 0 && quantidade > 0 ? total / quantidade : "");

    const pedidoEditado = {
      client_id: pedidoSelecionado.client_id || "",
      client_name: pedidoSelecionado.client_name || "",
      client_whatsapp: pedidoSelecionado.client_whatsapp || "",
      product_name: pedidoSelecionado.product_name || "",
      quantity: quantidade,
      unit_value: unitario,
      total_value: total,
      signal_value: pedidoSelecionado.signal_value || "",
      remaining_value: pedidoSelecionado.remaining_value || 0,
      payment_due_date: pedidoSelecionado.payment_due_date || "",
      payment_status: pedidoSelecionado.payment_status || "nao_pago",
      payment_method: pedidoSelecionado.payment_method || "pix",
      order_status: pedidoSelecionado.order_status || pedidoSelecionado.status || "aguardando_sinal",
      delivery_date: pedidoSelecionado.delivery_date || "",
      delivery_time: pedidoSelecionado.delivery_time || "",
      delivery_type: pedidoSelecionado.delivery_type || "entrega",
      delivery_address: pedidoSelecionado.delivery_address || "",
      priority: pedidoSelecionado.priority || "normal",
      notes: pedidoSelecionado.notes || "",
      internal_notes: pedidoSelecionado.internal_notes || "",
    };

    setPedidoEditandoId(pedidoSelecionado.id);
    setPedido(recalcularPedido(pedidoEditado));
    setModalAberto(true);
  }

  function fecharModalPedido() {
    setModalAberto(false);
    setPedidoEditandoId(null);
    setPedido({ ...pedidoInicial });
  }

  async function excluirPedido(id) {
    const confirmar = confirm("Tem certeza que deseja excluir este pedido?");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "orders", id));
      alert("Pedido excluído com sucesso!");
      carregarPedidos();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao excluir pedido.");
    }
  }

  async function atualizarStatusPedido(pedidoItem, novoStatus) {
    try {
      await updateDoc(doc(db, "orders", pedidoItem.id), {
        order_status: novoStatus,
        updated_at: new Date(),
      });
      carregarPedidos();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao atualizar pedido.");
    }
  }

  function enviarPedidoWhatsApp(pedidoItem) {
    const telefone = limparNumero(pedidoItem.client_whatsapp);

    if (!telefone) {
      alert("Este pedido não tem WhatsApp cadastrado.");
      return;
    }

    const mensagem = `Olá, ${pedidoItem.client_name}! Tudo bem?

Passando para confirmar seu pedido na NM Serviços:

Produto: ${pedidoItem.product_name}
Quantidade: ${pedidoItem.quantity || 1}
Total: ${formatarPreco(pedidoItem.total_value)}
Sinal: ${formatarPreco(pedidoItem.signal_value)}
Saldo restante: ${formatarPreco(pedidoItem.remaining_value)}
Pagamento do restante: ${pedidoItem.payment_due_date ? formatarData(pedidoItem.payment_due_date) : "A combinar"}
Entrega: ${pedidoItem.delivery_date ? formatarData(pedidoItem.delivery_date) : "A combinar"}

Status: ${traduzirStatusPedido(obterStatusPedido(pedidoItem))}
Pagamento: ${traduzirPagamento(obterPagamentoPedido(pedidoItem))}

Observações: ${pedidoItem.notes || "Sem observações"}`;

    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  function proximoStatus(statusAtual) {
    const fluxo = {
      novo: "aguardando_sinal",
      aguardando_sinal: "confirmado",
      confirmado: "em_producao",
      em_producao: "pronto",
      pronto: "entregue",
      entregue: "entregue",
      cancelado: "cancelado",
    };

    return fluxo[statusAtual] || "confirmado";
  }

  return (
    <div style={pageContainer}>
      <div style={pageHeaderCompacto}>
        <div>
          <h1 style={pageTitleCompacto}>Pedidos</h1>
          <p style={pageDescriptionCompacta}>
            {pedidosAtivos.length} pedido(s) ativo(s)
          </p>
        </div>

        <button type="button" onClick={abrirModalNovoPedido} style={btnPrimary}>
          + Novo pedido
        </button>
      </div>

      <div style={tabsLinha}>
        <button
          type="button"
          onClick={() => setMostrarArquivados(false)}
          style={!mostrarArquivados ? tabAtiva : tabBotao}
        >
          📦 Ativos <span style={contadorMini}>{pedidosAtivos.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setMostrarArquivados(true)}
          style={mostrarArquivados ? tabAtiva : tabBotao}
        >
          🗃️ Arquivados <span style={contadorMini}>{pedidosArquivados.length}</span>
        </button>
      </div>

      <div style={linhaSeparadora} />

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por cliente, produto, nº do pedido..."
        style={inputBusca}
      />

      <div style={filtrosLinha}>
        {["todos", "aguardando_sinal", "confirmado", "em_producao", "pronto", "entregue"].map((status) => (
          <button
            type="button"
            key={status}
            onClick={() => setFiltroStatus(status)}
            style={filtroStatus === status ? filtroAtivo : filtroBotao}
          >
            {status === "todos" ? "Todos" : traduzirStatusPedido(status)}
          </button>
        ))}
      </div>

      <div style={filtrosLinhaSecundaria}>
        <button
          type="button"
          onClick={() => setFiltroPagamento("todos")}
          style={filtroPagamento === "todos" ? filtroAtivo : filtroBotao}
        >
          Todos
        </button>

        <button
          type="button"
          onClick={() => setFiltroPagamento("a_receber")}
          style={filtroPagamento === "a_receber" ? filtroAtivo : filtroBotao}
        >
          💰 A receber
        </button>

        <button
          type="button"
          onClick={() => setFiltroPagamento("pagos")}
          style={filtroPagamento === "pagos" ? filtroAtivo : filtroBotao}
        >
          ✅ Pagos
        </button>
      </div>

      {pedidosFiltrados.length === 0 ? (
        <div style={emptyCard}>Nenhum pedido encontrado.</div>
      ) : (
        <div style={pedidosLista}>
          {pedidosFiltrados.map((pedidoItem) => {
            const status = obterStatusPedido(pedidoItem);
            const pagamento = obterPagamentoPedido(pedidoItem);
            const restante = Math.max(
              numero(pedidoItem.total_value) - numero(pedidoItem.signal_value),
              0
            );

            return (
              <div
                key={pedidoItem.id}
                style={{
                  ...pedidoCard,
                  borderLeft: `4px solid ${corStatus(status)}`,
                }}
              >
                <div style={pedidoTopo}>
                  <div>
                    <div style={clienteLinha}>
                      <strong>{pedidoItem.client_name || "Cliente não informado"}</strong>
                      <span style={statusBadge(status)}>
                        {traduzirStatusPedido(status)}
                      </span>
                    </div>

                    <p style={linhaMeta}>
                      Pedido: {traduzirStatusPedido(status)} &nbsp; Pagamento: {traduzirPagamento(pagamento)}
                    </p>

                    <p style={produtoLinha}>
                      📦 {pedidoItem.product_name || "Produto não informado"} ({pedidoItem.quantity || 1}x)
                    </p>

                    <p style={linhaMeta}>
                      Pedido: {formatarData(pedidoItem.created_at)} &nbsp;&nbsp;
                      Entrega: {pedidoItem.delivery_date ? formatarData(pedidoItem.delivery_date) : "A combinar"} &nbsp;&nbsp;
                      Restante: {pedidoItem.payment_due_date ? formatarData(pedidoItem.payment_due_date) : "A combinar"}
                    </p>
                  </div>

                  <button type="button" style={menuBotao} onClick={() => editarPedido(pedidoItem)}>
                    ⋯
                  </button>
                </div>

                <div style={pedidoRodape}>
                  <div>
                    <strong style={valorPedido}>{formatarPreco(pedidoItem.total_value)}</strong>
                    <span style={sinalBadge}>
                      ✓ Sinal: {formatarPreco(pedidoItem.signal_value)}
                    </span>

                    {restante > 0 && (
                      <span style={aReceberBadge}>
                        A receber: {formatarPreco(restante)}
                      </span>
                    )}
                  </div>

                  <div style={acoesLinha}>
                    <button type="button" onClick={() => enviarPedidoWhatsApp(pedidoItem)} style={botaoWhatsapp}>
                      💬 WhatsApp
                    </button>

                    <button type="button" onClick={() => atualizarStatusPedido(pedidoItem, proximoStatus(status))} style={botaoEditar}>
                      Avançar
                    </button>

                    <button type="button" onClick={() => atualizarStatusPedido(pedidoItem, "arquivado")} style={botaoArquivar}>
                      Arquivar
                    </button>

                    <button type="button" onClick={() => excluirPedido(pedidoItem.id)} style={botaoExcluir}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalAberto && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={modalHeader}>
              <div>
                <div style={modalTag}>📦 {pedidoEditandoId ? "EDITANDO PEDIDO" : "NOVO PEDIDO"}</div>
                <h2 style={modalTitle}>
                  {pedidoEditandoId ? "Editar pedido" : "Cadastrar novo pedido"}
                </h2>
                <p style={modalSubtitle}>
                  Registre cliente, produto, entrega, pagamento e observações de produção.
                </p>
              </div>

              <button type="button" onClick={fecharModalPedido} style={modalClose}>✕</button>
            </div>

            <form onSubmit={salvarPedido}>
              <div style={modalBody}>
                <div style={campoModal}>
                  <label>Cliente cadastrado</label>
                  <select value={pedido.client_id} onChange={(e) => selecionarCliente(e.target.value)} style={inputStyle}>
                    <option value="">Escolha uma cliente</option>
                    {clientes.map((clienteItem) => (
                      <option key={clienteItem.id} value={clienteItem.id}>
                        {clienteItem.name} - {clienteItem.whatsapp}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Nome da cliente</label>
                  <input value={pedido.client_name} onChange={(e) => atualizarPedido("client_name", e.target.value)} style={inputStyle} placeholder="Nome da cliente" />
                </div>

                <div style={campoModal}>
                  <label>Telefone</label>
                  <input value={pedido.client_whatsapp} onChange={(e) => atualizarPedido("client_whatsapp", e.target.value)} style={inputStyle} placeholder="(00) 00000-0000" />
                </div>

                <div style={campoModal}>
                  <label>Data de entrega</label>
                  <input type="date" value={pedido.delivery_date} onChange={(e) => atualizarPedido("delivery_date", e.target.value)} style={inputStyle} />
                </div>

                <div style={campoModal}>
                  <label>Horário da entrega</label>
                  <input type="time" value={pedido.delivery_time} onChange={(e) => atualizarPedido("delivery_time", e.target.value)} style={inputStyle} />
                </div>

                <div style={campoModal}>
                  <label>Tipo de entrega</label>
                  <select value={pedido.delivery_type} onChange={(e) => atualizarPedido("delivery_type", e.target.value)} style={inputStyle}>
                    <option value="entrega">🚚 Entrega</option>
                    <option value="retirada">🏠 Retirada</option>
                    <option value="correios">📦 Correios</option>
                    <option value="motoboy">🏍️ Motoboy</option>
                  </select>
                </div>

                <div style={campoModalGrande}>
                  <label>Endereço de entrega</label>
                  <input value={pedido.delivery_address} onChange={(e) => atualizarPedido("delivery_address", e.target.value)} style={inputStyle} placeholder="Rua, número, bairro, cidade..." />
                </div>

                <div style={campoModalGrande}>
                  <label>Produto</label>
                  <input value={pedido.product_name} onChange={(e) => atualizarPedido("product_name", e.target.value)} style={inputStyle} placeholder="Ex: Planner Personalizado A5" />
                </div>

                <div style={campoModal}>
                  <label>Quantidade</label>
                  <input type="number" min="1" value={pedido.quantity} onChange={(e) => atualizarPedido("quantity", e.target.value)} style={inputStyle} />
                </div>

                <div style={campoModal}>
                  <label>Valor unitário</label>
                  <input type="number" step="0.01" value={pedido.unit_value} onChange={(e) => atualizarPedido("unit_value", e.target.value)} style={inputStyle} placeholder="64.90" />
                </div>

                <div style={campoModal}>
                  <label>Sinal recebido</label>
                  <input value={pedido.signal_value} onChange={(e) => atualizarPedido("signal_value", e.target.value)} style={inputStyle} placeholder="0" />
                </div>

                <div style={campoModal}>
                  <label>Total</label>
                  <input value={formatarPreco(pedido.total_value)} readOnly style={{ ...inputStyle, background: "#FFF8FB" }} />
                </div>

                <div style={campoModal}>
                  <label>Saldo a receber</label>
                  <input value={formatarPreco(pedido.remaining_value)} readOnly style={{ ...inputStyle, background: "#FFF8FB" }} />
                </div>

                <div style={campoModal}>
                  <label>Data para pagar restante</label>
                  <input type="date" value={pedido.payment_due_date} onChange={(e) => atualizarPedido("payment_due_date", e.target.value)} style={inputStyle} />
                </div>

                <div style={campoModal}>
                  <label>Pagamento</label>
                  <select value={pedido.payment_method} onChange={(e) => atualizarPedido("payment_method", e.target.value)} style={inputStyle}>
                    <option value="pix">Pix</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_credito">Cartão de crédito</option>
                    <option value="cartao_debito">Cartão de débito</option>
                    <option value="boleto">Boleto</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Status do pedido</label>
                  <select value={pedido.order_status} onChange={(e) => atualizarPedido("order_status", e.target.value)} style={inputStyle}>
                    <option value="aguardando_sinal">A confirmar</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="em_producao">Em produção</option>
                    <option value="pronto">Pronto</option>
                    <option value="entregue">Entregue</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Status do pagamento</label>
                  <select value={pedido.payment_status} onChange={(e) => atualizarPedido("payment_status", e.target.value)} style={inputStyle}>
                    <option value="nao_pago">Não recebido</option>
                    <option value="sinal_pago">Sinal pago</option>
                    <option value="pago_total">Pago</option>
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Prioridade</label>
                  <select value={pedido.priority} onChange={(e) => atualizarPedido("priority", e.target.value)} style={inputStyle}>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>

                <div style={campoModalGrande}>
                  <label>Observações visíveis</label>
                  <textarea value={pedido.notes} onChange={(e) => atualizarPedido("notes", e.target.value)} style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} placeholder="Detalhes, personalizações, cor, tamanho..." />
                </div>

                <div style={campoModalGrande}>
                  <label>Observações internas</label>
                  <textarea value={pedido.internal_notes} onChange={(e) => atualizarPedido("internal_notes", e.target.value)} style={{ ...inputStyle, minHeight: "80px", resize: "vertical", background: "#FFFBEB", borderColor: "#FDE68A" }} placeholder="Anotações de produção, lembretes internos..." />
                </div>
              </div>

              <div style={modalFooter}>
                <button type="button" onClick={fecharModalPedido} style={btnSecondary}>Cancelar</button>
                <button type="submit" disabled={salvando} style={btnPrimary}>
                  {salvando ? "Salvando..." : pedidoEditandoId ? "Atualizar pedido" : "Criar pedido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const pageContainer = {
  width: "100%",
};

const pageHeaderCompacto = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "26px",
  flexWrap: "wrap",
};

const pageTitleCompacto = {
  margin: 0,
  color: "#222",
  fontSize: "34px",
  fontWeight: 800,
  lineHeight: "1.1",
};

const pageDescriptionCompacta = {
  margin: "4px 0 0",
  color: "#666",
  fontSize: "14px",
};

const tabsLinha = {
  display: "flex",
  gap: "18px",
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: "0",
};

const tabBotao = {
  border: "none",
  background: "transparent",
  color: "#777",
  fontWeight: 700,
  padding: "12px 0",
  cursor: "pointer",
};

const tabAtiva = {
  ...tabBotao,
  color: "#ec1971",
  borderBottom: "2px solid #ec1971",
};

const contadorMini = {
  background: "#fff0f6",
  color: "#ec1971",
  padding: "2px 7px",
  borderRadius: "999px",
  fontSize: "12px",
  marginLeft: "4px",
};

const linhaSeparadora = {
  height: "1px",
  background: "#F3D7E5",
  marginBottom: "18px",
};

const inputBusca = {
  width: "100%",
  background: "#ffffff",
  border: "2px solid #F3D7E5",
  borderRadius: "12px",
  color: "#333333",
  padding: "12px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  marginBottom: "12px",
};

const filtrosLinha = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  margin: "10px 0 8px",
};

const filtrosLinhaSecundaria = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  margin: "0 0 18px",
};

const filtroBotao = {
  border: "1px solid #F3D7E5",
  background: "#ffffff",
  color: "#666",
  padding: "8px 14px",
  borderRadius: "999px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "13px",
};

const filtroAtivo = {
  ...filtroBotao,
  background: "#E0719C",
  color: "#ffffff",
  borderColor: "#E0719C",
};

const pedidosLista = {
  display: "grid",
  gap: "12px",
};

const pedidoCard = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "18px",
  padding: "18px 20px",
  boxShadow: "0 8px 24px rgba(236, 28, 104, 0.05)",
};

const pedidoTopo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
};

const clienteLinha = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const produtoLinha = {
  margin: "8px 0",
  color: "#666",
};

const linhaMeta = {
  margin: "4px 0",
  color: "#777",
  fontSize: "13px",
};

function corStatusPedidoGlobal(status) {
  const mapa = {
    novo: "#64748B",
    aguardando_sinal: "#F97316",
    confirmado: "#1976D2",
    em_producao: "#8E24AA",
    pronto: "#16A34A",
    entregue: "#10B981",
    cancelado: "#DC2626",
    arquivado: "#64748B",
  };

  return mapa[status] || "#64748B";
}

const statusBadge = (status) => ({
  background: "#DCFCE7",
  color: corStatusPedidoGlobal(status),
  borderRadius: "999px",
  padding: "4px 10px",
  fontSize: "12px",
  fontWeight: 800,
});

const menuBotao = {
  border: "none",
  background: "transparent",
  fontSize: "22px",
  cursor: "pointer",
  color: "#333",
};

const pedidoRodape = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "center",
  marginTop: "14px",
  flexWrap: "wrap",
};

const valorPedido = {
  display: "inline-block",
  color: "#111827",
  fontSize: "18px",
  marginRight: "10px",
};

const sinalBadge = {
  display: "inline-block",
  background: "#D1FAE5",
  color: "#059669",
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  marginRight: "6px",
};

const aReceberBadge = {
  display: "inline-block",
  background: "#FFF0F6",
  color: "#ec1971",
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
};

const emptyCard = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "18px",
  padding: "24px",
  color: "#666",
};

const acoesLinha = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const botaoBase = {
  border: "none",
  padding: "9px 12px",
  borderRadius: "11px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "13px",
};

const botaoWhatsapp = {
  ...botaoBase,
  background: "#25D366",
  color: "#ffffff",
};

const botaoEditar = {
  ...botaoBase,
  background: "#fff0f6",
  color: "#ec1971",
};

const botaoArquivar = {
  ...botaoBase,
  background: "#F1F5F9",
  color: "#475569",
};

const botaoExcluir = {
  ...botaoBase,
  background: "#fee2e2",
  color: "#b91c1c",
};

const btnPrimary = {
  background: "#E0719C",
  color: "#ffffff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: 800,
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
  width: "1000px",
  maxWidth: "95vw",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#ffffff",
  borderRadius: "32px",
  padding: "50px",
  boxShadow: "0 30px 80px rgba(0,0,0,.18)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "40px",
  paddingBottom: "32px",
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
  marginBottom: "22px",
};

const modalTitle = {
  margin: 0,
  fontSize: "42px",
  fontWeight: "800",
  color: "#111827",
  lineHeight: "1.1",
};

const modalSubtitle = {
  marginTop: "16px",
  marginBottom: 0,
  color: "#6B7280",
  fontSize: "17px",
  lineHeight: "1.7",
  maxWidth: "700px",
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
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "20px",
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

const modalFooter = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "30px",
  paddingTop: "24px",
  borderTop: "1px solid #F3D7E5",
  flexWrap: "wrap",
};