import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase/config";

import Produtos from "./pages/Produtos";
import Orcamentos from "./pages/Orcamentos";
import Clientes from "./pages/Clientes";
import Pedidos from "./pages/Pedidos";
import Producao from "./pages/Producao";
import Financeiro from "./pages/Financeiro";
import Avaliacoes from "./pages/Avaliacoes";
import Configuracoes from "./pages/Configuracoes";
import Loja from "./pages/Loja";

export default function Admin() {
  const [abaAtiva, setAbaAtiva] = useState("dashboard");

  const menu = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "produtos", label: "Produtos", icon: "📦" },
    { id: "orcamentos", label: "Orçamentos", icon: "📝" },
    { id: "clientes", label: "Clientes", icon: "👥" },
    { id: "pedidos", label: "Pedidos", icon: "🧾" },
    { id: "producao", label: "Produção", icon: "🏭" },
    { id: "financeiro", label: "Financeiro", icon: "💰" },
    { id: "avaliacoes", label: "Avaliações", icon: "⭐" },
    { id: "configuracoes", label: "Configurações", icon: "⚙️" },
  ];

  function abrirLojaPublica() {
    setAbaAtiva("loja");
  }

  return (
    <div style={layout}>
      <aside style={sidebar}>
        <h1 style={logo}>NM Admin</h1>

        <nav style={nav}>
          {menu.map((item) => (
            <button
              key={item.id}
              onClick={() => setAbaAtiva(item.id)}
              style={{
                ...menuButton,
                ...(abaAtiva === item.id ? menuButtonAtivo : {}),
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button onClick={abrirLojaPublica} style={verLoja}>
          ← Ver loja
        </button>
      </aside>

      <main style={conteudo}>
        {abaAtiva === "dashboard" && (
          <Dashboard
            abrirLojaPublica={abrirLojaPublica}
            irParaAba={setAbaAtiva}
          />
        )}

        {abaAtiva === "produtos" && <Produtos />}
        {abaAtiva === "orcamentos" && <Orcamentos />}
        {abaAtiva === "clientes" && <Clientes />}
        {abaAtiva === "pedidos" && <Pedidos />}
        {abaAtiva === "producao" && <Producao />}
        {abaAtiva === "financeiro" && <Financeiro />}
        {abaAtiva === "avaliacoes" && <Avaliacoes />}
        {abaAtiva === "configuracoes" && <Configuracoes />}
        {abaAtiva === "loja" && <Loja />}
      </main>
    </div>
  );
}

function Dashboard({ abrirLojaPublica, irParaAba }) {
  const [carregando, setCarregando] = useState(true);
  const [dados, setDados] = useState({
    produtos: 0,
    orcamentos: 0,
    clientes: 0,
    pedidos: 0,
    producao: 0,
    financeiro: 0,
    avaliacoes: 0,
    valorOrcado: 0,
    valorPedidos: 0,
    recebido: 0,
    aReceber: 0,
  });

  useEffect(() => {
    carregarDashboard();
  }, []);

  async function carregarDashboard() {
    try {
      setCarregando(true);

      const [
        produtosSnap,
        orcamentosSnap,
        clientesSnap,
        pedidosSnap,
        reviewsSnap,
        paymentsSnap,
      ] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "quotes")),
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "reviews")),
        getDocs(collection(db, "payments")).catch(() => ({ docs: [] })),
      ]);

      const produtos = produtosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const orcamentos = orcamentosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const clientes = clientesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const pedidos = pedidosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const reviews = reviewsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const payments = paymentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const valorOrcado = orcamentos.reduce(
        (total, item) => total + Number(item.total_value || item.total || item.value || 0),
        0
      );

      const valorPedidos = pedidos.reduce(
        (total, item) => total + Number(item.total_value || item.total || item.value || 0),
        0
      );

      const recebidoPorPayments = payments.reduce((total, item) => {
        const status = String(item.status || "").toLowerCase();
        if (status.includes("recebido") || status.includes("pago")) {
          return total + Number(item.value || item.total_value || 0);
        }
        return total;
      }, 0);

      const recebidoPorPedidos = pedidos.reduce((total, item) => {
        const status = String(item.payment_status || "").toLowerCase();
        if (status.includes("pago") || status.includes("recebido")) {
          return total + Number(item.total_value || item.total || item.value || 0);
        }
        return total;
      }, 0);

      const recebido = recebidoPorPayments || recebidoPorPedidos;
      const aReceber = Math.max(valorPedidos - recebido, 0);

      const emProducao = pedidos.filter((item) => {
        const status = String(item.order_status || item.status || "").toLowerCase();
        return (
          status.includes("produção") ||
          status.includes("producao") ||
          status.includes("confirmado") ||
          status.includes("pronto") ||
          status.includes("aguardando")
        );
      }).length;

      setDados({
        produtos: produtos.length,
        orcamentos: orcamentos.length,
        clientes: clientes.length,
        pedidos: pedidos.length,
        producao: emProducao || pedidos.length,
        financeiro: recebido,
        avaliacoes: reviews.length,
        valorOrcado,
        valorPedidos,
        recebido,
        aReceber,
      });
    } catch (erro) {
      console.error("Erro ao carregar dashboard:", erro);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={dashboard}>
      <section style={hero}>
        <div style={badge}>Painel NM Serviços</div>

        <h2 style={heroTitulo}>Dashboard Executivo</h2>

        <p style={heroTexto}>
          Acompanhe sua operação, gerencie produtos, orçamentos, clientes, pedidos,
          produção e financeiro em um só lugar.
        </p>

        <button onClick={abrirLojaPublica} style={botaoLoja}>
          Abrir loja pública
        </button>
      </section>

      <section style={cardsGrid}>
        <DashboardCard
          icon="📦"
          title="Produtos"
          value={carregando ? "..." : dados.produtos}
          text="Itens cadastrados na vitrine."
          onClick={() => irParaAba("produtos")}
        />

        <DashboardCard
          icon="📝"
          title="Orçamentos"
          value={carregando ? "..." : dados.orcamentos}
          text={`Total orçado: ${formatarMoeda(dados.valorOrcado)}`}
          onClick={() => irParaAba("orcamentos")}
        />

        <DashboardCard
          icon="👥"
          title="Clientes"
          value={carregando ? "..." : dados.clientes}
          text="Clientes cadastrados no Admin."
          onClick={() => irParaAba("clientes")}
        />

        <DashboardCard
          icon="🧾"
          title="Pedidos"
          value={carregando ? "..." : dados.pedidos}
          text={`Total em pedidos: ${formatarMoeda(dados.valorPedidos)}`}
          onClick={() => irParaAba("pedidos")}
        />

        <DashboardCard
          icon="🏭"
          title="Produção"
          value={carregando ? "..." : dados.producao}
          text="Pedidos no fluxo operacional."
          onClick={() => irParaAba("producao")}
        />

        <DashboardCard
          icon="💰"
          title="Recebido"
          value={carregando ? "..." : formatarMoeda(dados.recebido)}
          text={`A receber: ${formatarMoeda(dados.aReceber)}`}
          onClick={() => irParaAba("financeiro")}
        />

        <DashboardCard
          icon="⭐"
          title="Avaliações"
          value={carregando ? "..." : dados.avaliacoes}
          text="Depoimentos cadastrados."
          onClick={() => irParaAba("avaliacoes")}
        />

        <DashboardCard
          icon="⚙️"
          title="Configurações"
          value="Loja"
          text="Logo, banner, WhatsApp e cores."
          onClick={() => irParaAba("configuracoes")}
        />
      </section>

      <section style={fluxoBox}>
        <h3>Fluxo inteligente da NM</h3>

        <div style={fluxoGrid}>
          <FluxoItem numero="1" titulo="Cliente acessa a loja" />
          <FluxoItem numero="2" titulo="Preenche o orçamento" />
          <FluxoItem numero="3" titulo="Vira cliente no Admin" />
          <FluxoItem numero="4" titulo="Você converte em pedido" />
        </div>
      </section>
    </div>
  );
}

