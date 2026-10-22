// Ejecuta las pruebas unitarias de la app. No necesita instalar nada: solo Node 18 o más reciente.
//   node tests/run.js        (o: npm test)
// Todas las pruebas usan datos INVENTADOS. Cargan el código de src/ en el orden de index.html, sin navegador.
const fs = require("fs");
const path = require("path");
const mini = require("./lib/mini.js");
const { cargar } = require("./lib/cargar.js");

const carpeta = path.join(__dirname, "unit");
for (const archivo of fs.readdirSync(carpeta).filter((f) => f.endsWith(".test.js")).sort()) {
  console.log(`\n##### ${archivo}`);
  require(path.join(carpeta, archivo))({ prueba: mini.prueba, grupo: mini.grupo, A: mini.A }, { ...cargar(), cargarNuevo: cargar });
}
process.exit(mini.resumen() ? 1 : 0);
