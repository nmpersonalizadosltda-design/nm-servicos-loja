import Loja from "./pages/Loja";
import Admin from "./Admin";

function App() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("admin") === "true") {
    return <Admin />;
  }

  return <Loja />;
}

export default App;