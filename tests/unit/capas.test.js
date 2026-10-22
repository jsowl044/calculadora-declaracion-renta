// Arquitectura en capas: presentación → aplicación/infraestructura → dominio. El dominio no usa nada de afuera.
const fs = require("fs");
const path = require("path");
const { RAIZ, archivosEnOrden } = require("../lib/cargar.js");

const CAPAS = ["dominio", "infraestructura", "aplicacion", "presentacion"];
const PERMITIDO = { dominio: [], infraestructura: ["dominio"], aplicacion: ["dominio"], presentacion: ["dominio", "infraestructura", "aplicacion"] };
const NAVEGADOR = /\b(document|window|localStorage|sessionStorage|XLSX|pdfjsLib|alert|confirm|fetch|FileReader)\b/;
const PROHIBIDO = { dominio: NAVEGADOR, aplicacion: NAVEGADOR, infraestructura: /\b(document|alert|confirm)\b/, presentacion: null };

const sinComentariosNiCadenas = (t) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""')
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

module.exports = ({ prueba, grupo, A }) => {
  grupo("Arquitectura en capas");
  const src = path.join(RAIZ, "src");
  const archivos = [];
  CAPAS.forEach((capa) => fs.readdirSync(path.join(src, capa)).filter((f) => f.endsWith(".js")).forEach((f) => archivos.push({ capa, archivo: f, ruta: `src/${capa}/${f}`, texto: sinComentariosNiCadenas(fs.readFileSync(path.join(src, capa, f), "utf8")) })));

  prueba("no hay archivos de código sueltos en la raíz ni carpetas de capa desconocidas", () => {
    const raiz = fs.readdirSync(RAIZ).filter((f) => f.endsWith(".js") || f.endsWith(".css"));
    A.igual(raiz, []);
    A.igual(fs.readdirSync(src).sort(), [...CAPAS].sort());
  });
  prueba("cada archivo de src/ está en index.html y cada <script src> existe", () => {
    const enHtml = [...fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").matchAll(/<script src="(src\/[^"]+\.js)"><\/script>/g)].map((m) => m[1]);
    A.igual([...enHtml].sort(), archivos.map((a) => a.ruta).sort());
  });
  prueba("index.html carga el dominio primero y la presentación al final", () => {
    const orden = [...fs.readFileSync(path.join(RAIZ, "index.html"), "utf8").matchAll(/<script src="src\/(\w+)\/[^"]+\.js"><\/script>/g)].map((m) => m[1]);
    A.igual(orden[0], "dominio");
    A.igual(orden[orden.length - 1], "presentacion");
    const ultimoDominio = orden.lastIndexOf("dominio");
    A.cierto(orden.slice(0, ultimoDominio + 1).every((c) => c === "dominio"), "los scripts del dominio deben ir todos antes que los demás");
  });

  const definido = {};
  archivos.forEach((a) => {
    for (const m of a.texto.matchAll(/^(?:async\s+)?function\s+([A-Za-z_]\w*)|^(?:const|let|var)\s+([A-Za-z_]\w*)/gm)) {
      (definido[m[1] || m[2]] = definido[m[1] || m[2]] || []).push(a.capa);
    }
  });
  prueba("cada archivo solo usa nombres de su capa o de capas más internas", () => {
    const violaciones = [];
    archivos.forEach((a) => {
      Object.entries(definido).forEach(([nombre, capas]) => {
        if (capas.includes(a.capa)) return;
        if (!new RegExp(`\\b${nombre}\\b`).test(a.texto)) return;
        const prohibidas = capas.filter((c) => !PERMITIDO[a.capa].includes(c));
        if (prohibidas.length) violaciones.push(`${a.ruta} usa "${nombre}" de ${prohibidas[0]}`);
      });
    });
    A.igual(violaciones, []);
  });
  prueba("el dominio y la aplicación no tocan pantalla, archivos, red ni almacenamiento", () => {
    const violaciones = [];
    archivos.forEach((a) => {
      const prohibido = PROHIBIDO[a.capa];
      if (!prohibido) return;
      a.texto.split("\n").forEach((linea, i) => { const m = linea.match(prohibido); if (m) violaciones.push(`${a.ruta}:${i + 1} usa "${m[1]}"`); });
    });
    A.igual(violaciones, []);
  });
  prueba("no se define el mismo nombre de nivel superior en dos archivos", () => {
    A.igual(Object.entries(definido).filter(([, v]) => v.length > 1).map(([n]) => n), []);
  });
};
