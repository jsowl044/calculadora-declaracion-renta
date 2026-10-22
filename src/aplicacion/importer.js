// Aplicación: interpretar el contenido de archivos de la DIAN (Certificado de Ingresos y Retenciones en PDF, o
// Excel/CSV de información exógena de la DIAN). Solo SUGIERE valores: el usuario siempre
// revisa y confirma antes de que se apliquen al formulario, porque el formato exacto de
// estos documentos varía según quién los generó y no hay garantía de que la detección
// automática sea perfecta.

// Campos del formulario a los que se puede asignar un valor importado.
const CAMPOS_IMPORTABLES = [
  { id: "i_lab_bruto", label: "Salarios y pagos laborales (bruto)" },
  { id: "i_lab_aportes", label: "Aportes obligatorios a salud y pensión" },
  { id: "i_cap_intereses", label: "Intereses y rendimientos financieros" },
  { id: "i_cap_arriendos", label: "Arriendos" },
  { id: "i_cap_otros", label: "Otros ingresos de capital" },
  { id: "i_nolab_honorarios", label: "Honorarios / servicios independientes" },
  { id: "i_nolab_otros", label: "Otros ingresos no laborales" },
  { id: "pen_anual", label: "Ingreso bruto anual por pensión" },
  { id: "div_gravables", label: "Dividendos gravables (2017 en adelante)" },
  { id: "r_retencion", label: "Retención en la fuente practicada" },
  { id: "r_autorretencion", label: "Autorretenciones" },
  { id: "p_activos", label: "Total activos (patrimonio bruto)" },
  { id: "p_pasivos", label: "Total pasivos (deudas)" },
];

// Heurísticas de búsqueda para el Certificado de Ingresos y Retenciones (Formulario 220).
// Son SUGERENCIAS basadas en las etiquetas más comunes de ese formato — el software de
// nómina de cada empleador puede redactarlas distinto, así que siempre se muestran para
// revisión, nunca se aplican solas.
const PATRONES_PDF = [
  {
    campoId: "i_lab_bruto",
    regexes: [
      /total\s+ingresos?(?:\s+brutos?)?[^\n\d]{0,40}([\d.,]+)/i,
      /pagos?\s+laborales?[^\n\d]{0,40}([\d.,]+)/i,
      /salarios?\s+y\s+dem[aá]s\s+pagos?[^\n\d]{0,40}([\d.,]+)/i,
    ],
  },
  {
    campoId: "i_lab_aportes",
    regexes: [
      /aportes?\s+obligatorios?\s+(?:a\s+)?(?:salud\s+y\s+pensi[oó]n|pensi[oó]n\s+y\s+salud|fondos?\s+de\s+pensi[oó]n)[^\n\d]{0,40}([\d.,]+)/i,
    ],
  },
  {
    campoId: "r_retencion",
    regexes: [
      /retenci[oó]n\s+en\s+la\s+fuente(?:\s+practicada)?[^\n\d]{0,60}([\d.,]+)/i,
      /total\s+retenci[oó]n(?:es)?[^\n\d]{0,40}([\d.,]+)/i,
    ],
  },
];

// Convierte un texto numérico en formato colombiano/latino (o inglés) a un Number.
// Heurística: el separador que aparece más cerca del final del número es el "candidato" a
// decimal, pero solo se trata como decimal si le siguen 1 o 2 dígitos — si le siguen 3
// (ej. "5,418,627" o "9.600.000"), en montos de dinero eso casi siempre es agrupación de
// miles, no una parte decimal.
function parsearNumeroLatino(str) {
  if (!str) return 0;
  const s = String(str).trim().replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma === -1 && lastDot === -1) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  const separadorCandidato = lastComma > lastDot ? "," : ".";
  const digitosDespues = s.length - Math.max(lastComma, lastDot) - 1;
  let normalizado;
  if (digitosDespues === 3) {
    normalizado = s.replace(/[.,]/g, "");
  } else if (separadorCandidato === ",") {
    normalizado = s.split(".").join("").replace(",", ".");
  } else {
    normalizado = s.split(",").join("");
  }
  const n = parseFloat(normalizado);
  return Number.isFinite(n) ? n : 0;
}

function sugerirDesdeTextoPdf(texto) {
  const sugerencias = [];
  PATRONES_PDF.forEach(({ campoId, regexes }) => {
    for (const re of regexes) {
      const m = texto.match(re);
      if (m) {
        const campo = CAMPOS_IMPORTABLES.find((c) => c.id === campoId);
        sugerencias.push({
          campoId,
          etiqueta: campo.label,
          textoEncontrado: m[0].trim().slice(0, 90),
          valor: parsearNumeroLatino(m[1]),
        });
        break;
      }
    }
  });
  return sugerencias;
}

