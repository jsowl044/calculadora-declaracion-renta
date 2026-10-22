// Carga el código de la app (capas dominio, infraestructura y aplicación) en un contexto de Node,
// sin navegador. El orden sale de las etiquetas <script> de index.html, así que las pruebas siempre
// siguen el orden real de carga y recogen solos los archivos nuevos.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RAIZ = path.resolve(__dirname, "..", "..");

function archivosEnOrden() {
  const html = fs.readFileSync(path.join(RAIZ, "index.html"), "utf8");
  return [...html.matchAll(/<script src="(src\/[^"]+)"><\/script>/g)]
    .map((m) => m[1])
    .filter((f) => !f.startsWith("src/presentacion/")); // la interfaz necesita DOM
}

// Devuelve { api, ctx, almacen }. `api.nombre` da acceso a cualquier función o constante de nivel superior.
function cargar() {
  const XLSX = require(path.join(RAIZ, "vendor", "xlsx.full.min.js"));
  const almacen = {};
  const localStorage = {
    getItem: (k) => (k in almacen ? almacen[k] : null),
    setItem: (k, v) => { almacen[k] = String(v); },
    removeItem: (k) => { delete almacen[k]; },
  };
  const ctx = vm.createContext({ console, XLSX, window: { XLSX }, localStorage });
  const codigo = archivosEnOrden().map((f) => fs.readFileSync(path.join(RAIZ, f), "utf8")).join("\n");
  vm.runInContext(codigo, ctx, { filename: "app-sin-interfaz.js" });
  const api = new Proxy({}, { get: (_, nombre) => vm.runInContext(String(nombre), ctx) });
  return { api, ctx, almacen, XLSX };
}

module.exports = { cargar, archivosEnOrden, RAIZ };
