import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const storedTheme = localStorage.getItem("tmh_theme");
document.documentElement.classList.toggle("dark", storedTheme !== "light");

createRoot(document.getElementById("root")!).render(<App />);
