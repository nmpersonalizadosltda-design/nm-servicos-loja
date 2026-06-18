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

const clienteInicial = {
  name: "",
  whatsapp: "",
  instagram: "",
  city: "",
  address: "",
  birthday: "",
  notes: "",
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [cliente, setCliente] = useState(clienteInicial);
  const [clienteEditandoId, setClienteEditandoId] = useState(null);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarClientes();
    carregarPedidos();
  }, []);

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

    setPedidos(lista);
  }

  function atualizarCliente(campo, valor) {
    setCliente((prev) => ({
      ...prev,
      [campo]: valor,
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
    return (
      pedido.created_at ||
      pedido.order_date ||
      pedido.data_pedido ||
      pedido.delivery_date ||
      null
    );
  }

  function formatarData(valor) {
    if (!valor) return "Sem pedidos";

    try {
      if (valor?.toDate) return valor.toDate().toLocaleDateString("pt-BR");

      const data = new Date(valor);
      if (Number.isNaN(data.getTime())) return "Sem pedidos";

      return data.toLocaleDateString("pt-BR");
    } catch {
      return "Sem pedidos";
    }
  }

  function formatarDataNascimento(valor) {
    if (!valor) return "";

    try {
      const partes = String(valor).split("-");

      if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
      }

      return String(valor);
    } catch {
      return String(valor || "");
    }
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
      ultimoPedido: pedidosOrdenados[0]
        ? formatarData(obterDataPedido(pedidosOrdenados[0]))
        : "Sem pedidos",
    };
  }

  const clientesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    if (!termo) return clientes;

    return clientes.filter((clienteItem) =>
      String(clienteItem.name || "").toLowerCase().includes(termo) ||
      String(clienteItem.whatsapp || "").toLowerCase().includes(termo) ||
      String(clienteItem.instagram || "").toLowerCase().includes(termo) ||
      String(clienteItem.city || "").toLowerCase().includes(termo) ||
      String(clienteItem.birthday || "").toLowerCase().includes(termo)
    );
  }, [clientes, busca]);

  const totalClientes = clientes.length;
  const clientesComPedido = clientes.filter(
    (clienteItem) => pedidosDoCliente(clienteItem).length > 0
  ).length;
  const totalGeralClientes = clientes.reduce(
    (total, clienteItem) => total + resumoCliente(clienteItem).totalGasto,
    0
  );

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

      fecharModal();
      carregarClientes();
    } catch (erro) {
      console.error(erro);
      alert("Erro ao salvar cliente.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalNovoCliente() {
    setClienteEditandoId(null);
    setCliente({ ...clienteInicial });
    setModalAberto(true);
  }

  function editarCliente(clienteSelecionado) {
    setClienteEditandoId(clienteSelecionado.id);
    setCliente({
      name: clienteSelecionado.name || "",
      whatsapp: clienteSelecionado.whatsapp || "",
      instagram: clienteSelecionado.instagram || "",
      city: clienteSelecionado.city || "",
      address: clienteSelecionado.address || "",
      birthday: clienteSelecionado.birthday || "",
      notes: clienteSelecionado.notes || "",
    });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setClienteEditandoId(null);
    setCliente({ ...clienteInicial });
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

  function abrirWhatsApp(numero) {
    const numeroLimpo = limparNumero(numero);

    if (!numeroLimpo) {
      alert("Este cliente não tem WhatsApp cadastrado.");
      return;
    }

    window.open(`https://wa.me/55${numeroLimpo}`, "_blank");
  }

  return (
    <div style={pageContainer}>
      <div style={pageHeader}>
        <div>
          <span style={sectionTag}>RELACIONAMENTO</span>
          <h1 style={pageTitle}>Clientes</h1>
          <p style={pageDescription}>
            Cadastre, acompanhe histórico e veja quem já comprou da NM Serviços.
          </p>
        </div>

        <button type="button" onClick={abrirModalNovoCliente} style={btnPrimary}>
          + Novo Cliente
        </button>
      </div>

   <div style={resumoGrid}>

  <div style={resumoCard}>
    <div style={{ fontSize: "24px" }}>👥</div>
    <strong style={{ fontSize: "24px" }}>{totalClientes}</strong>
    <span>Clientes cadastrados</span>
  </div>

  <div style={resumoCard}>
    <div style={{ fontSize: "24px" }}>🛍️</div>
    <strong style={{ fontSize: "24px" }}>{clientesComPedido}</strong>
    <span>Clientes com pedidos</span>
  </div>

  <div style={resumoCard}>
    <div style={{ fontSize: "24px" }}>💰</div>
    <strong style={{ fontSize: "24px" }}>
      {formatarPreco(totalGeralClientes)}
    </strong>
    <span>Total vendido</span>
  </div>

</div>

      <div style={cardBase}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, WhatsApp, Instagram ou cidade..."
          style={inputStyle}
        />
      </div>

      <div style={listaTopo}>
        <div>
          <h2 style={{ margin: 0 }}>Clientes cadastrados</h2>          <p style={{ margin: "6px 0 0", color: "#666" }}>
            {clientesFiltrados.length} cliente(s) encontrado(s)
          </p>
        </div>
      </div>

      {clientesFiltrados.length === 0 ? (
  <div style={cardBase}>
    <p>Nenhum cliente encontrado.</p>
  </div>
) : (
  <div style={tabelaContainer}>
    <table style={tabela}>
      <thead>
        <tr>
          <th style={th}>Cliente</th>
          <th style={th}>WhatsApp</th>
          <th style={th}>Nascimento</th>
          <th style={th}>Pedidos</th>
          <th style={th}>Total gasto</th>
          <th style={th}>Último pedido</th>
          <th style={th}>Status</th>
          <th style={th}>Ações</th>
        </tr>
      </thead>

      <tbody>
        {clientesFiltrados.map((clienteItem) => {
          const resumo = resumoCliente(clienteItem);

          return (
            <tr key={clienteItem.id} style={tr}>
              <td style={td}>
                <strong>{clienteItem.name}</strong>
              </td>

              <td style={td}>
                {clienteItem.whatsapp || "-"}
              </td>

              <td style={td}>
                {clienteItem.birthday ? formatarDataNascimento(clienteItem.birthday) : "-"}
              </td>

              <td style={td}>
                {resumo.totalPedidos}
              </td>

              <td style={td}>
                {formatarPreco(resumo.totalGasto)}
              </td>

              <td style={td}>
                {resumo.ultimoPedido}
              </td>

              <td style={td}>
                <span
                  style={
                    resumo.totalPedidos > 0
                      ? badgeClienteAtivo
                      : badgeClienteNeutro
                  }
                >
                  {resumo.totalPedidos > 0
                    ? "Ativo"
                    : "Sem pedidos"}
                </span>
              </td>

              <td style={td}>
                <div style={acoesTabela}>
                  <button
                    type="button"
                    onClick={() => abrirWhatsApp(clienteItem.whatsapp)}
                    style={botaoWhatsappMini}
                  >
                    💬
                  </button>

                  <button
                    type="button"
                    onClick={() => editarCliente(clienteItem)}
                    style={botaoEditarMini}
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    onClick={() => excluirCliente(clienteItem.id)}
                    style={botaoExcluirMini}
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
)}
      {modalAberto && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={modalHeader}>
              <div>
                <div style={modalTag}>
                  👤 {clienteEditandoId ? "EDITANDO CLIENTE" : "NOVO CLIENTE"}
                </div>

                <h2 style={modalTitle}>
                  {clienteEditandoId ? "Editar cliente" : "Cadastrar novo cliente"}
                </h2>

                <p style={modalSubtitle}>
                  Registre informações, histórico de compras, observações e dados de contato.
                </p>
              </div>

              <button type="button" onClick={fecharModal} style={modalClose}>
                ✕
              </button>
            </div>

            <form onSubmit={salvarCliente}>
              <div style={modalBody}>
                <div style={campoModal}>
                  <label>Nome do cliente</label>
                  <input
                    value={cliente.name}
                    onChange={(e) => atualizarCliente("name", e.target.value)}
                    placeholder="Ex: Vanessa"
                    style={inputStyle}
                  />
                </div>

                <div style={campoModal}>
                  <label>WhatsApp</label>
                  <input
                    value={cliente.whatsapp}
                    onChange={(e) => atualizarCliente("whatsapp", e.target.value)}
                    placeholder="11999999999"
                    style={inputStyle}
                  />
                </div>

                <div style={campoModal}>
                  <label>Instagram</label>
                  <input
                    value={cliente.instagram}
                    onChange={(e) => atualizarCliente("instagram", e.target.value)}
                    placeholder="@cliente"
                    style={inputStyle}
                  />
                </div>

                <div style={campoModal}>
                  <label>Cidade</label>
                  <input
                    value={cliente.city}
                    onChange={(e) => atualizarCliente("city", e.target.value)}
                    placeholder="São Paulo/SP"
                    style={inputStyle}
                  />
                </div>

                <div style={campoModal}>
                  <label>Data de nascimento (opcional)</label>
                  <input
                    type="date"
                    value={cliente.birthday}
                    onChange={(e) => atualizarCliente("birthday", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={campoModalGrande}>
                  <label>Endereço</label>
                  <textarea
                    value={cliente.address}
                    onChange={(e) => atualizarCliente("address", e.target.value)}
                    placeholder="Endereço completo, se necessário"
                    style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                  />
                </div>

                <div style={campoModalGrande}>
                  <label>Observações</label>
                  <textarea
                    value={cliente.notes}
                    onChange={(e) => atualizarCliente("notes", e.target.value)}
                    placeholder="Preferências, histórico, detalhes importantes..."
                    style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
                  />
                </div>
              </div>

              <div style={modalFooter}>
                <button type="button" onClick={fecharModal} style={btnSecondary}>
                  Cancelar
                </button>

                <button type="submit" disabled={salvando} style={btnPrimary}>
                  {salvando
                    ? "Salvando..."
                    : clienteEditandoId
                    ? "Atualizar cliente"
                    : "Salvar cliente"}
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

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "70px",
  paddingBottom: "30px",
  borderBottom: "1px solid #F8D9E8",
};

const pageTitle = {
  margin: "14px 0 12px",
  color: "#222",
  fontSize: "58px",
  fontWeight: "800",
  lineHeight: "1",
};

const pageDescription = {
  margin: "0",
  color: "#666",
  fontSize: "18px",
  lineHeight: "1.6",
  maxWidth: "700px",
};

const sectionTag = {
  display: "inline-block",
  color: "#ec1971",
  background: "#fff0f6",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.04em",
};

const resumoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px",
  marginBottom: "30px",
};

const resumoCard = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "20px",
  padding: "14px",
  boxShadow: "0 8px 25px rgba(236, 28, 104, 0.05)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
};

const cardBase = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "24px",
  padding: "22px",
  boxShadow: "0 15px 40px rgba(236, 28, 104, 0.08)",
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

const listaTopo = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  margin: "22px 0 16px",
  flexWrap: "wrap",
};

const clientesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "18px",
};

const clienteCard = {
  background: "#ffffff",
  border: "1px solid #F3D7E5",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 15px 40px rgba(236, 28, 104, 0.08)",
  minWidth: 0,
};

const clienteCardHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const textoCinza = {
  margin: "4px 0",
  color: "#666",
  overflowWrap: "anywhere",
};

const badgeClienteAtivo = {
  background: "#DCFCE7",
  color: "#166534",
  borderRadius: "999px",
  padding: "7px 12px",
  fontSize: "12px",
  fontWeight: 800,
};

const badgeClienteNeutro = {
  background: "#FCE7F3",
  color: "#ec1971",
  borderRadius: "999px",
  padding: "7px 12px",
  fontSize: "12px",
  fontWeight: 800,
};

const clienteResumoVertical = {
  display: "grid",
  gap: "10px",
  marginTop: "18px",
};

const resumoLinhaCliente = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  borderRadius: "16px",
  background: "#fff8fb",
  border: "1px solid #F3D7E5",
};

const clienteDetalhes = {
  marginTop: "14px",
  padding: "14px",
  borderRadius: "18px",
  background: "#fff8fb",
  color: "#555",
  overflowWrap: "anywhere",
  border: "1px solid #F3D7E5",
};

const acoesLinha = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const botaoBase = {
  border: "none",
  padding: "10px 14px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: 700,
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

const botaoExcluir = {
  ...botaoBase,
  background: "#fee2e2",
  color: "#b91c1c",
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
  fontSize: "48px",
  fontWeight: "800",
  color: "#111827",
  lineHeight: "1.1",
};

const modalSubtitle = {
  marginTop: "16px",
  marginBottom: 0,
  color: "#6B7280",
  fontSize: "18px",
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
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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

const tabelaContainer = {
  overflowX: "auto",
  width: "100%",
  borderRadius: "24px",
};

const tabela = {
  width: "100%",
  minWidth: "1200px",
  borderCollapse: "collapse",
};

const th = {
  padding: "16px 20px",
  textAlign: "left",
  background: "#FFF5FA",
  color: "#EC1971",
  fontSize: "14px",
  fontWeight: "700",
  borderBottom: "1px solid #F3D7E5",
};

const td = {
  padding: "16px 20px",
  borderBottom: "1px solid #F8E7EF",
  color: "#333",
  background: "#ffffff",
};
const tr = {
  background: "#fff",
};

const acoesTabela = {
  display: "flex",
  gap: "8px",
};

const botaoWhatsappMini = {
  border: "none",
  background: "#25D366",
  color: "#fff",
  borderRadius: "10px",
  width: "36px",
  height: "36px",
  cursor: "pointer",
};

const botaoEditarMini = {
  border: "none",
  background: "#FFF0F6",
  color: "#EC1971",
  borderRadius: "10px",
  width: "36px",
  height: "36px",
  cursor: "pointer",
};

const botaoExcluirMini = {
  border: "none",
  background: "#FEE2E2",
  color: "#DC2626",
  borderRadius: "10px",
  width: "36px",
  height: "36px",
  cursor: "pointer",
};