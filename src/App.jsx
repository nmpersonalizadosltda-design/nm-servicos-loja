import Loja from "./pages/Loja";
import Admin from "./pages/Admin";

function App() {
  const caminho = window.location.pathname;

  if (caminho === "/admin") {
    return <Admin />;
  }

  return <Loja />;
}

export default App;