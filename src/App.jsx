import { Suspense, lazy, useEffect, useState } from "react";

const Loja = lazy(() => import("./pages/Loja"));
const Admin = lazy(() => import("./Admin"));
const AdminLogin = lazy(() => import("./components/AdminLogin"));

function TelaCarregando({ texto = "Carregando..." }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#fff1f7",
        color: "#8b1747",
        fontFamily: "Inter, Arial, sans-serif",
        fontWeight: 900,
      }}
    >
      {texto}
    </div>
  );
}

function App() {
  const params = new URLSearchParams(window.location.search);

  const adminAtivo =
    params.get("admin") === "true" ||
    window.location.pathname.startsWith("/admin");

  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(adminAtivo);

  useEffect(() => {
    if (!adminAtivo) {
      setCarregando(false);
      return;
    }

    let ativo = true;
    let sairMonitoramento = null;

    async function iniciarMonitoramentoAdmin() {
      try {
        const [{ onAuthStateChanged }, { auth }] = await Promise.all([
          import("firebase/auth"),
          import("./firebase/config"),
        ]);

        if (!ativo) return;

        sairMonitoramento = onAuthStateChanged(auth, (user) => {
          if (!ativo) return;

          setUsuario(user);
          setCarregando(false);
        });
      } catch (erro) {
        console.error("Erro ao carregar autenticação do admin:", erro);

        if (ativo) {
          setCarregando(false);
        }
      }
    }

    iniciarMonitoramentoAdmin();

    return () => {
      ativo = false;

      if (sairMonitoramento) {
        sairMonitoramento();
      }
    };
  }, [adminAtivo]);

  async function sairAdmin() {
    try {
      const [{ signOut }, { auth }] = await Promise.all([
        import("firebase/auth"),
        import("./firebase/config"),
      ]);

      await signOut(auth);
    } catch (erro) {
      console.error("Erro ao sair do admin:", erro);
    }
  }

  if (!adminAtivo) {
    return (
      <Suspense fallback={<TelaCarregando texto="Abrindo loja..." />}>
        <Loja />
      </Suspense>
    );
  }

  if (carregando) {
    return <TelaCarregando texto="Carregando painel..." />;
  }

  if (!usuario) {
    return (
      <Suspense fallback={<TelaCarregando texto="Abrindo login..." />}>
        <AdminLogin />
      </Suspense>
    );
  }

  return (
    <>
      <button
        onClick={sairAdmin}
        style={{
          position: "fixed",
          right: 24,
          top: 24,
          zIndex: 9999,
          border: "none",
          background: "#ec1971",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: "999px",
          fontWeight: "900",
          cursor: "pointer",
        }}
      >
        Sair
      </button>

      <Suspense fallback={<TelaCarregando texto="Carregando admin..." />}>
        <Admin />
      </Suspense>
    </>
  );
}

export default App;