function DashboardCard({ icon, title, value, text, onClick }) {
  return (
    <button style={card} onClick={onClick}>
      <div style={cardIcon}>{icon}</div>
      <strong style={cardValue}>{value}</strong>
      <h3>{title}</h3>
      <p>{text}</p>
      <span style={cardAction}>Abrir módulo →</span>
    </button>
  );
}

function FluxoItem({ numero, titulo }) {
  return (
    <div style={fluxoItem}>
      <strong>{numero}</strong>
      <span>{titulo}</span>
    </div>
  );
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const layout = {
  display: "grid",
  gridTemplateColumns: "220px minmax(0, 1fr)",
  minHeight: "100vh",
  width: "100%",
  maxWidth: "100vw",
  background: "#fff8fb",
  color: "#1f1f29",
  fontFamily: "Inter, Arial, sans-serif",
  overflowX: "hidden",
};

const sidebar = {
  width: "220px",
  minWidth: "220px",
  background: "#fff",
  borderRight: "1px solid #f4cfe0",
  padding: "24px 18px",
  boxSizing: "border-box",
  position: "sticky",
  left: 0,
  top: 0,
  height: "100vh",
  overflowY: "auto",
  overflowX: "hidden",
  zIndex: 30,
};

const logo = {
  color: "#ec1971",
  fontSize: "24px",
  margin: "0 0 26px",
  lineHeight: "1.1",
};

const nav = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const menuButton = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#282833",
  padding: "13px 14px",
  borderRadius: "13px",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: "700",
  display: "flex",
  gap: "10px",
  alignItems: "center",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
};

