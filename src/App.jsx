import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";

import Loja from "./pages/Loja";
import Admin from "./Admin";
import AdminLogin from "./components/AdminLogin";
import { auth } from "./firebase/config";

function App() {
  const params = new URLSearchParams(window.location.search);
  const adminAtivo = params.get("admin") === "true";

  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const sairMonitoramento = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregando(false);
    });

    return () => sairMonitoramento();
  }, []);

  if (!adminAtivo) {
    return <Loja />;
  }

  if (carregando) {
    return <div style={{ padding: 40 }}>Carregando painel...</div>;
  }

  if (!usuario) {
    return <AdminLogin />;
  }

  return (
    <>
      <button
        onClick={() => signOut(auth)}
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

      <Admin />
    </>
  );
}

export default App;