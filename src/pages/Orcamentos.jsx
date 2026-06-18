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

const FORM_INICIAL = {
  modoCliente: "existente",
  clienteId: "",
  clienteBusca: "",
  novoNome: "",
  novoWhatsapp: "",
  novoEmail: "",
  novoInstagram: "",
  novoEndereco: "",
  novoObservacoes: "",

  modoProduto: "cadastrado",
  produtoId: "",
  produtoBusca: "",
  variacaoNome: "",
  nomeManual: "",
  descricao: "",

  quantidade: 1,
  valorUnitario: 0,
  desconto: 0,
  frete: 0,
  prazo: "A combinar",
  status: STATUS.novo,
  observacoes: "",
};

export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [convertendoId, setConvertendoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    await Promise.all([carregarOrcamentos(), carregarClientes(), carregarProdutos()]);
  }

  async function carregarOrcamentos() {
    try {
      setCarregando(true);
      const q = query(collection(db, "quotes"), orderBy("created_at", "desc"));
      const snap = await getDocs(q);
      setOrcamentos(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (erro) {
      console.error("Erro ao carregar orçamentos:", erro);
    } finally {
      setCarregando(false);
    }
  }

  async function carregarClientes() {
    try {
      const snap = await getDocs(collection(db, "clients"));
      setClientes(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (erro) {
      console.error("Erro ao carregar clientes:", erro);
    }
  }

  async function carregarProdutos() {
    try {
      const snap = await getDocs(collection(db, "products"));
      const lista = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      setProdutos(lista.filter((item) => item.available !== false));
    } catch (erro) {
      console.error("Erro ao carregar produtos:", erro);
    }
  }

  function atualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function abrirModal() {
    setForm(FORM_INICIAL);
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) return;
    setModalAberto(false);
    setForm(FORM_INICIAL);
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
      if (data?.toDate) return data.toDate().toLocaleDateString("pt-BR");
      return new Date(data).toLocaleDateString("pt-BR");
    } catch {
      return "Sem data";
    }
  }

  function limparNumero(valor) {
    return String(valor || "").replace(/\D/g, "");
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

  function variacoesProduto(produto) {
    if (!produto || !Array.isArray(produto.variations)) return [];

    return produto.variations
      .map((variacao, index) => {
        const nome =
          variacao.name ||
          variacao.option ||
          variacao.label ||
          variacao.title ||
          `Opção ${index + 1}`;

        return {
          id: `${nome}-${index}`,
          name: String(nome).trim(),
          price: Number(variacao.price || variacao.value || produto.price || 0),
          note: variacao.note || variacao.observation || variacao.description || "",
        };
      })
      .filter((variacao) => variacao.name);
  }

  function produtoTemVariacoes(produto) {
    return Boolean(produto?.has_variations) && variacoesProduto(produto).length > 0;
  }

  function etiquetaVariacao(produto) {
    return produto?.variation_label || produto?.variation_name || "Opção";
  }

  function clienteSelecionado() {
    return clientes.find((cliente) => cliente.id === form.clienteId) || null;
  }

  function produtoSelecionado() {
    return produtos.find((produto) => produto.id === form.produtoId) || null;
  }

  function variacaoSelecionada() {
    const produto = produtoSelecionado();
    if (!produto) return null;
    return variacoesProduto(produto).find((item) => item.name === form.variacaoNome) || null;
  }

  function selecionarProduto(produtoId) {
    const produto = produtos.find((item) => item.id === produtoId);
    const primeiraVariacao = variacoesProduto(produto)[0] || null;
    const valor = Number(primeiraVariacao?.price || produto?.price || 0);

    setForm((prev) => ({
      ...prev,
      produtoId,
      variacaoNome: primeiraVariacao?.name || "",
      nomeManual: "",
      descricao:
        produto?.full_description ||
        produto?.description ||
        produto?.short_description ||
        prev.descricao,
      valorUnitario: valor,
      prazo: produto?.production_time || prev.prazo || "A combinar",
    }));
  }

  function selecionarVariacao(nome) {
    const produto = produtoSelecionado();
    const variacao = variacoesProduto(produto).find((item) => item.name === nome);

    setForm((prev) => ({
      ...prev,
      variacaoNome: nome,
      valorUnitario: Number(variacao?.price || produto?.price || prev.valorUnitario || 0),
    }));
  }

  const clientesFiltrados = useMemo(() => {
    const termo = form.clienteBusca.toLowerCase().trim();
    return clientes
      .filter((cliente) => {
        if (!termo) return true;
        return (
          String(cliente.name || "").toLowerCase().includes(termo) ||
          String(cliente.whatsapp || "").toLowerCase().includes(termo) ||
          String(cliente.instagram || "").toLowerCase().includes(termo) ||
          String(cliente.email || "").toLowerCase().includes(termo)
        );
      })
      .slice(0, 8);
  }, [clientes, form.clienteBusca]);

  const produtosFiltradosModal = useMemo(() => {
    const termo = form.produtoBusca.toLowerCase().trim();
    return produtos
      .filter((produto) => {
        if (!termo) return true;
        return (
          String(produto.name || "").toLowerCase().includes(termo) ||
          String(produto.category || "").toLowerCase().includes(termo) ||
          String(produto.short_description || "").toLowerCase().includes(termo)
        );
      })
      .slice(0, 10);
  }, [produtos, form.produtoBusca]);

  const totalOrcamento = useMemo(() => {
    const quantidade = Number(form.quantidade || 1);
    const unitario = Number(form.valorUnitario || 0);
    const desconto = Number(form.desconto || 0);
    const frete = Number(form.frete || 0);
    return Math.max(0, quantidade * unitario - desconto + frete);
  }, [form]);

  function dadosClienteDoFormulario() {
    if (form.modoCliente === "existente") {
      const cliente = clienteSelecionado();
      return {
        client_id: cliente?.id || "",
        client_name: cliente?.name || "",
        client_whatsapp: cliente?.whatsapp || "",
        client_email: cliente?.email || "",
        client_instagram: cliente?.instagram || "",
        client_address: cliente?.address || "",
      };
    }

    return {
      client_id: "",
      client_name: form.novoNome.trim(),
      client_whatsapp: form.novoWhatsapp.trim(),
      client_email: form.novoEmail.trim(),
      client_instagram: form.novoInstagram.trim(),
      client_address: form.novoEndereco.trim(),
    };
  }

  function dadosProdutoDoFormulario() {
    const produto = produtoSelecionado();
    const variacao = variacaoSelecionada();

    if (form.modoProduto === "cadastrado") {
      return {
        product_id: produto?.id || "",
        product_name: produto?.name || "",
        product_variation_label: produto && variacao ? etiquetaVariacao(produto) : "",
        product_variation_name: variacao?.name || "",
        product_variation_price: Number(variacao?.price || 0),
        production_time: form.prazo || produto?.production_time || "A combinar",
      };
    }

    return {
      product_id: "",
      product_name: form.nomeManual.trim() || "Produto personalizado",
      product_variation_label: "",
      product_variation_name: "",
      product_variation_price: 0,
      production_time: form.prazo || "A combinar",
    };
  }

  async function salvarNovoOrcamento(enviarWhatsApp = false) {
    try {
      const dadosCliente = dadosClienteDoFormulario();
      const dadosProduto = dadosProdutoDoFormulario();

      if (!dadosCliente.client_name) {
        alert("Informe o nome do cliente.");
        return;
      }

      if (!dadosCliente.client_whatsapp) {
        alert("Informe o WhatsApp do cliente.");
        return;
      }

      if (!dadosProduto.product_name) {
        alert("Informe ou selecione um produto.");
        return;
      }

      if (Number(form.quantidade || 0) <= 0) {
        alert("Informe uma quantidade válida.");
        return;
      }

      setSalvando(true);

      let clienteIdFinal = dadosCliente.client_id;

      if (form.modoCliente === "novo") {
        const clienteRef = await addDoc(collection(db, "clients"), {
          name: dadosCliente.client_name,
          whatsapp: dadosCliente.client_whatsapp,
          email: dadosCliente.client_email,
          instagram: dadosCliente.client_instagram,
          address: dadosCliente.client_address,
          notes: form.novoObservacoes.trim(),
          source: "Admin",
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });

        clienteIdFinal = clienteRef.id;
      }

      const quantidade = Number(form.quantidade || 1);
      const valorUnitario = Number(form.valorUnitario || 0);
      const desconto = Number(form.desconto || 0);
      const frete = Number(form.frete || 0);
      const total = Math.max(0, quantidade * valorUnitario - desconto + frete);

      const payload = {
        client_id: clienteIdFinal,
        client_name: dadosCliente.client_name,
        client_whatsapp: dadosCliente.client_whatsapp,
        client_email: dadosCliente.client_email,
        client_instagram: dadosCliente.client_instagram,
        client_address: dadosCliente.client_address,

        type: form.modoProduto === "cadastrado" ? "produto" : "manual",
        product_id: dadosProduto.product_id,
        product_name: dadosProduto.product_name,
        product_variation_label: dadosProduto.product_variation_label,
        product_variation_name: dadosProduto.product_variation_name,
        product_variation_price: dadosProduto.product_variation_price,

        quantity: quantidade,
        unit_value: valorUnitario,
        discount_value: desconto,
        freight_value: frete,
        total_value: total,

        production_time: dadosProduto.production_time,
        valid_until: "",
        status: form.status || STATUS.novo,
        source: "Admin",
        seller: "NM Serviços",
        description: form.descricao.trim(),
        notes: form.observacoes.trim() || form.descricao.trim(),

        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      const quoteRef = await addDoc(collection(db, "quotes"), payload);
      const novoOrcamento = { id: quoteRef.id, ...payload, created_at: new Date() };

      setOrcamentos((lista) => [novoOrcamento, ...lista]);

      if (enviarWhatsApp) {
        abrirWhatsApp(novoOrcamento, true);
      }

      await carregarClientes();
      setModalAberto(false);
      setForm(FORM_INICIAL);
      alert("Orçamento criado com sucesso.");
    } catch (erro) {
      console.error("Erro ao criar orçamento:", erro);
      alert("Erro ao criar orçamento.");
    } finally {
      setSalvando(false);
    }
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
        product_variation_label: orcamento.product_variation_label || "",
        product_variation_name: orcamento.product_variation_name || "",
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
        product_variation_label: orcamento.product_variation_label || "",
        product_variation_name: orcamento.product_variation_name || "",
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

  function montarMensagemOrcamento(orcamento) {
    const linhaVariacao =
      orcamento.product_variation_label && orcamento.product_variation_name
        ? `\n${orcamento.product_variation_label}: ${orcamento.product_variation_name}`
        : "";

    const desconto = Number(orcamento.discount_value || 0);
    const frete = Number(orcamento.freight_value || 0);

    return `Olá, ${orcamento.client_name || ""}! 😊

Segue seu orçamento da NM Serviços:

Produto:
${orcamento.product_name || "Produto personalizado"}${linhaVariacao}

Quantidade:
${orcamento.quantity || 1}

Valor unitário:
${formatarMoeda(orcamento.unit_value)}

${desconto > 0 ? `Desconto: ${formatarMoeda(desconto)}\n` : ""}${frete > 0 ? `Frete: ${formatarMoeda(frete)}\n` : ""}Valor total:
${formatarMoeda(orcamento.total_value)}

Prazo:
${orcamento.production_time || "A combinar"}

${orcamento.notes ? `Observações:\n${orcamento.notes}\n\n` : ""}Qualquer dúvida, estou à disposição.`;
  }

  function abrirWhatsApp(orcamento, mensagemCompleta = false) {
    const numero = limparNumero(orcamento.client_whatsapp);

    if (!numero) {
      alert("Este orçamento não tem WhatsApp cadastrado.");
      return;
    }

    const numeroFinal = numero.startsWith("55") ? numero : `55${numero}`;

    const mensagem = mensagemCompleta
      ? montarMensagemOrcamento(orcamento)
      : `Olá, ${orcamento.client_name || ""}! 😊

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

    const bateStatus = filtroStatus === "todos" || statusNormalizado === filtroStatus;
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

    return { total, novos, negociacao, convertidos, valorTotal, taxaConversao };
  }, [orcamentos]);

  const filtros = [
    { id: "todos", label: "Todos" },
    { id: STATUS.novo, label: "Novo" },
    { id: STATUS.negociacao, label: "Em negociação" },
    { id: STATUS.aprovado, label: "Aprovado" },
    { id: STATUS.perdido, label: "Perdido" },
    { id: STATUS.convertido, label: "Convertido" },
  ];

  const produtoAtual = produtoSelecionado();
  const variacoesProdutoAtual = variacoesProduto(produtoAtual);

  return (
    <div style={pagina}>
      <header style={cabecalho}>
        <span style={miniTitulo}>Comercial</span>
        <h1 style={titulo}>Orçamentos</h1>
        <p style={subtitulo}>Solicitações da loja, negociações e conversões em pedido.</p>
      </header>

      <section style={acoesTopo}>
        <button onClick={abrirModal} style={botaoNovoOrcamento}>
          + Novo Orçamento
        </button>
      </section>

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
            style={{ ...filtroBotao, ...(filtroStatus === filtro.id ? filtroBotaoAtivo : {}) }}
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
                    <h2 style={cardTitulo}>{orcamento.product_name || "Produto personalizado"}</h2>
                    {orcamento.product_variation_name && (
                      <p style={detalhes}>
                        {orcamento.product_variation_label || "Variação"}: <strong>{orcamento.product_variation_name}</strong>
                      </p>
                    )}
                    <p style={cliente}>Cliente: <strong>{orcamento.client_name || "Sem nome"}</strong></p>
                    <p style={detalhes}>WhatsApp: {orcamento.client_whatsapp || "Não informado"}</p>
                    <p style={detalhes}>Origem: {orcamento.source || "Loja"} • Criado em {formatarData(orcamento.created_at)}</p>
                  </div>

                  <span style={{ ...statusBadge, background: cor.bg, color: cor.color }}>
                    {statusAtual}
                  </span>
                </div>

                <div style={valorBox}>
                  <strong>{formatarMoeda(orcamento.total_value)}</strong>
                  <span>Qtd: {orcamento.quantity || 1} • Unit.: {formatarMoeda(orcamento.unit_value)}</span>
                </div>

                {orcamento.notes && <p style={observacao}>📝 {orcamento.notes}</p>}

                <div style={acoesLinha}>
                  <button onClick={() => alterarStatus(orcamento, STATUS.novo)} style={botaoNeutro}>Novo</button>
                  <button onClick={() => alterarStatus(orcamento, STATUS.negociacao)} style={botaoAzul}>Negociação</button>
                  <button onClick={() => alterarStatus(orcamento, STATUS.aprovado)} style={botaoVerdeClaro}>Aprovar</button>
                  <button onClick={() => alterarStatus(orcamento, STATUS.perdido)} style={botaoAmarelo}>Perdido</button>
                  <button onClick={() => abrirWhatsApp(orcamento, true)} style={botaoWhats}>💬 Enviar orçamento</button>
                  <button
                    onClick={() => converterEmPedido(orcamento)}
                    disabled={statusAtual === STATUS.convertido || convertendoId === orcamento.id}
                    style={{
                      ...botaoPrincipal,
                      opacity: statusAtual === STATUS.convertido || convertendoId === orcamento.id ? 0.55 : 1,
                    }}
                  >
                    {convertendoId === orcamento.id ? "Convertendo..." : statusAtual === STATUS.convertido ? "Já virou" : "Virou pedido"}
                  </button>
                  <button onClick={() => excluirOrcamento(orcamento)} style={botaoExcluir}>Excluir</button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {modalAberto && (
        <div style={modalOverlay} onClick={fecharModal}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={fecharModalBotao} onClick={fecharModal}>×</button>

            <span style={miniTitulo}>Novo</span>
            <h2 style={modalTitulo}>Criar orçamento</h2>
            <p style={modalSubtitulo}>Escolha um cliente cadastrado ou cadastre um novo. Depois selecione um produto da loja ou crie um item manual.</p>

            <section style={modalSecao}>
              <h3 style={modalSecaoTitulo}>Cliente</h3>
              <div style={switchBox}>
                <button type="button" onClick={() => atualizar("modoCliente", "existente")} style={{ ...switchBotao, ...(form.modoCliente === "existente" ? switchAtivo : {}) }}>Cliente cadastrado</button>
                <button type="button" onClick={() => atualizar("modoCliente", "novo")} style={{ ...switchBotao, ...(form.modoCliente === "novo" ? switchAtivo : {}) }}>Novo cliente</button>
              </div>

              {form.modoCliente === "existente" ? (
                <>
                  <input value={form.clienteBusca} onChange={(e) => atualizar("clienteBusca", e.target.value)} placeholder="Buscar cliente por nome, WhatsApp, Instagram ou e-mail..." style={inputBusca} />
                  <div style={resultadoGrid}>
                    {clientesFiltrados.length === 0 ? <p style={textoVazio}>Nenhum cliente encontrado.</p> : clientesFiltrados.map((cliente) => (
                      <button key={cliente.id} type="button" onClick={() => atualizar("clienteId", cliente.id)} style={{ ...resultadoBotao, ...(form.clienteId === cliente.id ? resultadoAtivo : {}) }}>
                        <strong>{cliente.name || "Sem nome"}</strong>
                        <span>{cliente.whatsapp || "WhatsApp não informado"}</span>
                        <small>{cliente.instagram || cliente.email || ""}</small>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div style={formGrid}>
                  <Campo label="Nome *"><input value={form.novoNome} onChange={(e) => atualizar("novoNome", e.target.value)} style={inputBusca} placeholder="Nome do cliente" /></Campo>
                  <Campo label="WhatsApp *"><input value={form.novoWhatsapp} onChange={(e) => atualizar("novoWhatsapp", e.target.value)} style={inputBusca} placeholder="(11) 99999-9999" /></Campo>
                  <Campo label="E-mail"><input value={form.novoEmail} onChange={(e) => atualizar("novoEmail", e.target.value)} style={inputBusca} placeholder="email@exemplo.com" /></Campo>
                  <Campo label="Instagram"><input value={form.novoInstagram} onChange={(e) => atualizar("novoInstagram", e.target.value)} style={inputBusca} placeholder="@cliente" /></Campo>
                  <Campo label="Endereço"><input value={form.novoEndereco} onChange={(e) => atualizar("novoEndereco", e.target.value)} style={inputBusca} placeholder="Rua, número, bairro, cidade" /></Campo>
                  <Campo label="Observações"><input value={form.novoObservacoes} onChange={(e) => atualizar("novoObservacoes", e.target.value)} style={inputBusca} placeholder="Preferências ou histórico" /></Campo>
                </div>
              )}
            </section>

            <section style={modalSecao}>
              <h3 style={modalSecaoTitulo}>Produto</h3>
              <div style={switchBox}>
                <button type="button" onClick={() => atualizar("modoProduto", "cadastrado")} style={{ ...switchBotao, ...(form.modoProduto === "cadastrado" ? switchAtivo : {}) }}>Produto cadastrado</button>
                <button type="button" onClick={() => atualizar("modoProduto", "manual")} style={{ ...switchBotao, ...(form.modoProduto === "manual" ? switchAtivo : {}) }}>Item manual</button>
              </div>

              {form.modoProduto === "cadastrado" ? (
                <>
                  <input value={form.produtoBusca} onChange={(e) => atualizar("produtoBusca", e.target.value)} placeholder="Buscar produto cadastrado..." style={inputBusca} />
                  <div style={resultadoGrid}>
                    {produtosFiltradosModal.length === 0 ? <p style={textoVazio}>Nenhum produto encontrado.</p> : produtosFiltradosModal.map((produto) => (
                      <button key={produto.id} type="button" onClick={() => selecionarProduto(produto.id)} style={{ ...resultadoBotao, ...(form.produtoId === produto.id ? resultadoAtivo : {}) }}>
                        <strong>{produto.name || "Produto sem nome"}</strong>
                        <span>{produto.category || "Sem categoria"}</span>
                        <small>{formatarMoeda(produto.price)}</small>
                      </button>
                    ))}
                  </div>

                  {produtoAtual && produtoTemVariacoes(produtoAtual) && (
                    <Campo label={`Variação (${etiquetaVariacao(produtoAtual)})`}>
                      <select value={form.variacaoNome} onChange={(e) => selecionarVariacao(e.target.value)} style={inputBusca}>
                        {variacoesProdutoAtual.map((variacao) => (
                          <option key={variacao.id} value={variacao.name}>{variacao.name} - {formatarMoeda(variacao.price)}</option>
                        ))}
                      </select>
                    </Campo>
                  )}
                </>
              ) : (
                <Campo label="Nome do item manual *"><input value={form.nomeManual} onChange={(e) => atualizar("nomeManual", e.target.value)} style={inputBusca} placeholder="Ex.: Kit festa personalizado" /></Campo>
              )}
            </section>

            <section style={modalSecao}>
              <h3 style={modalSecaoTitulo}>Valores e detalhes</h3>
              <div style={formGrid}>
                <Campo label="Quantidade"><input type="number" min="1" value={form.quantidade} onChange={(e) => atualizar("quantidade", e.target.value)} style={inputBusca} /></Campo>
                <Campo label="Valor unitário"><input type="number" min="0" step="0.01" value={form.valorUnitario} onChange={(e) => atualizar("valorUnitario", e.target.value)} style={inputBusca} /></Campo>
                <Campo label="Desconto"><input type="number" min="0" step="0.01" value={form.desconto} onChange={(e) => atualizar("desconto", e.target.value)} style={inputBusca} /></Campo>
                <Campo label="Frete"><input type="number" min="0" step="0.01" value={form.frete} onChange={(e) => atualizar("frete", e.target.value)} style={inputBusca} /></Campo>
                <Campo label="Prazo"><input value={form.prazo} onChange={(e) => atualizar("prazo", e.target.value)} style={inputBusca} placeholder="Ex.: 7 dias úteis" /></Campo>
                <Campo label="Status"><select value={form.status} onChange={(e) => atualizar("status", e.target.value)} style={inputBusca}><option value={STATUS.novo}>Novo</option><option value={STATUS.negociacao}>Em negociação</option><option value={STATUS.aprovado}>Aprovado</option><option value={STATUS.perdido}>Perdido</option></select></Campo>
              </div>

              <Campo label="Descrição do orçamento"><textarea value={form.descricao} onChange={(e) => atualizar("descricao", e.target.value)} style={textarea} placeholder="Detalhes do produto, tema, medidas, arte, acabamento..." /></Campo>
              <Campo label="Observações internas ou mensagem para cliente"><textarea value={form.observacoes} onChange={(e) => atualizar("observacoes", e.target.value)} style={textarea} placeholder="Informações extras que devem aparecer no orçamento..." /></Campo>

              <div style={totalBox}><span>Total do orçamento</span><strong>{formatarMoeda(totalOrcamento)}</strong></div>
            </section>

            <div style={modalRodape}>
              <button type="button" onClick={fecharModal} style={botaoCancelar}>Cancelar</button>
              <button type="button" onClick={() => salvarNovoOrcamento(false)} disabled={salvando} style={botaoSecundarioModal}>{salvando ? "Salvando..." : "Salvar orçamento"}</button>
              <button type="button" onClick={() => salvarNovoOrcamento(true)} disabled={salvando} style={botaoPrincipalModal}>{salvando ? "Salvando..." : "Salvar + Enviar WhatsApp"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }) {
  return <label style={campoBox}><span>{label}</span>{children}</label>;
}

function MetricaCard({ numero, label, destaque }) {
  return <div style={{ ...metricaCard, ...(destaque ? metricaDestaque : {}) }}><strong>{numero}</strong><span>{label}</span></div>;
}

function FunilItem({ label, valor }) {
  return <div style={funilItem}><strong>{valor}</strong><span>{label}</span></div>;
}

function FunilSeta() {
  return <div style={funilSeta}>↓</div>;
}

const pagina = { color: "#3b2430", fontFamily: "Inter, Arial, sans-serif" };
const cabecalho = { textAlign: "center", marginBottom: "18px" };
const miniTitulo = { display: "inline-block", background: "#ffe3ef", color: "#ec1971", padding: "7px 14px", borderRadius: "999px", fontWeight: "900", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" };
const titulo = { fontSize: "38px", margin: "10px 0 6px", lineHeight: "1", color: "#3b2430", fontWeight: "900" };
const subtitulo = { fontSize: "15px", color: "#7b5a6a", maxWidth: "680px", margin: "0 auto", lineHeight: "1.4" };
const acoesTopo = { display: "flex", justifyContent: "flex-end", marginBottom: "14px" };
const botaoNovoOrcamento = { border: "none", background: "linear-gradient(135deg, #ec1971, #7b1fa2)", color: "#fff", borderRadius: "16px", padding: "13px 18px", fontWeight: "900", cursor: "pointer", boxShadow: "0 12px 25px rgba(236,25,113,0.18)" };
const funilBox = { background: "#fff", border: "1px solid #f4cfe0", borderRadius: "18px", padding: "18px", marginBottom: "16px", boxShadow: "0 10px 24px rgba(236,25,113,0.05)" };
const tituloFunil = { textAlign: "center", margin: "0 0 14px", fontSize: "18px", color: "#3b2430" };
const funilGrid = { display: "grid", gridTemplateColumns: "1fr 26px 1fr 26px 1fr 26px 1fr 26px 1fr", gap: "8px", alignItems: "center" };
const funilItem = { background: "#fff1f7", border: "1px solid #f4cfe0", borderRadius: "14px", padding: "12px 10px", textAlign: "center", color: "#3b2430", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" };
const funilSeta = { textAlign: "center", color: "#ec1971", fontWeight: "900", fontSize: "18px" };
const metricasGrid = { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "16px" };
const metricaCard = { background: "#fff", border: "1px solid #f4cfe0", borderRadius: "16px", padding: "16px 10px", textAlign: "center", boxShadow: "0 10px 24px rgba(236,25,113,0.05)", color: "#3b2430", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" };
const metricaDestaque = { background: "linear-gradient(135deg, #ec1971, #7b1fa2)", color: "#fff" };
const barraBusca = { background: "#fff", border: "1px solid #f4cfe0", borderRadius: "18px", padding: "14px", marginBottom: "14px" };
const inputBusca = { width: "100%", border: "1px solid #f3bfd5", borderRadius: "12px", padding: "12px 14px", outline: "none", fontSize: "14px", color: "#8b1747", background: "#ffffff", boxSizing: "border-box" };
const filtrosBox = { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" };
const filtroBotao = { border: "1px solid #f4cfe0", background: "#fff", color: "#ec1971", borderRadius: "999px", padding: "8px 14px", fontWeight: "900", cursor: "pointer", fontSize: "12px" };
const filtroBotaoAtivo = { background: "#ec1971", color: "#fff" };
const lista = { display: "grid", gap: "14px" };
const card = { background: "#fff", border: "1px solid #f4cfe0", borderRadius: "18px", padding: "18px", boxShadow: "0 10px 24px rgba(236,25,113,0.05)", color: "#3b2430" };
const cardTopo = { display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start" };
const cardTitulo = { margin: "0 0 8px", fontSize: "18px", color: "#3b2430" };
const cliente = { margin: "0 0 5px", color: "#4b3a45", fontSize: "14px" };
const detalhes = { margin: "0 0 4px", color: "#7c6672", fontSize: "13px" };
const statusBadge = { padding: "7px 12px", borderRadius: "999px", fontWeight: "900", whiteSpace: "nowrap", fontSize: "12px" };
const valorBox = { marginTop: "14px", background: "#fff1f7", border: "1px solid #f4cfe0", borderRadius: "14px", padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", color: "#3b2430", fontSize: "13px" };
const observacao = { background: "#fff8fb", border: "1px dashed #f4cfe0", padding: "12px", borderRadius: "13px", color: "#6b4e5b", fontSize: "13px", margin: "12px 0 0" };
const acoesLinha = { display: "flex", flexWrap: "nowrap", gap: "7px", marginTop: "14px", overflowX: "auto", paddingBottom: "2px" };
const botaoBase = { border: "none", borderRadius: "9px", padding: "7px 10px", fontWeight: "900", cursor: "pointer", fontSize: "11px", lineHeight: "1", whiteSpace: "nowrap" };
const botaoNeutro = { ...botaoBase, background: "#f4f4f5", color: "#3f3f46" };
const botaoAzul = { ...botaoBase, background: "#e0f2fe", color: "#0369a1" };
const botaoVerdeClaro = { ...botaoBase, background: "#dcfce7", color: "#15803d" };
const botaoAmarelo = { ...botaoBase, background: "#fef3c7", color: "#92400e" };
const botaoWhats = { ...botaoBase, background: "#22c55e", color: "#fff" };
const botaoPrincipal = { ...botaoBase, background: "#ec1971", color: "#fff" };
const botaoExcluir = { ...botaoBase, background: "#fee2e2", color: "#b91c1c" };
const mensagem = { background: "#fff", border: "1px solid #f4cfe0", borderRadius: "18px", padding: "24px", textAlign: "center", color: "#7c6672" };
const modalOverlay = { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.48)", zIndex: 999, display: "grid", placeItems: "center", padding: "22px" };
const modal = { width: "min(980px, 96vw)", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: "26px", padding: "26px", position: "relative", boxShadow: "0 30px 90px rgba(0,0,0,0.22)", border: "1px solid #f4cfe0" };
const fecharModalBotao = { position: "absolute", right: "18px", top: "16px", width: "38px", height: "38px", borderRadius: "50%", border: "none", background: "#ffe3ef", color: "#ec1971", fontSize: "24px", cursor: "pointer" };
const modalTitulo = { fontSize: "32px", margin: "12px 0 6px", color: "#3b2430" };
const modalSubtitulo = { color: "#7b5a6a", margin: "0 0 20px", lineHeight: "1.5" };
const modalSecao = { border: "1px solid #f4cfe0", background: "#fff8fb", borderRadius: "20px", padding: "18px", marginBottom: "16px" };
const modalSecaoTitulo = { margin: "0 0 14px", color: "#3b2430" };
const switchBox = { display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" };
const switchBotao = { border: "1px solid #f4cfe0", background: "#fff", color: "#8b1747", borderRadius: "999px", padding: "10px 16px", fontWeight: "900", cursor: "pointer" };
const switchAtivo = { background: "#ec1971", color: "#fff", borderColor: "#ec1971" };
const resultadoGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", marginTop: "12px" };
const resultadoBotao = { border: "1px solid #f4cfe0", background: "#fff", borderRadius: "16px", padding: "12px", textAlign: "left", cursor: "pointer", color: "#3b2430", display: "flex", flexDirection: "column", gap: "4px" };
const resultadoAtivo = { borderColor: "#ec1971", background: "#fff0f7", boxShadow: "0 10px 24px rgba(236,25,113,0.12)" };
const textoVazio = { color: "#7b5a6a", margin: "4px 0" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" };
const campoBox = { display: "flex", flexDirection: "column", gap: "7px", color: "#4d3542", fontWeight: "900", fontSize: "13px", marginTop: "12px" };
const textarea = { ...inputBusca, minHeight: "96px", resize: "vertical" };
const totalBox = { background: "linear-gradient(135deg, #ec1971, #7b1fa2)", color: "#fff", borderRadius: "18px", padding: "18px", marginTop: "16px", display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", fontWeight: "900" };
const modalRodape = { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap", paddingTop: "8px" };
const botaoCancelar = { border: "1px solid #f4cfe0", background: "#fff", color: "#3b2430", borderRadius: "14px", padding: "13px 18px", fontWeight: "900", cursor: "pointer" };
const botaoSecundarioModal = { border: "1px solid #ec1971", background: "#fff4f9", color: "#ec1971", borderRadius: "14px", padding: "13px 18px", fontWeight: "900", cursor: "pointer" };
const botaoPrincipalModal = { border: "none", background: "linear-gradient(135deg, #ec1971, #7b1fa2)", color: "#fff", borderRadius: "14px", padding: "13px 18px", fontWeight: "900", cursor: "pointer" };