const menuButtonAtivo = {
  background: "#fde1ec",
  color: "#ec1971",
  fontWeight: "900",
};

const verLoja = {
  marginTop: "34px",
  border: "none",
  background: "transparent",
  color: "#ec1971",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
  padding: "10px 12px",
};

const conteudo = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "100vh",
  padding: "28px 32px 42px",
  boxSizing: "border-box",
  background: "#fff8fb",
  overflowX: "hidden",
};

const dashboard = {
  width: "100%",
  maxWidth: "1120px",
  margin: "0 auto",
  minWidth: 0,
};

const hero = {
  background: "linear-gradient(135deg, #ec1971, #8b1fb2, #07313f)",
  color: "#fff",
  borderRadius: "26px",
  padding: "34px 28px",
  textAlign: "center",
  boxShadow: "0 16px 40px rgba(236,25,113,0.16)",
  overflow: "hidden",
};

const badge = {
  display: "inline-block",
  background: "rgba(255,255,255,0.18)",
  padding: "9px 18px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "16px",
  marginBottom: "14px",
};

const heroTitulo = {
  fontSize: "34px",
  margin: "0 0 10px",
  lineHeight: "1.1",
};

const heroTexto = {
  fontSize: "17px",
  lineHeight: "1.45",
  maxWidth: "760px",
  margin: "0 auto 22px",
};

const botaoLoja = {
  border: "none",
  background: "#fff",
  color: "#ec1971",
  padding: "13px 24px",
  borderRadius: "14px",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "16px",
  marginTop: "26px",
  width: "100%",
  minWidth: 0,
};

const card = {
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "18px",
  padding: "20px 18px",
  textAlign: "center",
  boxShadow: "0 10px 24px rgba(236,25,113,0.07)",
  cursor: "pointer",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  color: "#1f1f29",
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
};

const cardIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  background: "#fff1f7",
  display: "grid",
  placeItems: "center",
  margin: "0 auto 12px",
  fontSize: "22px",
};

const cardValue = {
  display: "block",
  fontSize: "24px",
  color: "#ec1971",
  marginBottom: "7px",
  fontWeight: "950",
  overflowWrap: "anywhere",
};

const cardAction = {
  display: "inline-block",
  color: "#ec1971",
  fontWeight: "900",
  marginTop: "10px",
  fontSize: "12px",
};

const fluxoBox = {
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "20px",
  padding: "24px",
  marginTop: "26px",
  boxShadow: "0 10px 24px rgba(236,25,113,0.06)",
  minWidth: 0,
};

const fluxoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginTop: "18px",
};

const fluxoItem = {
  background: "#fff1f7",
  border: "1px solid #f4cfe0",
  borderRadius: "16px",
  padding: "15px",
  display: "flex",
  gap: "10px",
  alignItems: "center",
  minWidth: 0,
};
