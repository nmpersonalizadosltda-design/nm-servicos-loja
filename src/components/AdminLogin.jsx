import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
      setErro("E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={tela}>
      <form onSubmit={entrar} style={card}>
        <div style={badge}>🔒 ACESSO RESTRITO</div>
        <h1 style={titulo}>NM Admin</h1>
        <p style={texto}>Entre para gerenciar produtos, pedidos, produção e financeiro.</p>

        <label style={label}>E-mail</label>
        <input
          style={input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seuemail@gmail.com"
          required
        />

        <label style={label}>Senha</label>
        <input
          style={input}
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Digite sua senha"
          required
        />

        {erro && <p style={erroStyle}>{erro}</p>}

        <button type="submit" style={botao} disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar no painel"}
        </button>
      </form>
    </div>
  );
}

const tela = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#fff8fb",
  fontFamily: "Inter, Arial, sans-serif",
};

const card = {
  width: "100%",
  maxWidth: "420px",
  background: "#fff",
  border: "1px solid #f4cfe0",
  borderRadius: "28px",
  padding: "36px",
  boxShadow: "0 20px 50px rgba(236,25,113,0.14)",
};

const badge = {
  display: "inline-block",
  background: "#fde1ec",
  color: "#ec1971",
  padding: "10px 18px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
  marginBottom: "18px",
};

const titulo = {
  fontSize: "36px",
  margin: "0 0 8px",
  color: "#1f1f29",
};

const texto = {
  color: "#6f5b66",
  marginBottom: "26px",
  lineHeight: "1.5",
};

const label = {
  display: "block",
  fontWeight: "800",
  marginBottom: "8px",
  color: "#1f1f29",
};

const input = {
  width: "100%",
  padding: "15px",
  borderRadius: "14px",
  border: "1px solid #f4cfe0",
  marginBottom: "18px",
  fontSize: "15px",
  boxSizing: "border-box",
};

const botao = {
  width: "100%",
  border: "none",
  background: "#ec1971",
  color: "#fff",
  padding: "15px",
  borderRadius: "14px",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
};

const erroStyle = {
  color: "#d60000",
  background: "#fff1f1",
  padding: "10px",
  borderRadius: "10px",
  fontWeight: "700",
};