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
  <div
    style={{
      background: "green",
      color: "#fff",
      padding: "30px",
      textAlign: "center",
      fontSize: "30px",
      fontWeight: "bold",
      marginTop: "30px",
    }}
  >
    FORMULÁRIO FUNCIONANDO 🚀
  </div>
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
  cursor: "pointer",
};