// --- Sugerencias para Excel/CSV genéricos ---
// Nunca se aplican solas: siempre quedan como una selección pre-marcada que el usuario puede
// aceptar, cambiar o poner en "Ignorar".
function normalizarConcepto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Palabras clave para sugerir un campo según el texto del concepto. Es solo un punto de partida
// razonable — el usuario siempre puede cambiarlo antes de aplicar.
const PALABRAS_CLAVE_CONCEPTO = [
  { campoId: "i_lab_bruto", patrones: [/salario/, /pagos? laborales?/, /sueldo/] },
  { campoId: "i_cap_intereses", patrones: [/rendimiento financiero/, /interes/] },
  { campoId: "i_cap_arriendos", patrones: [/arrendamiento/, /arriendo/, /alquiler/] },
  { campoId: "i_nolab_honorarios", patrones: [/honorario/, /comision/, /servicio/] },
  { campoId: "div_gravables", patrones: [/dividendo/, /participacion/] },
  { campoId: "r_retencion", patrones: [/retencion en la fuente/, /retefuente/] },
  { campoId: "r_autorretencion", patrones: [/autorretencion/] },
];

function sugerirCampoParaConcepto(conceptoTexto) {
  const clave = normalizarConcepto(conceptoTexto);
  for (const { campoId, patrones } of PALABRAS_CLAVE_CONCEPTO) {
    if (patrones.some((p) => p.test(clave))) return { campoId, origen: "palabra_clave" };
  }
  return { campoId: "", origen: "" };
}

// Encuentra la primera columna cuyo encabezado calce con alguno de los patrones, probando
// los patrones en orden de prioridad (los más específicos primero) en lugar de tomar la
// primera coincidencia de cualquier patrón — así "Concepto" no se confunde con columnas como
// "Nombre Informante" o "Nombre Tercero" que también contienen la palabra "nombre".
function encontrarColumna(fila, patrones) {
  for (const patron of patrones) {
    const idx = fila.findIndex((c) => typeof c === "string" && patron.test(c.trim()));
    if (idx >= 0) return idx;
  }
  return -1;
}

// "Detalle" es el nombre real de la columna de concepto en el reporte "Consulta de
// Información reportada por terceros" de la DIAN (confirmado con un archivo real).
const PATRONES_COLUMNA_CONCEPTO = [
  /^concepto$/i,
  /^descripci[oó]n$/i,
  /^detalle$/i,
  /nombre\s+del?\s+concepto/i,
  /concepto/i,
  /descripci[oó]n/i,
  /detalle/i,
];
const PATRONES_COLUMNA_VALOR = [/^valor$/i, /^monto$/i, /valor/i, /monto/i, /total/i];

// En ese mismo reporte, las filas "Tope N - ..." no son un concepto individual de ingreso:
// son el total agregado que la DIAN usa para revisar los topes de obligación de declarar
// (ingresos, patrimonio, consignaciones, tarjeta de crédito, compras). Asignar ese total a
// un solo campo del formulario sería incorrecto (duplicaría o distorsionaría tus ingresos),
// así que se separan para mostrarlos solo como referencia, nunca como algo para "aplicar".
function esFilaDeTope(texto) {
  return /^tope\s*\d+/i.test(texto.trim());
}

// Traduce las filas "Tope N - ..." (lista de { detalle, valor }) a las referencias que guarda la declaración
// para saber si hay que declarar (ver dominio/obligacion.js). Se ubican por el número del tope.
function referenciasDianDesdeTopes(topes) {
  const campos = { 1: "tope1Ingresos", 2: "tope2Patrimonio", 3: "tope3ConsumosTarjeta", 4: "tope4Movimientos", 5: "tope5Compras" };
  const referencias = {};
  (topes || []).forEach((t) => {
    const m = String(t.detalle || "").trim().match(/^tope\s*(\d+)/i);
    const campo = m && campos[Number(m[1])];
    if (campo && Number.isFinite(t.valor)) referencias[campo] = t.valor;
  });
  return referencias;
}

function esFilaDeTotalGeneral(texto) {
  return /^total(es)?\b/i.test(texto.trim());
}

