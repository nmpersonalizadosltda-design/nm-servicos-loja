import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase/config";

function Admin() {
  const [abaAtiva, setAbaAtiva] = useState("produtos");

  const [categorias, setCategorias] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  const [salvando, setSalvando] = useState(false);
  const [clienteEditandoId, setClienteEditandoId] = useState(null);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [pedidoEditandoId, setPedidoEditandoId] = useState(null);
  const [buscaPedido, setBuscaPedido] = useState("");

  const [pedido, setPedido] = useState({
    client_id: "",
    client_name: "",
    client_whatsapp: "",
    product_name: "",
    quantity: 1,
    total_value: "",
    signal_value: "",
    remaining_value: 0,
    payment_status: "nao_pago",
    order_status: "orcamento",
    payment_method: "pix",
    delivery_date: "",
    notes: "",
  });

  const [produto, setProduto] = useState({
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
    available: true,
    featured: false,
  });

  const [cliente, setCliente] = useState({
    name: "",
    whatsapp: "",
    instagram: "",
    city: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    carregarCategorias();
    carregarClientes();
    carregarPedidos();
  }, []);

  async function carregarCategorias() {
    const categoriasSnapshot = await getDocs(collection(db, "categories"));
    const lista = categoriasSnapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    lista.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    setCategorias(lista);
  }

  async function carregarClientes() {
    const clientesSnapshot = await getDocs(collection(db, "clients"));
    const lista = clientesSnapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    lista.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    setClientes(lista);
  }

  async function carregarPedidos() {
    const pedidosSnapshot = await getDocs(collection(db, "orders"));
    const lista = pedidosSnapshot.docs.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }));

    lista.sort((a, b) => {
      const dataA = obterDataPedido(a)?.toDate
        ? obterDataPedido(a).toDate()
        : new Date(obterDataPedido(a) || 0);
      const dataB = obterDataPedido(b)?.toDate
        ? obterDataPedido(b).toDate()
        : new Date(obterDataPedido(b) || 0);

      return dataB - dataA;
    });

    setPedidos(lista);
  }

  function atualizarProduto(campo, valor) {
    setProduto((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function atualizarCliente(campo, valor) {
    setCliente((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function atualizarPedido(campo, valor) {
    setPedido((prev) => {
      const novoPedido = {
        ...prev,
        [campo]: valor,
      };

      const total = Number(novoPedido.total_value || 0);
      const sinal = Number(novoPedido.signal_value || 0);
      novoPedido.remaining_value = Math.max(total - sinal, 0);

      return novoPedido;
    });
  }

  function gerarSlug(texto) {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
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
    if (!valor) return "Não informado";

    try {
      if (valor?.toDate) {
        return valor.toDate().toLocaleDateString("pt-BR");
      }

      const data = new Date(valor);
      if (Number.isNaN(data.getTime())) return "Não informado";

      return data.toLocaleDateString("pt-BR");
    } catch {
      return "Não informado";
    }
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

  function obterDataPedido(pedido) {
  
  const statusKanban = [
    { id: "orcamento", titulo: "Orçamento" },
    { id: "aguardando_sinal", titulo: "Aguardando sinal" },
    { id: "confirmado", titulo: "Confirmado" },
    { id: "em_producao", titulo: "Em produção" },
    { id: "pronto", titulo: "Pronto" },
    { id: "entregue", titulo: "Entregue" },
    { id: "cancelado", titulo: "Cancelado" },
  ];

  function pedidosPorStatus(status) {
    return pedidos.filter((item) => item.order_status === status);
  }

  function indiceStatus(status) {
    return statusKanban.findIndex((item) => item.id === status);
  }

  async function alterarStatusPedido(id, novoStatus) {
    try {
      await updateDoc(doc(db, "orders", id), {
        order_status: novoStatus,
        updated_at: new Date(),
      });

      await carregarPedidos();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao atualizar status do pedido.");
    }
  }

  function voltarStatus(pedidoItem) {
    const indiceAtual = indiceStatus(pedidoItem.order_status);

    if (indiceAtual <= 0) return;

    const statusAnterior = statusKanban[indiceAtual - 1].id;
    alterarStatusPedido(pedidoItem.id, statusAnterior);
  }

  function avancarStatus(pedidoItem) {
    const indiceAtual = indiceStatus(pedidoItem.order_status);

    if (indiceAtual < 0 || indiceAtual >= statusKanban.length - 1) return;

    const proximoStatus = statusKanban[indiceAtual + 1].id;
    alterarStatusPedido(pedidoItem.id, proximoStatus);
  }

  function pedidoEstaAtrasado(pedidoItem) {
    if (!pedidoItem.delivery_date) return false;
    if (["entregue", "cancelado"].includes(pedidoItem.order_status)) return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const entrega = new Date(`${pedidoItem.delivery_date}T00:00:00`);
    return entrega < hoje;
  }

  const pedidosAtrasados = pedidos.filter((item) => pedidoEstaAtrasado(item)).length;
  const pedidosProntos = pedidos.filter((item) => item.order_status === "pronto").length;
  const pedidosEntregues = pedidos.filter((item) => item.order_status === "entregue").length;


  return (
      pedido.created_at ||
      pedido.order_date ||
      pedido.data_pedido ||
      pedido.delivery_date ||
      null
    );
  }

  function pedidosDoCliente(clienteSelecionado) {
    const whatsappCliente = limparNumero(clienteSelecionado.whatsapp);
    const nomeCliente = String(clienteSelecionado.name || "").toLowerCase().trim();

    return pedidos.filter((pedido) => {
      const whatsappPedido = limparNumero(
        pedido.client_whatsapp || pedido.whatsapp || pedido.cliente_whatsapp
      );

      const nomePedido = String(
        pedido.client_name || pedido.cliente_nome || pedido.customer_name || ""
      )
        .toLowerCase()
        .trim();

      return (
        (whatsappCliente && whatsappPedido && whatsappCliente === whatsappPedido) ||
        (nomeCliente && nomePedido && nomeCliente === nomePedido)
      );
    });
  }

  function resumoCliente(clienteSelecionado) {
    const listaPedidos = pedidosDoCliente(clienteSelecionado);
    const totalGasto = listaPedidos.reduce(
      (total, pedido) => total + obterValorPedido(pedido),
      0
    );

    const pedidosOrdenados = [...listaPedidos].sort((a, b) => {
      const dataA = obterDataPedido(a)?.toDate
        ? obterDataPedido(a).toDate()
        : new Date(obterDataPedido(a) || 0);
      const dataB = obterDataPedido(b)?.toDate
        ? obterDataPedido(b).toDate()
        : new Date(obterDataPedido(b) || 0);

      return dataB - dataA;
    });

    return {
      totalPedidos: listaPedidos.length,
      totalGasto,
      ultimoPedido: pedidosOrdenados[0] ? formatarData(obterDataPedido(pedidosOrdenados[0])) : "Sem pedidos",
    };
  }

  const clientesFiltrados = clientes.filter((clienteItem) => {
    const busca = buscaCliente.toLowerCase().trim();

    if (!busca) return true;

    return (
      String(clienteItem.name || "").toLowerCase().includes(busca) ||
      String(clienteItem.whatsapp || "").toLowerCase().includes(busca) ||
      String(clienteItem.instagram || "").toLowerCase().includes(busca) ||
      String(clienteItem.city || "").toLowerCase().includes(busca)
    );
  });

  const totalClientes = clientes.length;
  const clientesComPedido = clientes.filter(
    (clienteItem) => pedidosDoCliente(clienteItem).length > 0
  ).length;
  const totalGeralClientes = clientes.reduce(
    (total, clienteItem) => total + resumoCliente(clienteItem).totalGasto,
    0
  );

  const pedidosFiltrados = pedidos.filter((pedidoItem) => {
    const busca = buscaPedido.toLowerCase().trim();

    if (!busca) return true;

    return (
      String(pedidoItem.client_name || "").toLowerCase().includes(busca) ||
      String(pedidoItem.client_whatsapp || "").toLowerCase().includes(busca) ||
      String(pedidoItem.product_name || "").toLowerCase().includes(busca) ||
      String(pedidoItem.order_status || "").toLowerCase().includes(busca) ||
      String(pedidoItem.payment_status || "").toLowerCase().includes(busca)
    );
  });

  const totalPedidos = pedidos.length;
  const pedidosEmProducao = pedidos.filter((item) => item.order_status === "em_producao").length;
  const pedidosPendentesPagamento = pedidos.filter((item) => item.payment_status !== "pago_total").length;
  const totalVendidoPedidos = pedidos.reduce((total, item) => total + obterValorPedido(item), 0);
  const totalRecebidoPedidos = pedidos.reduce((total, item) => total + Number(item.signal_value || 0), 0);
  const totalAReceberPedidos = pedidos.reduce((total, item) => total + Number(item.remaining_value || 0), 0);

  function valorRecebidoPedido(pedidoItem) {
    if (pedidoItem.payment_status === "pago_total") {
      return obterValorPedido(pedidoItem);
    }

    if (pedidoItem.payment_status === "sinal_pago") {
      return Number(pedidoItem.signal_value || 0);
    }

    return 0;
  }

  function valorAReceberPedido(pedidoItem) {
    if (
      pedidoItem.payment_status === "pago_total" ||
      pedidoItem.payment_status === "reembolsado" ||
      pedidoItem.order_status === "cancelado"
    ) {
      return 0;
    }

    const total = obterValorPedido(pedidoItem);
    const recebido = valorRecebidoPedido(pedidoItem);

    return Math.max(total - recebido, 0);
  }

  function traduzirFormaPagamento(metodo) {
    const metodoMap = {
      pix: "Pix",
      dinheiro: "Dinheiro",
      cartao_credito: "Cartão de crédito",
      cartao_debito: "Cartão de débito",
      boleto: "Boleto",
      outro: "Outro",
    };

    return metodoMap[metodo] || metodo || "Não informado";
  }

  const pedidosValidosFinanceiro = pedidos.filter(
    (item) => item.order_status !== "cancelado" && item.payment_status !== "reembolsado"
  );

  const totalVendidoFinanceiro = pedidosValidosFinanceiro.reduce(
    (total, item) => total + obterValorPedido(item),
    0
  );

  const totalRecebidoFinanceiro = pedidosValidosFinanceiro.reduce(
    (total, item) => total + valorRecebidoPedido(item),
    0
  );

  const totalAReceberFinanceiro = pedidosValidosFinanceiro.reduce(
    (total, item) => total + valorAReceberPedido(item),
    0
  );

  const pedidosPagoTotal = pedidos.filter((item) => item.payment_status === "pago_total").length;
  const pedidosSinalPago = pedidos.filter((item) => item.payment_status === "sinal_pago").length;
  const pedidosNaoPagos = pedidos.filter((item) => item.payment_status === "nao_pago").length;
  const pedidosCancelados = pedidos.filter((item) => item.order_status === "cancelado").length;

  const pedidosFinanceirosPendentes = pedidos.filter(
    (item) =>
      item.order_status !== "cancelado" &&
      item.payment_status !== "pago_total" &&
      item.payment_status !== "reembolsado"
  );

  async function salvarProduto(e) {
    e.preventDefault();

    if (!produto.name.trim()) {
      alert("Preencha o nome do produto.");
      return;
    }

    if (!produto.price) {
      alert("Preencha o preço do produto.");
      return;
    }

    if (!produto.category) {
      alert("Escolha uma categoria.");
      return;
    }

    setSalvando(true);

    try {
      await addDoc(collection(db, "products"), {
        ...produto,
        slug: produto.slug || gerarSlug(produto.name),
        price: Number(produto.price),
        created_at: new Date(),
      });

      alert("Produto cadastrado com sucesso!");

      setProduto({
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
        available: true,
        featured: false,
      });
    } catch (erro) {
      console.error(erro);
      alert("Erro ao cadastrar produto.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarCliente(e) {
    e.preventDefault();

    if (!cliente.name.trim()) {
      alert("Preencha o nome do cliente.");
      return;
    }

    if (!cliente.whatsapp.trim()) {
      alert("Preencha o WhatsApp do cliente.");
      return;
    }

    setSalvando(true);

    try {
      if (clienteEditandoId) {
        await updateDoc(doc(db, "clients", clienteEditandoId), {
          ...cliente,
          updated_at: new Date(),
        });

        alert("Cliente atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "clients"), {
          ...cliente,
          created_at: new Date(),
        });

        alert("Cliente cadastrado com sucesso!");
      }

      limparFormularioCliente();
      carregarClientes();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao salvar cliente.");
    } finally {
      setSalvando(false);
    }
  }

  function editarCliente(clienteSelecionado) {
    setClienteEditandoId(clienteSelecionado.id);
    setCliente({
      name: clienteSelecionado.name || "",
      whatsapp: clienteSelecionado.whatsapp || "",
      instagram: clienteSelecionado.instagram || "",
      city: clienteSelecionado.city || "",
      address: clienteSelecionado.address || "",
      notes: clienteSelecionado.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirCliente(id) {
    const confirmar = confirm("Tem certeza que deseja excluir este cliente?");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "clients", id));
      alert("Cliente excluído com sucesso!");
      carregarClientes();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao excluir cliente.");
    }
  }

  function limparFormularioCliente() {
    setClienteEditandoId(null);
    setCliente({
      name: "",
      whatsapp: "",
      instagram: "",
      city: "",
      address: "",
      notes: "",
    });
  }

  function abrirWhatsApp(numero) {
    const numeroLimpo = limparNumero(numero);
    window.open(`https://wa.me/55${numeroLimpo}`, "_blank");
  }


  function selecionarClientePedido(clienteId) {
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
    }));
  }

  function limparFormularioPedido() {
    setPedidoEditandoId(null);
    setPedido({
      client_id: "",
      client_name: "",
      client_whatsapp: "",
      product_name: "",
      quantity: 1,
      total_value: "",
      signal_value: "",
      remaining_value: 0,
      payment_status: "nao_pago",
      order_status: "orcamento",
      payment_method: "pix",
      delivery_date: "",
      notes: "",
    });
  }

  async function salvarPedido(e) {
    e.preventDefault();

    if (!pedido.client_name.trim()) {
      alert("Selecione ou informe o cliente do pedido.");
      return;
    }

    if (!pedido.product_name.trim()) {
      alert("Preencha o produto ou serviço do pedido.");
      return;
    }

    if (!pedido.total_value) {
      alert("Preencha o valor total do pedido.");
      return;
    }

    setSalvando(true);

    try {
      const total = Number(pedido.total_value || 0);
      const sinal = Number(pedido.signal_value || 0);
      const restante = Math.max(total - sinal, 0);

      const dadosPedido = {
        ...pedido,
        quantity: Number(pedido.quantity || 1),
        total_value: total,
        signal_value: sinal,
        remaining_value: restante,
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

      limparFormularioPedido();
      carregarPedidos();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao salvar pedido.");
    } finally {
      setSalvando(false);
    }
  }

  function editarPedido(pedidoSelecionado) {
    setPedidoEditandoId(pedidoSelecionado.id);
    setPedido({
      client_id: pedidoSelecionado.client_id || "",
      client_name: pedidoSelecionado.client_name || "",
      client_whatsapp: pedidoSelecionado.client_whatsapp || "",
      product_name: pedidoSelecionado.product_name || "",
      quantity: pedidoSelecionado.quantity || 1,
      total_value: pedidoSelecionado.total_value || "",
      signal_value: pedidoSelecionado.signal_value || "",
      remaining_value: pedidoSelecionado.remaining_value || 0,
      payment_status: pedidoSelecionado.payment_status || "nao_pago",
      order_status: pedidoSelecionado.order_status || "orcamento",
      payment_method: pedidoSelecionado.payment_method || "pix",
      delivery_date: pedidoSelecionado.delivery_date || "",
      notes: pedidoSelecionado.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
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

  function abrirWhatsAppPedido(pedidoSelecionado) {
    const telefone = limparNumero(pedidoSelecionado.client_whatsapp);

    if (!telefone) {
      alert("Este pedido não tem WhatsApp cadastrado.");
      return;
    }

    const mensagem = `Olá, ${pedidoSelecionado.client_name}! Tudo bem?

Estou falando sobre seu pedido na NM Serviços:

Produto: ${pedidoSelecionado.product_name}
Quantidade: ${pedidoSelecionado.quantity || 1}
Valor total: ${formatarPreco(pedidoSelecionado.total_value)}
Sinal pago: ${formatarPreco(pedidoSelecionado.signal_value)}
Restante: ${formatarPreco(pedidoSelecionado.remaining_value)}
Status do pedido: ${traduzirStatusPedido(pedidoSelecionado.order_status)}
Status do pagamento: ${traduzirStatusPagamento(pedidoSelecionado.payment_status)}

Qualquer dúvida, estou à disposição.`;

    window.open(
      `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`,
      "_blank"
    );
  }

  function traduzirStatusPedido(status) {
    const statusMap = {
      orcamento: "Orçamento",
      aguardando_sinal: "Aguardando sinal",
      confirmado: "Confirmado",
      em_producao: "Em produção",
      pronto: "Pronto",
      entregue: "Entregue",
      cancelado: "Cancelado",
    };

    return statusMap[status] || status || "Não informado";
  }

  function traduzirStatusPagamento(status) {
    const statusMap = {
      nao_pago: "Não pago",
      sinal_pago: "Sinal pago",
      pago_total: "Pago total",
      reembolsado: "Reembolsado",
    };

    return statusMap[status] || status || "Não informado";
  }

  function corStatusPedido(status) {
    const cores = {
      orcamento: "#607d8b",
      aguardando_sinal: "#f57c00",
      confirmado: "#1976d2",
      em_producao: "#8e24aa",
      pronto: "#388e3c",
      entregue: "#2e7d32",
      cancelado: "#d32f2f",
    };

    return cores[status] || "#607d8b";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f5f7",
        color: "#222",
        display: "grid",
        gridTemplateColumns: "240px 1fr",
      }}
    >
      <aside
        style={{
          background: "#fff",
          borderRight: "1px solid #eee",
          padding: "24px",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <h2 style={{ color: "#e91e63", marginBottom: "30px" }}>NM Admin</h2>

        <button onClick={() => setAbaAtiva("produtos")} style={abaAtiva === "produtos" ? menuAtivo : menuBotao}>
          📦 Produtos
        </button>

        <button onClick={() => setAbaAtiva("clientes")} style={abaAtiva === "clientes" ? menuAtivo : menuBotao}>
          👥 Clientes
        </button>

        <button onClick={() => setAbaAtiva("pedidos")} style={abaAtiva === "pedidos" ? menuAtivo : menuBotao}>
          🧾 Pedidos
        </button>

        <button onClick={() => setAbaAtiva("producao")} style={abaAtiva === "producao" ? menuAtivo : menuBotao}>
          🧵 Produção
        </button>

        <button onClick={() => setAbaAtiva("financeiro")} style={abaAtiva === "financeiro" ? menuAtivo : menuBotao}>
          💰 Financeiro
        </button>

        <button onClick={() => setAbaAtiva("avaliacoes")} style={abaAtiva === "avaliacoes" ? menuAtivo : menuBotao}>
          ⭐ Avaliações
        </button>

        <button onClick={() => setAbaAtiva("configuracoes")} style={abaAtiva === "configuracoes" ? menuAtivo : menuBotao}>
          ⚙ Configurações
        </button>

        <a
          href="/"
          style={{
            display: "block",
            marginTop: "30px",
            color: "#e91e63",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          ← Ver loja
        </a>
      </aside>

      <main style={{ padding: "40px" }}>
        {abaAtiva === "produtos" && (
          <section>
            <h1>Produtos</h1>
            <p>Cadastre produtos sem abrir o Firebase. Pequeno luxo tecnológico.</p>

            <form onSubmit={salvarProduto} style={cardEstilo}>
              <h2>Novo Produto</h2>

              <label>Nome do produto</label>
              <input
                type="text"
                autoComplete="off"
                value={produto.name}
                onChange={(e) => atualizarProduto("name", e.target.value)}
                style={campoEstilo}
                placeholder="Ex: Planner Simples Personalizado A5"
              />

              <label>Slug</label>
              <input
                type="text"
                autoComplete="off"
                value={produto.slug}
                onChange={(e) => atualizarProduto("slug", e.target.value)}
                style={campoEstilo}
                placeholder="planner-simples-personalizado-a5"
              />

              <label>Preço</label>
              <input
                type="number"
                step="0.01"
                value={produto.price}
                onChange={(e) => atualizarProduto("price", e.target.value)}
                style={campoEstilo}
                placeholder="64.90"
              />

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

              <label>Descrição curta</label>
              <textarea
                value={produto.short_description}
                onChange={(e) => atualizarProduto("short_description", e.target.value)}
                style={{ ...campoEstilo, minHeight: "70px" }}
              />

              <label>Descrição completa</label>
              <textarea
                value={produto.full_description}
                onChange={(e) => atualizarProduto("full_description", e.target.value)}
                style={{ ...campoEstilo, minHeight: "120px" }}
              />

              <h3>Fotos e vídeo</h3>

              <input value={produto.image_url_1} onChange={(e) => atualizarProduto("image_url_1", e.target.value)} style={campoEstilo} placeholder="Imagem 1" />
              <input value={produto.image_url_2} onChange={(e) => atualizarProduto("image_url_2", e.target.value)} style={campoEstilo} placeholder="Imagem 2" />
              <input value={produto.image_url_3} onChange={(e) => atualizarProduto("image_url_3", e.target.value)} style={campoEstilo} placeholder="Imagem 3" />
              <input value={produto.image_url_4} onChange={(e) => atualizarProduto("image_url_4", e.target.value)} style={campoEstilo} placeholder="Imagem 4" />
              <input value={produto.video_url} onChange={(e) => atualizarProduto("video_url", e.target.value)} style={campoEstilo} placeholder="Link do vídeo" />

              <h3>Informações do produto</h3>

              <input value={produto.production_time} onChange={(e) => atualizarProduto("production_time", e.target.value)} style={campoEstilo} placeholder="Prazo de produção" />
              <input value={produto.size} onChange={(e) => atualizarProduto("size", e.target.value)} style={campoEstilo} placeholder="Tamanho" />
              <input value={produto.finish} onChange={(e) => atualizarProduto("finish", e.target.value)} style={campoEstilo} placeholder="Acabamento" />

              <textarea
                value={produto.personalization}
                onChange={(e) => atualizarProduto("personalization", e.target.value)}
                style={{ ...campoEstilo, minHeight: "80px" }}
                placeholder="Personalização disponível"
              />

              <h3>Destaques</h3>

              <input value={produto.highlight_1} onChange={(e) => atualizarProduto("highlight_1", e.target.value)} style={campoEstilo} />
              <input value={produto.highlight_2} onChange={(e) => atualizarProduto("highlight_2", e.target.value)} style={campoEstilo} />
              <input value={produto.highlight_3} onChange={(e) => atualizarProduto("highlight_3", e.target.value)} style={campoEstilo} />
              <input value={produto.highlight_4} onChange={(e) => atualizarProduto("highlight_4", e.target.value)} style={campoEstilo} />

              <div style={{ display: "flex", gap: "20px", margin: "15px 0" }}>
                <label>
                  <input type="checkbox" checked={produto.available} onChange={(e) => atualizarProduto("available", e.target.checked)} /> Produto disponível
                </label>

                <label>
                  <input type="checkbox" checked={produto.featured} onChange={(e) => atualizarProduto("featured", e.target.checked)} /> Produto em destaque
                </label>
              </div>

              <button type="submit" disabled={salvando} style={botaoPrincipal}>
                {salvando ? "Salvando..." : "Cadastrar produto"}
              </button>
            </form>
          </section>
        )}

        {abaAtiva === "clientes" && (
          <section>
            <h1>Clientes</h1>
            <p>Cadastre e acompanhe histórico, pedidos e total gasto por cliente. Agora começa a ficar útil de verdade.</p>

            <div style={resumoGrid}>
              <div style={resumoCard}>
                <strong>{totalClientes}</strong>
                <span>Clientes cadastrados</span>
              </div>

              <div style={resumoCard}>
                <strong>{clientesComPedido}</strong>
                <span>Clientes com pedidos</span>
              </div>

              <div style={resumoCard}>
                <strong>{formatarPreco(totalGeralClientes)}</strong>
                <span>Total vendido para clientes</span>
              </div>
            </div>

            <form onSubmit={salvarCliente} style={cardEstilo}>
              <h2>{clienteEditandoId ? "Editar Cliente" : "Novo Cliente"}</h2>

              <label>Nome do cliente</label>
              <input value={cliente.name} onChange={(e) => atualizarCliente("name", e.target.value)} style={campoEstilo} placeholder="Ex: Vanessa" />

              <label>WhatsApp</label>
              <input value={cliente.whatsapp} onChange={(e) => atualizarCliente("whatsapp", e.target.value)} style={campoEstilo} placeholder="11999999999" />

              <label>Instagram</label>
              <input value={cliente.instagram} onChange={(e) => atualizarCliente("instagram", e.target.value)} style={campoEstilo} placeholder="@cliente" />

              <label>Cidade</label>
              <input value={cliente.city} onChange={(e) => atualizarCliente("city", e.target.value)} style={campoEstilo} placeholder="São Paulo/SP" />

              <label>Endereço</label>
              <textarea value={cliente.address} onChange={(e) => atualizarCliente("address", e.target.value)} style={{ ...campoEstilo, minHeight: "70px" }} placeholder="Endereço completo" />

              <label>Observações</label>
              <textarea value={cliente.notes} onChange={(e) => atualizarCliente("notes", e.target.value)} style={{ ...campoEstilo, minHeight: "70px" }} placeholder="Preferências, histórico, detalhes importantes..." />

              <button type="submit" disabled={salvando} style={botaoPrincipal}>
                {salvando ? "Salvando..." : clienteEditandoId ? "Atualizar cliente" : "Cadastrar cliente"}
              </button>

              {clienteEditandoId && (
                <button type="button" onClick={limparFormularioCliente} style={botaoSecundario}>
                  Cancelar edição
                </button>
              )}
            </form>

            <div style={{ marginTop: "30px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                <h2>Clientes cadastrados</h2>

                <input
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  style={{ ...campoEstilo, maxWidth: "360px", marginBottom: 0 }}
                  placeholder="Buscar por nome, WhatsApp, Instagram ou cidade"
                />
              </div>

              {clientesFiltrados.length === 0 ? (
                <p>Nenhum cliente encontrado.</p>
              ) : (
                clientesFiltrados.map((clienteItem) => {
                  const resumo = resumoCliente(clienteItem);

                  return (
                    <div key={clienteItem.id} style={clienteCardCompleto}>
                      <div>
                        <h3 style={{ margin: "0 0 8px" }}>{clienteItem.name}</h3>

                        <div style={clienteInfoGrid}>
                          <span>📱 {clienteItem.whatsapp || "Sem WhatsApp"}</span>
                          <span>📸 {clienteItem.instagram || "Instagram não informado"}</span>
                          <span>📍 {clienteItem.city || "Cidade não informada"}</span>
                          <span>📅 Cadastro: {formatarData(clienteItem.created_at)}</span>
                        </div>

                        {clienteItem.address && (
                          <p style={{ margin: "10px 0 0" }}>Endereço: {clienteItem.address}</p>
                        )}

                        {clienteItem.notes && (
                          <p style={{ margin: "8px 0 0", color: "#666" }}>Obs: {clienteItem.notes}</p>
                        )}
                      </div>

                      <div style={clienteResumoBox}>
                        <div>
                          <strong>{resumo.totalPedidos}</strong>
                          <span>Pedidos</span>
                        </div>

                        <div>
                          <strong>{formatarPreco(resumo.totalGasto)}</strong>
                          <span>Total gasto</span>
                        </div>

                        <div>
                          <strong>{resumo.ultimoPedido}</strong>
                          <span>Último pedido</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
                        <button onClick={() => abrirWhatsApp(clienteItem.whatsapp)} style={botaoWhatsapp}>
                          WhatsApp
                        </button>

                        <button onClick={() => editarCliente(clienteItem)} style={botaoEditar}>
                          Editar
                        </button>

                        <button onClick={() => excluirCliente(clienteItem.id)} style={botaoExcluir}>
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {abaAtiva === "pedidos" && (
          <section>
            <h1>Pedidos</h1>
            <p>Cadastre pedidos, acompanhe produção, controle sinal, saldo e pagamento sem abrir o Firebase. Olha o luxo administrativo nascendo.</p>

            <div style={resumoGrid}>
              <div style={resumoCard}>
                <strong>{totalPedidos}</strong>
                <span>Pedidos cadastrados</span>
              </div>

              <div style={resumoCard}>
                <strong>{pedidosEmProducao}</strong>
                <span>Em produção</span>
              </div>

              <div style={resumoCard}>
                <strong>{formatarPreco(totalVendidoPedidos)}</strong>
                <span>Total vendido</span>
              </div>

              <div style={resumoCard}>
                <strong>{formatarPreco(totalAReceberPedidos)}</strong>
                <span>Total a receber</span>
              </div>
            </div>

            <form onSubmit={salvarPedido} style={cardEstilo}>
              <h2>{pedidoEditandoId ? "Editar Pedido" : "Novo Pedido"}</h2>

              <label>Cliente cadastrado</label>
              <select
                value={pedido.client_id}
                onChange={(e) => selecionarClientePedido(e.target.value)}
                style={campoEstilo}
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((clienteItem) => (
                  <option key={clienteItem.id} value={clienteItem.id}>
                    {clienteItem.name} - {clienteItem.whatsapp}
                  </option>
                ))}
              </select>

              <label>Nome do cliente</label>
              <input
                value={pedido.client_name}
                onChange={(e) => atualizarPedido("client_name", e.target.value)}
                style={campoEstilo}
                placeholder="Ex: Vanessa"
              />

              <label>WhatsApp do cliente</label>
              <input
                value={pedido.client_whatsapp}
                onChange={(e) => atualizarPedido("client_whatsapp", e.target.value)}
                style={campoEstilo}
                placeholder="11999999999"
              />

              <label>Produto ou serviço</label>
              <input
                value={pedido.product_name}
                onChange={(e) => atualizarPedido("product_name", e.target.value)}
                style={campoEstilo}
                placeholder="Ex: Planner personalizado A5"
              />

              <label>Quantidade</label>
              <input
                type="number"
                min="1"
                value={pedido.quantity}
                onChange={(e) => atualizarPedido("quantity", e.target.value)}
                style={campoEstilo}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label>Valor total</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pedido.total_value}
                    onChange={(e) => atualizarPedido("total_value", e.target.value)}
                    style={campoEstilo}
                    placeholder="129.90"
                  />
                </div>

                <div>
                  <label>Sinal pago</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pedido.signal_value}
                    onChange={(e) => atualizarPedido("signal_value", e.target.value)}
                    style={campoEstilo}
                    placeholder="50.00"
                  />
                </div>

                <div>
                  <label>Restante</label>
                  <input
                    value={formatarPreco(pedido.remaining_value)}
                    readOnly
                    style={{ ...campoEstilo, background: "#f5f5f5" }}
                  />
                </div>
              </div>

              <label>Status do pedido</label>
              <select
                value={pedido.order_status}
                onChange={(e) => atualizarPedido("order_status", e.target.value)}
                style={campoEstilo}
              >
                <option value="orcamento">Orçamento</option>
                <option value="aguardando_sinal">Aguardando sinal</option>
                <option value="confirmado">Confirmado</option>
                <option value="em_producao">Em produção</option>
                <option value="pronto">Pronto</option>
                <option value="entregue">Entregue</option>
                <option value="cancelado">Cancelado</option>
              </select>

              <label>Status do pagamento</label>
              <select
                value={pedido.payment_status}
                onChange={(e) => atualizarPedido("payment_status", e.target.value)}
                style={campoEstilo}
              >
                <option value="nao_pago">Não pago</option>
                <option value="sinal_pago">Sinal pago</option>
                <option value="pago_total">Pago total</option>
                <option value="reembolsado">Reembolsado</option>
              </select>

              <label>Forma de pagamento</label>
              <select
                value={pedido.payment_method}
                onChange={(e) => atualizarPedido("payment_method", e.target.value)}
                style={campoEstilo}
              >
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao_credito">Cartão de crédito</option>
                <option value="cartao_debito">Cartão de débito</option>
                <option value="boleto">Boleto</option>
                <option value="outro">Outro</option>
              </select>

              <label>Data de entrega</label>
              <input
                type="date"
                value={pedido.delivery_date}
                onChange={(e) => atualizarPedido("delivery_date", e.target.value)}
                style={campoEstilo}
              />

              <label>Observações do pedido</label>
              <textarea
                value={pedido.notes}
                onChange={(e) => atualizarPedido("notes", e.target.value)}
                style={{ ...campoEstilo, minHeight: "90px" }}
                placeholder="Nome, tema, cor, detalhes da personalização, entrega..."
              />

              <button type="submit" disabled={salvando} style={botaoPrincipal}>
                {salvando ? "Salvando..." : pedidoEditandoId ? "Atualizar pedido" : "Cadastrar pedido"}
              </button>

              {pedidoEditandoId && (
                <button type="button" onClick={limparFormularioPedido} style={botaoSecundario}>
                  Cancelar edição
                </button>
              )}
            </form>

            <div style={{ marginTop: "30px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                <h2>Pedidos cadastrados</h2>

                <input
                  value={buscaPedido}
                  onChange={(e) => setBuscaPedido(e.target.value)}
                  style={{ ...campoEstilo, maxWidth: "380px", marginBottom: 0 }}
                  placeholder="Buscar por cliente, produto ou status"
                />
              </div>

              {pedidosFiltrados.length === 0 ? (
                <p>Nenhum pedido encontrado.</p>
              ) : (
                pedidosFiltrados.map((pedidoItem) => (
                  <div key={pedidoItem.id} style={pedidoCardCompleto}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                      <div>
                        <h3 style={{ margin: "0 0 8px" }}>{pedidoItem.product_name}</h3>
                        <p style={{ margin: "5px 0" }}>Cliente: <strong>{pedidoItem.client_name}</strong></p>
                        <p style={{ margin: "5px 0" }}>WhatsApp: {pedidoItem.client_whatsapp || "Não informado"}</p>
                        <p style={{ margin: "5px 0" }}>Quantidade: {pedidoItem.quantity || 1}</p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            display: "inline-block",
                            background: corStatusPedido(pedidoItem.order_status),
                            color: "#fff",
                            padding: "6px 12px",
                            borderRadius: "999px",
                            fontSize: "13px",
                            fontWeight: "bold",
                            marginBottom: "8px",
                          }}
                        >
                          {traduzirStatusPedido(pedidoItem.order_status)}
                        </span>

                        <p style={{ margin: "6px 0", fontWeight: "bold", color: "#e91e63" }}>
                          {formatarPreco(pedidoItem.total_value)}
                        </p>
                      </div>
                    </div>

                    <div style={pedidoResumoGrid}>
                      <div>
                        <strong>{formatarPreco(pedidoItem.signal_value)}</strong>
                        <span>Sinal pago</span>
                      </div>

                      <div>
                        <strong>{formatarPreco(pedidoItem.remaining_value)}</strong>
                        <span>Restante</span>
                      </div>

                      <div>
                        <strong>{traduzirStatusPagamento(pedidoItem.payment_status)}</strong>
                        <span>Pagamento</span>
                      </div>

                      <div>
                        <strong>{pedidoItem.delivery_date || "Sem data"}</strong>
                        <span>Entrega</span>
                      </div>
                    </div>

                    {pedidoItem.notes && (
                      <p style={{ margin: "12px 0 0", color: "#666" }}>Obs: {pedidoItem.notes}</p>
                    )}

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
                      <button onClick={() => abrirWhatsAppPedido(pedidoItem)} style={botaoWhatsapp}>
                        WhatsApp
                      </button>

                      <button onClick={() => editarPedido(pedidoItem)} style={botaoEditar}>
                        Editar
                      </button>

                      <button onClick={() => excluirPedido(pedidoItem.id)} style={botaoExcluir}>
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}


        {abaAtiva === "producao" && (
          <section>
            <h1>Produção</h1>
            <p>
              Acompanhe os pedidos por etapa. Agora dá para bater o olho e saber
              o que está esperando sinal, o que está em produção e o que já pode
              ser entregue.
            </p>

            <div style={resumoGrid}>
              <div style={resumoCard}>
                <strong>{totalPedidos}</strong>
                <span>Total de pedidos</span>
              </div>

              <div style={resumoCard}>
                <strong>{pedidosEmProducao}</strong>
                <span>Em produção</span>
              </div>

              <div style={resumoCard}>
                <strong>{pedidosProntos}</strong>
                <span>Prontos</span>
              </div>

              <div style={resumoCard}>
                <strong>{pedidosAtrasados}</strong>
                <span>Atrasados</span>
              </div>
            </div>

            <div style={kanbanContainer}>
              {statusKanban.map((status) => {
                const pedidosDaColuna = pedidosPorStatus(status.id);

                return (
                  <div key={status.id} style={kanbanColuna}>
                    <div
                      style={{
                        ...kanbanTitulo,
                        borderTop: `5px solid ${corStatusPedido(status.id)}`,
                      }}
                    >
                      <strong>{status.titulo}</strong>
                      <span>{pedidosDaColuna.length}</span>
                    </div>

                    {pedidosDaColuna.length === 0 ? (
                      <p style={{ color: "#777", fontSize: "14px" }}>
                        Nenhum pedido nesta etapa.
                      </p>
                    ) : (
                      pedidosDaColuna.map((pedidoItem) => (
                        <div
                          key={pedidoItem.id}
                          style={{
                            ...kanbanCard,
                            borderLeft: pedidoEstaAtrasado(pedidoItem)
                              ? "5px solid #d32f2f"
                              : `5px solid ${corStatusPedido(pedidoItem.order_status)}`,
                          }}
                        >
                          {pedidoEstaAtrasado(pedidoItem) && (
                            <span style={alertaAtraso}>Atrasado</span>
                          )}

                          <h4 style={{ margin: "0 0 8px" }}>
                            {pedidoItem.product_name}
                          </h4>

                          <p style={{ margin: "4px 0" }}>
                            Cliente: <strong>{pedidoItem.client_name}</strong>
                          </p>

                          <p style={{ margin: "4px 0" }}>
                            Valor: {formatarPreco(pedidoItem.total_value)}
                          </p>

                          <p style={{ margin: "4px 0" }}>
                            Entrega: {pedidoItem.delivery_date || "Sem data"}
                          </p>

                          <p style={{ margin: "4px 0" }}>
                            Pagamento: {traduzirStatusPagamento(pedidoItem.payment_status)}
                          </p>

                          {pedidoItem.notes && (
                            <p style={{ margin: "8px 0", color: "#666", fontSize: "13px" }}>
                              Obs: {pedidoItem.notes}
                            </p>
                          )}

                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
                            <button
                              onClick={() => voltarStatus(pedidoItem)}
                              style={botaoMini}
                              disabled={indiceStatus(pedidoItem.order_status) <= 0}
                            >
                              ← Voltar
                            </button>

                            <button
                              onClick={() => avancarStatus(pedidoItem)}
                              style={botaoMiniPrincipal}
                              disabled={indiceStatus(pedidoItem.order_status) >= statusKanban.length - 1}
                            >
                              Avançar →
                            </button>

                            <button
                              onClick={() => {
                                setAbaAtiva("pedidos");
                                editarPedido(pedidoItem);
                              }}
                              style={botaoMiniEditar}
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}


        {abaAtiva === "financeiro" && (
          <section>
            <h1>Financeiro</h1>
            <p>
              Resumo automático baseado nos pedidos cadastrados. Nada de somar sinal
              na calculadora como se fosse 1998.
            </p>

            <div style={resumoGrid}>
              <div style={resumoCard}>
                <strong>{formatarPreco(totalVendidoFinanceiro)}</strong>
                <span>Total vendido</span>
              </div>

              <div style={resumoCard}>
                <strong>{formatarPreco(totalRecebidoFinanceiro)}</strong>
                <span>Total recebido</span>
              </div>

              <div style={resumoCard}>
                <strong>{formatarPreco(totalAReceberFinanceiro)}</strong>
                <span>Total a receber</span>
              </div>

              <div style={resumoCard}>
                <strong>{pedidosFinanceirosPendentes.length}</strong>
                <span>Pagamentos pendentes</span>
              </div>
            </div>

            <div style={resumoGrid}>
              <div style={resumoCard}>
                <strong>{pedidosPagoTotal}</strong>
                <span>Pedidos pagos total</span>
              </div>

              <div style={resumoCard}>
                <strong>{pedidosSinalPago}</strong>
                <span>Pedidos com sinal</span>
              </div>

              <div style={resumoCard}>
                <strong>{pedidosNaoPagos}</strong>
                <span>Pedidos não pagos</span>
              </div>

              <div style={resumoCard}>
                <strong>{pedidosCancelados}</strong>
                <span>Pedidos cancelados</span>
              </div>
            </div>

            <div style={{ marginTop: "30px" }}>
              <h2>Pedidos com valores a receber</h2>

              {pedidosFinanceirosPendentes.length === 0 ? (
                <p>Nenhum valor pendente no momento.</p>
              ) : (
                pedidosFinanceirosPendentes.map((pedidoItem) => (
                  <div key={pedidoItem.id} style={pedidoCardCompleto}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                      <div>
                        <h3 style={{ margin: "0 0 8px" }}>{pedidoItem.product_name}</h3>
                        <p style={{ margin: "5px 0" }}>
                          Cliente: <strong>{pedidoItem.client_name}</strong>
                        </p>
                        <p style={{ margin: "5px 0" }}>
                          Pagamento: {traduzirStatusPagamento(pedidoItem.payment_status)}
                        </p>
                        <p style={{ margin: "5px 0" }}>
                          Forma: {traduzirFormaPagamento(pedidoItem.payment_method)}
                        </p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span
                          style={{
                            display: "inline-block",
                            background: corStatusPedido(pedidoItem.order_status),
                            color: "#fff",
                            padding: "6px 12px",
                            borderRadius: "999px",
                            fontSize: "13px",
                            fontWeight: "bold",
                            marginBottom: "8px",
                          }}
                        >
                          {traduzirStatusPedido(pedidoItem.order_status)}
                        </span>

                        <p style={{ margin: "6px 0", fontWeight: "bold", color: "#e91e63" }}>
                          A receber: {formatarPreco(valorAReceberPedido(pedidoItem))}
                        </p>
                      </div>
                    </div>

                    <div style={pedidoResumoGrid}>
                      <div>
                        <strong>{formatarPreco(obterValorPedido(pedidoItem))}</strong>
                        <span>Valor total</span>
                      </div>

                      <div>
                        <strong>{formatarPreco(valorRecebidoPedido(pedidoItem))}</strong>
                        <span>Recebido</span>
                      </div>

                      <div>
                        <strong>{formatarPreco(valorAReceberPedido(pedidoItem))}</strong>
                        <span>Restante</span>
                      </div>

                      <div>
                        <strong>{pedidoItem.delivery_date || "Sem data"}</strong>
                        <span>Entrega</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
                      <button onClick={() => abrirWhatsAppPedido(pedidoItem)} style={botaoWhatsapp}>
                        Cobrar no WhatsApp
                      </button>

                      <button onClick={() => {
                        setAbaAtiva("pedidos");
                        editarPedido(pedidoItem);
                      }} style={botaoEditar}>
                        Editar pedido
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {abaAtiva === "avaliacoes" && (
          <section>
            <h1>Avaliações</h1>
            <p>Cadastre e gerencie depoimentos reais dos seus clientes.</p>

            <div style={cardEstilo}>
              <h2>Módulo de Avaliações</h2>
              <p>Próxima fase: nome do cliente, produto, nota e comentário.</p>
            </div>
          </section>
        )}

        {abaAtiva === "configuracoes" && (
          <section>
            <h1>Configurações</h1>
            <p>Edite as informações gerais da sua loja.</p>

            <div style={cardEstilo}>
              <h2>Configurações da loja</h2>
              <p>Próxima fase: WhatsApp, Instagram, nome da loja, subtítulo e mensagem padrão.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const menuBotao = {
  width: "100%",
  display: "block",
  padding: "12px",
  marginBottom: "8px",
  border: "none",
  borderRadius: "12px",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "15px",
  color: "#444",
};

const menuAtivo = {
  ...menuBotao,
  background: "#fce4ec",
  color: "#e91e63",
  fontWeight: "bold",
};

const cardEstilo = {
  background: "#fff",
  padding: "24px",
  borderRadius: "18px",
  boxShadow: "0 5px 20px rgba(0,0,0,0.10)",
  marginTop: "20px",
  maxWidth: "760px",
};

const campoEstilo = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  marginBottom: "14px",
  boxSizing: "border-box",
  display: "block",
};

const resumoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  margin: "24px 0",
};

const resumoCard = {
  background: "#fff",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const botaoPrincipal = {
  width: "100%",
  padding: "15px",
  background: "#e91e63",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "16px",
};

const botaoSecundario = {
  width: "100%",
  padding: "13px",
  background: "#fff",
  color: "#e91e63",
  border: "1px solid #e91e63",
  borderRadius: "12px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "15px",
  marginTop: "10px",
};

const clienteCardCompleto = {
  background: "#fff",
  padding: "20px",
  borderRadius: "16px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  marginBottom: "16px",
};

const clienteInfoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "8px",
  color: "#555",
  fontSize: "14px",
};

const clienteResumoBox = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginTop: "16px",
  background: "#fff7fb",
  border: "1px solid #f8bbd0",
  borderRadius: "14px",
  padding: "14px",
};

const botaoWhatsapp = {
  padding: "10px 12px",
  background: "#25D366",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botaoEditar = {
  padding: "10px 12px",
  background: "#fff",
  color: "#e91e63",
  border: "1px solid #e91e63",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const botaoExcluir = {
  padding: "10px 12px",
  background: "#fff",
  color: "#d32f2f",
  border: "1px solid #d32f2f",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};


const pedidoCardCompleto = {
  background: "#fff",
  padding: "20px",
  borderRadius: "16px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  marginBottom: "16px",
};

const pedidoResumoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "12px",
  marginTop: "16px",
  background: "#fff7fb",
  border: "1px solid #f8bbd0",
  borderRadius: "14px",
  padding: "14px",
};


const kanbanContainer = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(240px, 1fr))",
  gap: "16px",
  overflowX: "auto",
  paddingBottom: "16px",
};

const kanbanColuna = {
  background: "#fff",
  borderRadius: "16px",
  padding: "14px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  minHeight: "420px",
};

const kanbanTitulo = {
  background: "#fafafa",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const kanbanCard = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: "14px",
  padding: "14px",
  marginBottom: "12px",
  boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
};

const alertaAtraso = {
  display: "inline-block",
  background: "#ffebee",
  color: "#d32f2f",
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
  marginBottom: "8px",
};

const botaoMini = {
  padding: "8px 10px",
  border: "1px solid #ddd",
  borderRadius: "9px",
  background: "#fff",
  color: "#444",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "12px",
};

const botaoMiniPrincipal = {
  ...botaoMini,
  background: "#e91e63",
  color: "#fff",
  border: "1px solid #e91e63",
};

const botaoMiniEditar = {
  ...botaoMini,
  color: "#e91e63",
  border: "1px solid #e91e63",
};


export default Admin;
