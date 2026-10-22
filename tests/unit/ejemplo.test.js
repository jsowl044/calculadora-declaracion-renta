// El Excel de ejemplo (ejemplos/exogena-ejemplo.xlsx) debe poder probarse en la app y no contener datos reales.
const fs = require("fs");
const path = require("path");
const { RAIZ } = require("../lib/cargar.js");
const { filasExogena, casoEjemplo } = require("../lib/exogenaSintetica.js");

module.exports = ({ prueba, grupo, A }, { api, XLSX }) => {
  grupo("Excel de ejemplo con datos inventados");
  const ruta = path.join(RAIZ, "ejemplos", "exogena-ejemplo.xlsx");
  const leer = () => {
    const libro = XLSX.read(fs.readFileSync(ruta), { type: "buffer" }); // la SheetJS de vendor/ es la de navegador: no abre rutas
    const hoja = libro.Sheets[libro.SheetNames[0]];
    hoja["!ref"] = "A1:H15"; // los Excel de la DIAN declaran mal su tamaño; la app lo corrige al leerlos
    api.ampliarRangoALasCeldasReales(hoja);
    return XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });
  };

  prueba("el archivo existe", () => A.cierto(fs.existsSync(ruta), "falta ejemplos/exogena-ejemplo.xlsx (npm run ejemplo lo genera)"));
  prueba("la app lo reconoce como exógena, de 2025, y propone los valores esperados", () => {
    const info = api.analizarExogenaDian(leer());
    A.cierto(info.encontrado);
    A.igual(info.meta.anio, 2025);
    const campos = Object.fromEntries(info.lineas.map((l) => [l.campoId, l.valor]));
    const ordenado = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
    A.igual(ordenado(campos), ordenado(casoEjemplo().esperado));
    A.igual(info.cruceTope1.estado, "coincide");
  });
  prueba("es exactamente lo que genera el generador (no se quedó desactualizado)", () => {
    A.igual(leer(), filasExogena(casoEjemplo().opciones));
  });
  prueba("dice claramente que es un ejemplo inventado y que no es un reporte de la DIAN", () => {
    const texto = leer().flat().join(" ");
    A.cierto(/EJEMPLO CON DATOS INVENTADOS/.test(texto) && /no es un reporte de la DIAN/.test(texto));
  });
  prueba("no trae datos de nadie real: documentos y nombres son los inventados", () => {
    const filas = leer();
    const nombres = new Set();
    filas.forEach((f) => { if (/^\d{6,}$/.test(String(f[0]))) nombres.add(String(f[1])); if (/^\d{6,}$/.test(String(f[2]))) nombres.add(String(f[3])); });
    const ajenos = [...nombres].filter((n) => n && !/EJEMPLO/.test(n));
    A.igual(ajenos, [], "todos los nombres deben contener EJEMPLO");
    A.cierto(filas.some((f) => f[2] === "1000000000"), "el documento del consultante es el inventado");
  });
};