// Busca una fila de encabezado con una columna de texto (concepto/descripción/detalle) y una
// columna numérica (valor), agrupa los conceptos individuales, y separa aparte los "Tope N"
// (referencia de obligación de declarar) y cualquier fila de "Total" general.
function agruparFilasPorConcepto(filas) {
  let filaEncabezado = -1;
  let colConcepto = -1;
  let colValor = -1;
  for (let i = 0; i < Math.min(filas.length, 15); i++) {
    const fila = filas[i];
    const idxConcepto = encontrarColumna(fila, PATRONES_COLUMNA_CONCEPTO);
    const idxValor = encontrarColumna(fila, PATRONES_COLUMNA_VALOR);
    if (idxConcepto >= 0 && idxValor >= 0 && idxConcepto !== idxValor) {
      filaEncabezado = i;
      colConcepto = idxConcepto;
      colValor = idxValor;
      break;
    }
  }
  if (filaEncabezado === -1) {
    return { encontrado: false, grupos: [], topes: [] };
  }
  const totales = new Map();
  const topes = [];
  for (let i = filaEncabezado + 1; i < filas.length; i++) {
    const fila = filas[i];
    const concepto = String(fila[colConcepto] || "").trim();
    const valor = parsearNumeroLatino(fila[colValor]);
    if (!concepto || !valor) continue;
    if (esFilaDeTope(concepto)) {
      topes.push({ detalle: concepto, valor });
      continue;
    }
    if (esFilaDeTotalGeneral(concepto)) continue;
    totales.set(concepto, (totales.get(concepto) || 0) + valor);
  }
  const grupos = Array.from(totales.entries())
    .map(([concepto, total]) => ({ concepto, total }))
    .sort((a, b) => b.total - a.total);
  return { encontrado: true, grupos, topes };
}

// --- Metadatos de los reportes de la DIAN (año y documento del consultante) ---
// Ambos reportes (información exógena y facturas electrónicas) traen arriba pares
// "etiqueta | valor". Se leen para avisar si el archivo es de otro año u otra persona,
// que es el error fácil de cometer al manejar varias declaraciones.
function aNumeroCelda(c) {
  return typeof c === "number" ? c : parsearNumeroLatino(c);
}

function extraerMetadatosInforme(filas) {
  const meta = { anio: null, documento: null };
  for (let i = 0; i < Math.min(filas.length, 30); i++) {
    const fila = filas[i];
    const etiqueta = normalizarConcepto(fila[0]);
    const valor = fila.slice(1).find((c) => c !== "" && c !== null && c !== undefined);
    if (valor === undefined) continue;
    if (/^ano\b/.test(etiqueta) && /^\d{4}$/.test(String(valor).trim())) {
      meta.anio = parseInt(valor, 10);
    } else if (/^(doc )?identificacion( adq\.?)?:?$/.test(etiqueta)) {
      const digitos = String(valor).replace(/\D/g, "");
      if (digitos) meta.documento = digitos;
    }
  }
  return meta;
}

// --- Informe de la DIAN "Facturas electrónicas adquiridas por año" ---
// La columna "Valor Susceptible Beneficio" ya viene neta de notas crédito y sin lo pagado en
// efectivo: es la base del descuento del 1% (Art. 336 num. 5 ET, casilla 28).
function analizarInformeFacturas(filas) {
  const idxEnc = filas.findIndex(
    (fila, i) =>
      i < 60 && fila.some((c) => normalizarConcepto(c) === "valor susceptible beneficio")
  );
  if (idxEnc === -1) return { encontrado: false };

  const enc = filas[idxEnc].map((c) => normalizarConcepto(c));
  const col = (patron) => enc.findIndex((h) => patron.test(h));
  const cFacturado = col(/^valor facturado$/);
  const cNotasCredito = col(/^valor notas credito$/);
  const cNotasDebito = col(/^valor notas debito$/);
  const cNeto = col(/^valor factura \/ afectada/);
  const cSusceptible = col(/^valor susceptible beneficio$/);
  if (cFacturado < 0 || cSusceptible < 0) return { encontrado: false };

  // Una fila es factura si tiene emisor y un valor facturado; el pie del informe
  // ("204 Facturas procesadas...") y las filas vacías quedan fuera.
  const facturas = filas.slice(idxEnc + 1).filter((f) => {
    const v = f[cFacturado];
    return String(f[0]).trim() !== "" && v !== "" && v !== null && v !== undefined;
  });
  const total = (c) => (c < 0 ? 0 : facturas.reduce((s, f) => s + aNumeroCelda(f[c]), 0));

  const totalFacturado = total(cFacturado);
  const totalNotasCredito = total(cNotasCredito);
  const totalNotasDebito = total(cNotasDebito);
  const totalNeto = cNeto >= 0 ? total(cNeto) : totalFacturado - totalNotasCredito + totalNotasDebito;
  const totalSusceptible = total(cSusceptible);
  return {
    encontrado: true,
    meta: extraerMetadatosInforme(filas),
    nFacturas: facturas.length,
    totalFacturado,
    totalNotasCredito,
    totalNotasDebito,
    totalNeto,
    totalExcluido: totalNeto - totalSusceptible, // pagado en efectivo u otra razón que la DIAN excluye
    totalSusceptible,
  };
}
