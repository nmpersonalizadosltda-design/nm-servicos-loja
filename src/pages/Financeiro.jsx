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

const movimentoInicial = {
  type: "entrada",
  value: "",
  description: "",
  method: "pix",
  status: "recebido",
  category: "vendas",
  date: new Date().toISOString().slice(0, 10),
  related_order: "",
  client_name: "",
};

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Financeiro() {
  const [pedidos, setPedidos] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [mesSelecionado, setMesSelecionado] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [anoSelecionado, setAnoSelecionado] = useState(String(new Date().getFullYear()));
  const [modalAberto, setModalAberto] = useState(false);
  const [movimento, setMovimento] = useState(movimentoInicial);
  const [movimentoEditandoId, setMovimentoEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    await Promise.all([carregarPedidos(), carregarMovimentos(), carregarClientes()]);
  }

  async function carregarPedidos() {
    const snapshot = await getDocs(collection(db, "orders"));
    const lista = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    lista.sort((a, b) => dataOrdenacao(b) - dataOrdenacao(a));
    setPedidos(lista);
  }

  async function carregarMovimentos() {
    const snapshot = await getDocs(collection(db, "payments"));
    const lista = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    lista.sort((a, b) => dataOrdenacao(b) - dataOrdenacao(a));
    setMovimentos(lista);
  }

  async function carregarClientes() {
    const snapshot = await getDocs(collection(db, "clients"));
    const lista = snapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    setClientes(lista);
  }

  function atualizarMovimento(campo, valor) {
    setMovimento((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function limparNumero(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function normalizarData(valor) {
    if (!valor) return null;

    try {
      if (valor?.toDate) return valor.toDate();

      if (typeof valor === "string" && valor.length === 10) {
        const data = new Date(`${valor}T00:00:00`);
        return Number.isNaN(data.getTime()) ? null : data;
      }

      const data = new Date(valor);
      return Number.isNaN(data.getTime()) ? null : data;
    } catch {
      return null;
    }
  }

  function dataOrdenacao(item) {
    return (
      normalizarData(item.date) ||
      normalizarData(item.created_at) ||
      normalizarData(item.delivery_date) ||
      new Date(0)
    );
  }

  function formatarData(valor) {
    const data = normalizarData(valor);
    if (!data) return "Sem data";
    return data.toLocaleDateString("pt-BR");
  }

  function obterValorPedido(pedido) {
    return Number(
      pedido.total_value ||
        pedido.total ||
        pedido.total_amount ||
        pedido.valor_total ||
        pedido.value ||
        0
    );
  }

  function valorRecebidoPedido(pedido) {
    if (pedido.order_status === "cancelado" || pedido.payment_status === "reembolsado") return 0;
    if (pedido.payment_status === "pago_total") return obterValorPedido(pedido);
    if (pedido.payment_status === "sinal_pago") return Number(pedido.signal_value || 0);
    return 0;
  }

  function valorAReceberPedido(pedido) {
    if (pedido.order_status === "cancelado" || pedido.payment_status === "reembolsado") return 0;
    return Math.max(obterValorPedido(pedido) - valorRecebidoPedido(pedido), 0);
  }

  function statusPagamentoTexto(status) {
    const mapa = {
      nao_pago: "Não recebido",
      sinal_pago: "Sinal pago",
      pago_total: "Pago total",
      reembolsado: "Reembolsado",
    };
    return mapa[status] || status || "Não informado";
  }

  function statusPedidoTexto(status) {
    const mapa = {
      orcamento: "Orçamento",
      aguardando_sinal: "Aguardando sinal",
      confirmado: "Confirmado",
      em_andamento: "Em andamento",
      em_producao: "Em produção",
      pronto: "Pronto",
      entregue: "Entregue",
      cancelado: "Cancelado",
    };
    return mapa[status] || status || "Não informado";
  }

  function metodoTexto(metodo) {
    const mapa = {
      pix: "Pix",
      dinheiro: "Dinheiro",
      cartao_credito: "Cartão de crédito",
      cartao_debito: "Cartão de débito",
      boleto: "Boleto",
      outro: "Outro",
    };
    return mapa[metodo] || metodo || "Não informado";
  }

  function itemNoPeriodo(item) {
    const data = normalizarData(item.date) || normalizarData(item.created_at) || normalizarData(item.delivery_date);
    if (!data) return false;

    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = String(data.getFullYear());

    return mes === mesSelecionado && ano === anoSelecionado;
  }

  function statusCobranca(mov) {
    if (mov.status === "recebido" || mov.status === "pago") {
      return {
        label: "Recebido",
        bg: "#dcfce7",
        color: "#15803d",
        icon: "✅",
      };
    }

    const dataVencimento = normalizarData(mov.due_date || mov.date);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (!dataVencimento) {
      return {
        label: "A receber",
        bg: "#fff7ed",
        color: "#c2410c",
        icon: "🟡",
      };
    }

    dataVencimento.setHours(0, 0, 0, 0);

    if (dataVencimento < hoje) {
      return {
        label: "Em atraso",
        bg: "#fee2e2",
        color: "#b91c1c",
        icon: "🚨",
      };
    }

    if (dataVencimento.getTime() === hoje.getTime()) {
      return {
        label: "Vence hoje",
        bg: "#fef3c7",
        color: "#92400e",
        icon: "⏰",
      };
    }

    return {
      label: "A receber",
      bg: "#e0f2fe",
      color: "#0369a1",
      icon: "🟡",
    };
  }

  const pedidosValidos = useMemo(
    () => pedidos.filter((item) => item.order_status !== "cancelado" && item.payment_status !== "reembolsado"),
    [pedidos]
  );

  const pedidosDoPeriodo = useMemo(
    () => pedidosValidos.filter((pedido) => itemNoPeriodo(pedido)),
    [pedidosValidos, mesSelecionado, anoSelecionado]
  );

  const movimentosDoPeriodo = useMemo(
    () => movimentos.filter((mov) => itemNoPeriodo(mov)),
    [movimentos, mesSelecionado, anoSelecionado]
  );

  const cobrancasPendentes = useMemo(
    () =>
      movimentosDoPeriodo.filter(
        (mov) =>
          (mov.type === "a_receber" || mov.status === "a_receber") &&
          mov.status !== "recebido" &&
          mov.status !== "pago"
      ),
    [movimentosDoPeriodo]
  );

  const cobrancasRecebidas = useMemo(
    () =>
      movimentosDoPeriodo.filter(
        (mov) =>
          (mov.type === "a_receber" || mov.related_order) &&
          (mov.status === "recebido" || mov.status === "pago")
      ),
    [movimentosDoPeriodo]
  );

  const cobrancasAtrasadas = useMemo(
    () => cobrancasPendentes.filter((mov) => statusCobranca(mov).label === "Em atraso"),
    [cobrancasPendentes]
  );

  const cobrancasHoje = useMemo(
    () => cobrancasPendentes.filter((mov) => statusCobranca(mov).label === "Vence hoje"),
    [cobrancasPendentes]
  );

  const totalCobrancasPendentes = cobrancasPendentes.reduce(
    (total, mov) => total + Number(mov.value || mov.remaining_value || 0),
    0
  );

  const totalCobrancasRecebidas = cobrancasRecebidas.reduce(
    (total, mov) => total + Number(mov.value || 0),
    0
  );

  const totalVendido = pedidosDoPeriodo.reduce((total, pedido) => total + obterValorPedido(pedido), 0);
  const totalRecebidoPedidos = pedidosDoPeriodo.reduce((total, pedido) => total + valorRecebidoPedido(pedido), 0);
  const totalAReceberPedidos = pedidosDoPeriodo.reduce((total, pedido) => total + valorAReceberPedido(pedido), 0);

  const entradasManuais = movimentosDoPeriodo
    .filter((mov) => mov.type === "entrada")
    .reduce((total, mov) => total + Number(mov.value || 0), 0);

  const saidasManuais = movimentosDoPeriodo
    .filter((mov) => mov.type === "saida")
    .reduce((total, mov) => total + Number(mov.value || 0), 0);

  const totalRecebido = totalRecebidoPedidos + entradasManuais;
  const totalAReceber = Math.max(totalAReceberPedidos + totalCobrancasPendentes - totalCobrancasRecebidas, 0);
  const saldoCaixa = totalRecebido - saidasManuais;

  const pedidosPendentes = pedidosDoPeriodo.filter((pedido) => valorAReceberPedido(pedido) > 0);
  const pedidosPagos = pedidosDoPeriodo.filter((pedido) => pedido.payment_status === "pago_total");
  const pedidosComSinal = pedidosDoPeriodo.filter((pedido) => pedido.payment_status === "sinal_pago");
  const pedidosNaoPagos = pedidosDoPeriodo.filter((pedido) => pedido.payment_status === "nao_pago");

  const clientesInadimplentes = useMemo(() => {
    const agrupados = {};

    pedidosPendentes.forEach((pedido) => {
      const chave = limparNumero(pedido.client_whatsapp) || String(pedido.client_name || "Cliente sem nome").toLowerCase();

      if (!agrupados[chave]) {
        agrupados[chave] = {
          client_name: pedido.client_name || "Cliente sem nome",
          client_whatsapp: pedido.client_whatsapp || "",
          total_pendente: 0,
          pedidos: 0,
        };
      }

      agrupados[chave].total_pendente += valorAReceberPedido(pedido);
      agrupados[chave].pedidos += 1;
    });

    cobrancasPendentes.forEach((mov) => {
      const chave = limparNumero(mov.client_whatsapp) || String(mov.client_name || "Cliente sem nome").toLowerCase();

      if (!agrupados[chave]) {
        agrupados[chave] = {
          client_name: mov.client_name || "Cliente sem nome",
          client_whatsapp: mov.client_whatsapp || "",
          total_pendente: 0,
          pedidos: 0,
        };
      }

      agrupados[chave].total_pendente += Number(mov.value || 0);
      agrupados[chave].pedidos += 1;
    });

    return Object.values(agrupados).sort((a, b) => b.total_pendente - a.total_pendente);
  }, [pedidosPendentes, cobrancasPendentes]);

  const fluxoMensal = useMemo(() => {
    return Array.from({ length: 12 }, (_, indice) => {
      const mes = String(indice + 1).padStart(2, "0");

      const pedidosMes = pedidosValidos.filter((pedido) => {
        const data = normalizarData(pedido.created_at) || normalizarData(pedido.delivery_date);
        return data && String(data.getMonth() + 1).padStart(2, "0") === mes && String(data.getFullYear()) === anoSelecionado;
      });

      const movimentosMes = movimentos.filter((mov) => {
        const data = normalizarData(mov.date) || normalizarData(mov.created_at);
        return data && String(data.getMonth() + 1).padStart(2, "0") === mes && String(data.getFullYear()) === anoSelecionado;
      });

      const recebidoPedido = pedidosMes.reduce((total, pedido) => total + valorRecebidoPedido(pedido), 0);
      const entradas = movimentosMes.filter((mov) => mov.type === "entrada").reduce((total, mov) => total + Number(mov.value || 0), 0);
      const saidas = movimentosMes.filter((mov) => mov.type === "saida").reduce((total, mov) => total + Number(mov.value || 0), 0);

      return {
        mes,
        label: meses[indice].slice(0, 3),
        recebido: recebidoPedido + entradas,
        saidas,
        saldo: recebidoPedido + entradas - saidas,
      };
    });
  }, [pedidosValidos, movimentos, anoSelecionado]);

  const maiorValorGrafico = Math.max(
    ...fluxoMensal.flatMap((item) => [item.recebido, item.saidas, item.saldo > 0 ? item.saldo : 0]),
    1
  );

  const movimentosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return movimentosDoPeriodo.filter((mov) => {
      let tipoOk = false;

      if (filtroTipo === "todos") tipoOk = true;
      if (filtroTipo === "entrada") tipoOk = mov.type === "entrada";
      if (filtroTipo === "saida") tipoOk = mov.type === "saida";
      if (filtroTipo === "cobrancas") tipoOk = mov.type === "a_receber" || mov.status === "a_receber" || mov.related_order;

      if (!tipoOk) return false;
      if (!termo) return true;

      return (
        String(mov.description || "").toLowerCase().includes(termo) ||
        String(mov.client_name || "").toLowerCase().includes(termo) ||
        String(mov.category || "").toLowerCase().includes(termo) ||
        String(mov.method || "").toLowerCase().includes(termo) ||
        String(mov.product_name || "").toLowerCase().includes(termo)
      );
    });
  }, [movimentosDoPeriodo, busca, filtroTipo]);

  function abrirModalNovoMovimento(tipo = "entrada") {
    setMovimentoEditandoId(null);
    setMovimento({ ...movimentoInicial, type: tipo, status: tipo === "entrada" ? "recebido" : "pago" });
    setModalAberto(true);
  }

  function editarMovimento(movimentoSelecionado) {
    const data = normalizarData(movimentoSelecionado.date) || normalizarData(movimentoSelecionado.created_at);

    setMovimentoEditandoId(movimentoSelecionado.id);
    setMovimento({
      type: movimentoSelecionado.type || "entrada",
      value: movimentoSelecionado.value || "",
      description: movimentoSelecionado.description || "",
      method: movimentoSelecionado.method || "pix",
      status: movimentoSelecionado.status || "recebido",
      category: movimentoSelecionado.category || "vendas",
      date: data ? data.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      related_order: movimentoSelecionado.related_order || "",
      client_name: movimentoSelecionado.client_name || "",
    });

    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setMovimentoEditandoId(null);
    setMovimento({ ...movimentoInicial });
  }

  async function salvarMovimento(e) {
    e.preventDefault();

    if (!movimento.description.trim()) {
      alert("Informe a descrição da movimentação.");
      return;
    }

    if (!movimento.value || Number(String(movimento.value).replace(",", ".")) <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    setSalvando(true);

    try {
      const dados = {
        ...movimento,
        value: Number(String(movimento.value).replace(",", ".")),
        updated_at: new Date(),
      };

      if (movimentoEditandoId) {
        await updateDoc(doc(db, "payments", movimentoEditandoId), dados);
        alert("Movimentação atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "payments"), {
          ...dados,
          created_at: new Date(),
        });
        alert("Movimentação cadastrada com sucesso!");
      }

      fecharModal();
      carregarDados();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao salvar movimentação.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirMovimento(id) {
    const confirmar = confirm("Excluir esta movimentação financeira?");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "payments", id));
      alert("Movimentação excluída com sucesso!");
      carregarDados();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao excluir movimentação.");
    }
  }

  async function marcarCobrancaRecebida(mov) {
    const confirmar = confirm(`Marcar como recebido?\n\n${mov.description}\nValor: ${formatarPreco(mov.value)}`);

    if (!confirmar) return;

    try {
      await updateDoc(doc(db, "payments", mov.id), {
        status: "recebido",
        paid_at: new Date(),
        updated_at: new Date(),
      });

      if (mov.related_order) {
        await updateDoc(doc(db, "orders", mov.related_order), {
          payment_status: "pago_total",
          financial_status: "recebido",
          remaining_value: 0,
          updated_at: new Date(),
        });
      }

      alert("Cobrança marcada como recebida!");
      carregarDados();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao marcar cobrança como recebida.");
    }
  }

  function cobrarMovimentoWhatsApp(mov) {
    const telefone = limparNumero(mov.client_whatsapp);

    if (!telefone) {
      alert("Esta cobrança não tem WhatsApp cadastrado.");
      return;
    }

    const mensagem = `Olá, ${mov.client_name || "tudo bem"}? 😊

Passando para lembrar do saldo referente ao seu pedido na NM Serviços.

Produto: ${mov.product_name || "Produto personalizado"}
Valor pendente: ${formatarPreco(mov.value)}

Caso já tenha realizado o pagamento, pode desconsiderar esta mensagem.

Obrigada 💕
NM Serviços`;

    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  function cobrarWhatsApp(pedido) {
    const telefone = limparNumero(pedido.client_whatsapp);

    if (!telefone) {
      alert("Este pedido não tem WhatsApp cadastrado.");
      return;
    }

    const mensagem = `Olá, ${pedido.client_name}! Tudo bem?

Passando para lembrar do saldo do seu pedido na NM Serviços.

Produto: ${pedido.product_name}
Total: ${formatarPreco(obterValorPedido(pedido))}
Recebido: ${formatarPreco(valorRecebidoPedido(pedido))}
Saldo: ${formatarPreco(valorAReceberPedido(pedido))}

Qualquer dúvida, estou à disposição.`;

    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  function exportarRelatorioCSV() {
    const linhas = [
      ["Relatório financeiro NM Serviços"],
      [`Período: ${meses[Number(mesSelecionado) - 1]}/${anoSelecionado}`],
      [],
      ["Indicador", "Valor"],
      ["Total vendido", totalVendido],
      ["Total recebido", totalRecebido],
      ["Total a receber", totalAReceber],
      ["Saídas", saidasManuais],
      ["Saldo em caixa", saldoCaixa],
      ["Cobranças pendentes", cobrancasPendentes.length],
      ["Cobranças atrasadas", cobrancasAtrasadas.length],
      [],
      ["Movimentações"],
      ["Data", "Tipo", "Status", "Descrição", "Categoria", "Cliente", "Método", "Valor"],
      ...movimentosFiltrados.map((mov) => [
        formatarData(mov.date || mov.created_at),
        mov.type,
        mov.status,
        mov.description || "",
        mov.category || "",
        mov.client_name || "",
        metodoTexto(mov.method),
        Number(mov.value || 0),
      ]),
    ];

    const csv = linhas
      .map((linha) => linha.map((celula) => `"${String(celula).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-financeiro-${anoSelecionado}-${mesSelecionado}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function imprimirRelatorio() {
    window.print();
  }

  return (
    <div style={pageContainer}>
      <div style={pageHeaderCompacto}>
        <div>
          <h1 style={pageTitle}>Financeiro</h1>
          <p style={pageDescription}>Cobranças, recebimentos, pendências e aquele dinheiro que ainda não voltou para casa.</p>
        </div>

        <div style={acoesTopo}>
          <button type="button" onClick={exportarRelatorioCSV} style={btnSecondary}>📄 Exportar CSV</button>
          <button type="button" onClick={imprimirRelatorio} style={btnSecondary}>🖨️ Relatório</button>
          <button type="button" onClick={() => abrirModalNovoMovimento("entrada")} style={btnPrimary}>+ Entrada</button>
          <button type="button" onClick={() => abrirModalNovoMovimento("saida")} style={btnDanger}>− Saída</button>
        </div>
      </div>

      <div style={periodoCard}>
        <button type="button" onClick={() => {
          const hoje = new Date();
          setMesSelecionado(String(hoje.getMonth() + 1).padStart(2, "0"));
          setAnoSelecionado(String(hoje.getFullYear()));
        }} style={pillButton}>Hoje</button>

        <select value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)} style={selectCompacto}>
          {meses.map((mes, index) => (
            <option key={mes} value={String(index + 1).padStart(2, "0")}>{mes}</option>
          ))}
        </select>

        <input value={anoSelecionado} onChange={(e) => setAnoSelecionado(e.target.value)} style={anoInput} />

        <button type="button" onClick={carregarDados} style={pillButton}>↻ Atualizar</button>
      </div>

      <div style={heroFinanceiro}>
        <div>
          <span style={heroLabel}>{meses[Number(mesSelecionado) - 1]}/{anoSelecionado}</span>
          <h2 style={heroTitle}>{formatarPreco(saldoCaixa)}</h2>
          <p style={heroText}>Saldo estimado em caixa: recebidos reais menos saídas registradas.</p>
        </div>

        <div style={heroMiniGrid}>
          <div style={heroMiniCard}>
            <small>Vendido</small>
            <strong>{formatarPreco(totalVendido)}</strong>
          </div>
          <div style={heroMiniCard}>
            <small>Recebido</small>
            <strong>{formatarPreco(totalRecebido)}</strong>
          </div>
          <div style={heroMiniCard}>
            <small>Saídas</small>
            <strong>{formatarPreco(saidasManuais)}</strong>
          </div>
          <div style={heroMiniCard}>
            <small>A receber</small>
            <strong>{formatarPreco(totalAReceber)}</strong>
          </div>
        </div>
      </div>

      <div style={metricasGrid}>
        <div style={metricCard}>
          <span>📈</span>
          <strong>{formatarPreco(totalRecebido)}</strong>
          <small>Total recebido</small>
        </div>

        <div style={metricCard}>
          <span>💳</span>
          <strong>{formatarPreco(totalAReceber)}</strong>
          <small>Total a receber</small>
        </div>

        <div style={metricCardAlert}>
          <span>⏰</span>
          <strong>{cobrancasHoje.length}</strong>
          <small>Vencem hoje</small>
        </div>

        <div style={metricCardDanger}>
          <span>🚨</span>
          <strong>{cobrancasAtrasadas.length}</strong>
          <small>Em atraso</small>
        </div>
      </div>

      <div style={gridDuasColunas}>
        <div style={cardBase}>
          <div style={cardHeaderLinha}>
            <div>
              <span style={tagPequena}>COBRANÇA</span>
              <h2 style={cardTitle}>Cobranças inteligentes</h2>
            </div>
          </div>

          {cobrancasPendentes.length === 0 ? (
            <div style={emptyState}>✨ Nenhuma cobrança pendente no período.</div>
          ) : (
            cobrancasPendentes.slice(0, 8).map((mov) => {
              const status = statusCobranca(mov);

              return (
                <div key={mov.id} style={cobrancaCard}>
                  <div>
                    <span style={{ ...badgeStatus, background: status.bg, color: status.color }}>
                      {status.icon} {status.label}
                    </span>

                    <strong style={cobrancaTitulo}>{mov.client_name || "Cliente sem nome"}</strong>
                    <p>{mov.product_name || mov.description}</p>
                    <small>Vencimento: {formatarData(mov.due_date || mov.date)}</small>
                  </div>

                  <div style={cobrancaAcoes}>
                    <strong style={{ color: "#ec1971" }}>{formatarPreco(mov.value)}</strong>
                    <button type="button" onClick={() => cobrarMovimentoWhatsApp(mov)} style={btnWhatsApp}>Cobrar</button>
                    <button type="button" onClick={() => marcarCobrancaRecebida(mov)} style={btnRecebido}>Recebido</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={cardBase}>
          <div style={cardHeaderLinha}>
            <div>
              <span style={tagPequena}>FLUXO</span>
              <h2 style={cardTitle}>Fluxo de caixa mensal</h2>
            </div>
          </div>

          <div style={graficoBox}>
            {fluxoMensal.map((item) => (
              <div key={item.mes} style={graficoColunaWrap}>
                <div style={graficoBarras}>
                  <div title={`Recebido: ${formatarPreco(item.recebido)}`} style={{ ...barraRecebido, height: `${Math.max((item.recebido / maiorValorGrafico) * 140, item.recebido ? 8 : 0)}px` }} />
                  <div title={`Saídas: ${formatarPreco(item.saidas)}`} style={{ ...barraSaida, height: `${Math.max((item.saidas / maiorValorGrafico) * 140, item.saidas ? 8 : 0)}px` }} />
                </div>
                <span style={graficoLabel}>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={legendaGrafico}>
            <span><i style={bolinhaVerde} /> Recebido</span>
            <span><i style={bolinhaVermelha} /> Saídas</span>
          </div>
        </div>
      </div>

      <div style={gridDuasColunas}>
        <div style={cardBase}>
          <div style={cardHeaderLinha}>
            <div>
              <span style={tagPequena}>ATENÇÃO</span>
              <h2 style={cardTitle}>Clientes inadimplentes</h2>
            </div>
          </div>

          {clientesInadimplentes.length === 0 ? (
            <div style={emptyState}>✨ Nenhum cliente com saldo pendente no período.</div>
          ) : (
            clientesInadimplentes.slice(0, 6).map((cliente) => (
              <div key={`${cliente.client_name}-${cliente.client_whatsapp}`} style={linhaFinanceira}>
                <div>
                  <strong>{cliente.client_name}</strong>
                  <p>{cliente.pedidos} pendência(s)</p>
                </div>
                <strong style={{ color: "#ec1971" }}>{formatarPreco(cliente.total_pendente)}</strong>
              </div>
            ))
          )}
        </div>

        <div style={cardBase}>
          <div style={cardHeaderLinha}>
            <div>
              <span style={tagPequena}>MOVIMENTO</span>
              <h2 style={cardTitle}>Resumo de pedidos</h2>
            </div>
          </div>

          <div style={statusGrid}>
            <div style={statusCard}><strong>{pedidosPagos.length}</strong><span>Pagos total</span></div>
            <div style={statusCard}><strong>{pedidosComSinal.length}</strong><span>Com sinal</span></div>
            <div style={statusCard}><strong>{pedidosNaoPagos.length}</strong><span>Não pagos</span></div>
            <div style={statusCard}><strong>{clientes.length}</strong><span>Clientes</span></div>
          </div>
        </div>
      </div>

      <div style={cardBase}>
        <div style={cardHeaderLinha}>
          <div>
            <span style={tagPequena}>LANÇAMENTOS</span>
            <h2 style={cardTitle}>Movimentações financeiras</h2>
          </div>
        </div>

        <div style={filtrosLinha}>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por descrição, cliente, categoria ou forma..." style={inputStyle} />
          <button type="button" onClick={() => setFiltroTipo("todos")} style={filtroTipo === "todos" ? filtroAtivo : filtroBotao}>Todos</button>
          <button type="button" onClick={() => setFiltroTipo("entrada")} style={filtroTipo === "entrada" ? filtroAtivo : filtroBotao}>Entradas</button>
          <button type="button" onClick={() => setFiltroTipo("saida")} style={filtroTipo === "saida" ? filtroAtivo : filtroBotao}>Saídas</button>
          <button type="button" onClick={() => setFiltroTipo("cobrancas")} style={filtroTipo === "cobrancas" ? filtroAtivo : filtroBotao}>Cobranças</button>
        </div>

        {movimentosFiltrados.length === 0 ? (
          <div style={emptyState}>Nenhuma movimentação no período selecionado.</div>
        ) : (
          movimentosFiltrados.map((mov) => {
            const cobranca = mov.type === "a_receber" || mov.status === "a_receber" || mov.related_order;
            const status = statusCobranca(mov);

            return (
              <div key={mov.id} style={movimentoLinha}>
                <div>
                  {cobranca && (
                    <span style={{ ...badgeStatus, background: status.bg, color: status.color }}>
                      {status.icon} {status.label}
                    </span>
                  )}

                  <strong>{mov.description}</strong>
                  <p>{formatarData(mov.date || mov.created_at)} • {mov.category || "Sem categoria"} • {metodoTexto(mov.method)}</p>
                </div>

                <div style={movimentoAcoes}>
                  <strong style={{ color: mov.type === "saida" ? "#dc2626" : "#16a34a" }}>
                    {mov.type === "saida" ? "−" : "+"} {formatarPreco(mov.value)}
                  </strong>

                  {cobranca && mov.status !== "recebido" && (
                    <>
                      <button type="button" onClick={() => cobrarMovimentoWhatsApp(mov)} style={btnWhatsApp}>Cobrar</button>
                      <button type="button" onClick={() => marcarCobrancaRecebida(mov)} style={btnRecebido}>Recebido</button>
                    </>
                  )}

                  <button type="button" onClick={() => editarMovimento(mov)} style={btnMini}>Editar</button>
                  <button type="button" onClick={() => excluirMovimento(mov.id)} style={btnMiniDanger}>Excluir</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {modalAberto && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={modalHeader}>
              <div>
                <div style={modalTag}>{movimento.type === "saida" ? "📉 SAÍDA" : "📈 ENTRADA"}</div>
                <h2 style={modalTitle}>{movimentoEditandoId ? "Editar movimentação" : "Nova movimentação"}</h2>
                <p style={modalSubtitle}>Registre entradas e saídas manuais sem depender da boa vontade da memória humana.</p>
              </div>

              <button type="button" onClick={fecharModal} style={modalClose}>✕</button>
            </div>

            <form onSubmit={salvarMovimento}>
              <div style={modalBody}>
                <div style={campoModal}>
                  <label>Tipo</label>
                  <select value={movimento.type} onChange={(e) => atualizarMovimento("type", e.target.value)} style={inputStyle}>
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Valor</label>
                  <input value={movimento.value} onChange={(e) => atualizarMovimento("value", e.target.value)} style={inputStyle} placeholder="Ex: 120.00" />
                </div>

                <div style={campoModalGrande}>
                  <label>Descrição</label>
                  <input value={movimento.description} onChange={(e) => atualizarMovimento("description", e.target.value)} style={inputStyle} placeholder="Ex: Compra de papel, entrada extra, taxa..." />
                </div>

                <div style={campoModal}>
                  <label>Categoria</label>
                  <select value={movimento.category} onChange={(e) => atualizarMovimento("category", e.target.value)} style={inputStyle}>
                    <option value="vendas">Vendas</option>
                    <option value="materiais">Materiais</option>
                    <option value="embalagem">Embalagem</option>
                    <option value="frete">Frete</option>
                    <option value="marketing">Marketing</option>
                    <option value="taxas">Taxas</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Forma</label>
                  <select value={movimento.method} onChange={(e) => atualizarMovimento("method", e.target.value)} style={inputStyle}>
                    <option value="pix">Pix</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_credito">Cartão de crédito</option>
                    <option value="cartao_debito">Cartão de débito</option>
                    <option value="boleto">Boleto</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div style={campoModal}>
                  <label>Data</label>
                  <input type="date" value={movimento.date} onChange={(e) => atualizarMovimento("date", e.target.value)} style={inputStyle} />
                </div>

                <div style={campoModal}>
                  <label>Cliente</label>
                  <select value={movimento.client_name} onChange={(e) => atualizarMovimento("client_name", e.target.value)} style={inputStyle}>
                    <option value="">Sem cliente vinculado</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.name}>{cliente.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={modalFooter}>
                <button type="button" onClick={fecharModal} style={btnSecondary}>Cancelar</button>
                <button type="submit" disabled={salvando} style={btnPrimary}>{salvando ? "Salvando..." : "Salvar movimentação"}</button>
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

const pageTitle = { margin: 0, fontSize: "36px", fontWeight: "800", color: "#222" };
const pageDescription = { margin: "6px 0 0", color: "#666", fontSize: "15px" };

const acoesTopo = { display: "flex", gap: "10px", flexWrap: "wrap" };

const periodoCard = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const pillButton = {
  border: "1px solid #F3D7E5",
  background: "#ffffff",
  color: "#444",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: 700,
  cursor: "pointer",
};

const selectCompacto = { ...pillButton, minWidth: "160px" };
const anoInput = { ...pillButton, width: "90px" };

const heroFinanceiro = {
  background: "linear-gradient(135deg, #d85b92, #b985d6)",
  color: "#ffffff",
  borderRadius: "28px",
  padding: "28px",
  display: "grid",
  gridTemplateColumns: "1fr minmax(260px, 520px)",
  gap: "24px",
  marginBottom: "20px",
  boxShadow: "0 20px 50px rgba(236,28,104,.16)",
};

const heroLabel = { fontSize: "13px", fontWeight: 800, textTransform: "uppercase" };
const heroTitle = { margin: "10px 0", fontSize: "42px", lineHeight: 1 };
const heroText = { margin: 0, opacity: 0.9 };

const heroMiniGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const heroMiniCard = {
  border: "1px solid rgba(255,255,255,.35)",
  background: "rgba(255,255,255,.14)",
  borderRadius: "18px",
  padding: "16px",
  display: "grid",
  gap: "6px",
};

const metricasGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const metricCard = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "22px",
  padding: "20px",
  boxShadow: "0 12px 35px rgba(236, 28, 104, 0.07)",
  display: "grid",
  gap: "6px",
};

const metricCardAlert = { ...metricCard, background: "#fffaf0", border: "1px solid #FAD489" };
const metricCardDanger = { ...metricCard, background: "#fff5f5", border: "1px solid #fecaca" };

const gridDuasColunas = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "18px",
  marginBottom: "18px",
};

const cardBase = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 15px 40px rgba(236, 28, 104, 0.08)",
};

const cardHeaderLinha = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "18px",
};

const tagPequena = {
  color: "#ec1971",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: ".08em",
};

const cardTitle = { margin: "4px 0 0", color: "#222" };

const cobrancaCard = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #F3D7E5",
  background: "#FFF8FB",
  marginBottom: "10px",
};

const cobrancaTitulo = {
  display: "block",
  marginTop: "8px",
};

const cobrancaAcoes = {
  display: "grid",
  gap: "8px",
  justifyItems: "end",
};

const badgeStatus = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "11px",
  fontWeight: "900",
  marginBottom: "6px",
};

const graficoBox = {
  height: "190px",
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: "10px",
  borderBottom: "1px solid #F3D7E5",
  paddingTop: "18px",
};

const graficoColunaWrap = { flex: 1, display: "grid", gap: "8px", justifyItems: "center" };
const graficoBarras = { height: "150px", display: "flex", alignItems: "end", gap: "4px" };

const barraRecebido = {
  width: "10px",
  borderRadius: "10px 10px 0 0",
  background: "#16A34A",
};

const barraSaida = {
  width: "10px",
  borderRadius: "10px 10px 0 0",
  background: "#DC2626",
};

const graficoLabel = { fontSize: "12px", color: "#777" };
const legendaGrafico = { display: "flex", gap: "18px", marginTop: "16px", color: "#666", fontSize: "13px" };

const bolinhaVerde = {
  display: "inline-block",
  width: "10px",
  height: "10px",
  background: "#16A34A",
  borderRadius: "50%",
  marginRight: "6px",
};

const bolinhaVermelha = { ...bolinhaVerde, background: "#DC2626" };

const linhaFinanceira = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "14px 0",
  borderBottom: "1px solid #F3D7E5",
};

const statusGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const statusCard = {
  background: "#FFF8FB",
  border: "1px solid #F3D7E5",
  borderRadius: "18px",
  padding: "18px",
  display: "grid",
  gap: "6px",
};

const filtrosLinha = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
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

const filtroBotao = {
  border: "1px solid #F3D7E5",
  background: "#ffffff",
  color: "#ec1971",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: 700,
  cursor: "pointer",
};

const filtroAtivo = { ...filtroBotao, background: "#ec1971", color: "#ffffff" };

const movimentoLinha = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "16px 0",
  borderBottom: "1px solid #F3D7E5",
};

const movimentoAcoes = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const emptyState = {
  background: "#FFF8FB",
  border: "1px dashed #F3D7E5",
  color: "#8B5C70",
  borderRadius: "18px",
  padding: "28px",
  textAlign: "center",
};

const btnPrimary = {
  background: "#ec1971",
  color: "#ffffff",
  border: "none",
  padding: "12px 18px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: 800,
};

const btnDanger = { ...btnPrimary, background: "#EF4444" };

const btnSecondary = {
  background: "#ffffff",
  color: "#333333",
  border: "1px solid #F3D7E5",
  padding: "12px 18px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: 700,
};

const btnWhatsApp = {
  background: "#25D366",
  color: "#ffffff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: 800,
};

const btnRecebido = {
  background: "#16A34A",
  color: "#ffffff",
  border: "none",
  padding: "8px 12px",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: 800,
};

const btnMini = {
  border: "1px solid #F3D7E5",
  background: "#fff0f6",
  color: "#ec1971",
  borderRadius: "999px",
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 700,
};

const btnMiniDanger = {
  ...btnMini,
  background: "#FEE2E2",
  color: "#B91C1C",
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
  width: "860px",
  maxWidth: "95vw",
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#ffffff",
  borderRadius: "32px",
  padding: "42px",
  boxShadow: "0 30px 80px rgba(0,0,0,.18)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "32px",
  paddingBottom: "26px",
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
  fontSize: "40px",
  fontWeight: "800",
  color: "#111827",
  lineHeight: "1.1",
};

const modalSubtitle = {
  marginTop: "14px",
  marginBottom: 0,
  color: "#6B7280",
  fontSize: "16px",
  lineHeight: "1.7",
  maxWidth: "640px",
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
  ...campoModal,
  gridColumn: "1 / -1",
};

const modalFooter = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "28px",
  paddingTop: "22px",
  borderTop: "1px solid #F3D7E5",
  flexWrap: "wrap",
};