// Infraestructura: lectura de los archivos que la persona elige (PDF con pdf.js, Excel/CSV con SheetJS).
// Es la única parte que toca esas librerías y el objeto File: devuelve texto o filas de celdas para que la
// capa de aplicación (importer.js, exogena.js) las interprete. Depende de vendor/pdf.min.js y
// vendor/xlsx.full.min.js.

async function extraerTextoPdf(file) {
  if (!window.pdfjsLib) throw new Error("No se pudo cargar el lector de PDF.");
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let texto = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    texto += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return texto;
}

// Los Excel de información exógena de la DIAN declaran mal su tamaño (p. ej. dimension "A1:H15"
// con 55 filas reales) y SheetJS respeta ese rango, así que sheet_to_json se salta todo lo que
// pasa de la fila 15 sin avisar. Se recalcula el rango a partir de las celdas que sí existen.
function ampliarRangoALasCeldasReales(hoja) {
  let maxR = -1;
  let maxC = -1;
  Object.keys(hoja).forEach((k) => {
    if (k[0] === "!") return;
    const { r, c } = XLSX.utils.decode_cell(k);
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  });
  if (maxR < 0) return;
  const rango = hoja["!ref"]
    ? XLSX.utils.decode_range(hoja["!ref"])
    : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  rango.e.r = Math.max(rango.e.r, maxR);
  rango.e.c = Math.max(rango.e.c, maxC);
  hoja["!ref"] = XLSX.utils.encode_range(rango);
}

async function leerFilasExcelOCsv(file) {
  if (!window.XLSX) throw new Error("No se pudo cargar el lector de Excel/CSV.");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  ampliarRangoALasCeldasReales(hoja);
  return XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });
}
