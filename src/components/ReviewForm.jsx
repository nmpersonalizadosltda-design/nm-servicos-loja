import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase/config";

export default function ReviewForm({ corPrincipal = "#EC1971" }) {
  const [salvando, setSalvando] = useState(false);

  const [dados, setDados] = useState({
    name: "",
    product: "",
    rating: "5",
    comment: "",
  });

  function atualizar(campo, valor) {
    setDados((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  async function enviarAvaliacao(e) {
    e.preventDefault();

    if (!dados.name.trim()) {
      alert("Preencha seu nome.");
      return;
    }

    if (!dados.product.trim()) {
      alert("Informe o produto comprado.");
      return;
    }

    if (!dados.comment.trim()) {
      alert("Escreva sua avaliação.");
      return;
    }

    setSalvando(true);

    try {
      await addDoc(collection(db, "reviews"), {
        name: dados.name.trim(),
        product: dados.product.trim(),
        rating: Number(dados.rating),
        comment: dados.comment.trim(),
        status: "pendente",
        source: "Loja",
        created_at: new Date(),
      });

      alert("Avaliação enviada com sucesso! Ela será analisada antes de aparecer na loja.");

      setDados({
        name: "",
        product: "",
        rating: "5",
        comment: "",
      });
    } catch (erro) {
      console.error("Erro ao enviar avaliação:", erro);
      alert("Não foi possível enviar sua avaliação. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section style={box}>
      <div style={tituloBox}>
        <span style={{ ...etiqueta, color: corPrincipal }}>
          💬 Avalie sua compra
        </span>

        <h2 style={titulo}>Já comprou com a NM?</h2>

        <p style={texto}>
          Deixe sua avaliação. Ela será analisada antes de aparecer na loja.
        </p>
      </div>

      <form onSubmit={enviarAvaliacao} style={form}>
        <input
          style={input}
          value={dados.name}
          onChange={(e) => atualizar("name", e.target.value)}
          placeholder="Seu nome"
        />

        <input
          style={input}
          value={dados.product}
          onChange={(e) => atualizar("product", e.target.value)}
          placeholder="Produto comprado"
        />

        <select
          style={input}
          value={dados.rating}
          onChange={(e) => atualizar("rating", e.target.value)}
        >
          <option value="5">⭐⭐⭐⭐⭐ 5 estrelas</option>
          <option value="4">⭐⭐⭐⭐ 4 estrelas</option>
          <option value="3">⭐⭐⭐ 3 estrelas</option>
          <option value="2">⭐⭐ 2 estrelas</option>
          <option value="1">⭐ 1 estrela</option>
        </select>

        <textarea
          style={textarea}
          value={dados.comment}
          onChange={(e) => atualizar("comment", e.target.value)}
          placeholder="Conte como foi sua experiência..."
        />

        <button
          type="submit"
          disabled={salvando}
          style={{
            ...botao,
            background: salvando ? "#b8a1ad" : corPrincipal,
            cursor: salvando ? "not-allowed" : "pointer",
          }}
        >
          {salvando ? "Enviando..." : "Enviar avaliação"}
        </button>
      </form>
    </section>
  );
}

const box = {
  marginTop: "70px",
  background: "#fff",
  border: "1px solid #f6cfe0",
  borderRadius: "24px",
  padding: "34px",
  boxShadow: "0 12px 30px rgba(236,25,113,0.08)",
};

const tituloBox = {
  textAlign: "center",
  marginBottom: "24px",
};

const etiqueta = {
  display: "inline-flex",
  background: "#fff4f9",
  border: "1px solid #f6cfe0",
  borderRadius: "999px",
  padding: "8px 14px",
  fontSize: "12px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const titulo = {
  fontSize: "30px",
  color: "#8b1747",
  margin: "14px 0 8px",
  fontFamily: "Georgia, serif",
};

const texto = {
  color: "#9b687f",
  margin: 0,
};

const form = {
  maxWidth: "720px",
  margin: "0 auto",
  display: "grid",
  gap: "14px",
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #f2bfd5",
  borderRadius: "14px",
  padding: "14px 16px",
  outline: "none",
  fontSize: "15px",
  background: "#fff",
  color: "#8b1747",
  fontWeight: "600",
};

const textarea = {
  ...input,
  minHeight: "120px",
  resize: "vertical",
};

const botao = {
  border: "none",
  color: "#fff",
  padding: "15px",
  borderRadius: "14px",
  fontWeight: "900",
  fontSize: "16px",
};