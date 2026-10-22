// Genera ejemplos/exogena-ejemplo.xlsx: una exógena de la DIAN INVENTADA (mismo formato que el Excel real) para
// probar la app sin datos de nadie. Nombres, documentos y valores son falsos.
//   node tests/generar-ejemplo.js        (o: npm run ejemplo)
const fs = require("fs");
const path = require("path");
const { libroExogena, casoEjemplo } = require("./lib/exogenaSintetica.js");
const { RAIZ } = require("./lib/cargar.js");

const destino = path.join(RAIZ, "ejemplos", "exogena-ejemplo.xlsx");
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, libroExogena(casoEjemplo().opciones));
console.log("Escrito:", path.relative(RAIZ, destino));
