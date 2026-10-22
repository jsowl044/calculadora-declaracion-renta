// Importación automática de la información exógena de la DIAN ("Consulta de Información
// reportada por terceros"). Cada fila trae en la columna "Uso declaración Sugerida" la casilla
// donde la DIAN sugiere declararla (R32, R74, R30...). Aquí esa casilla se traduce al campo
// equivalente de la app. Todo se propone para revisión: nada se aplica sin que el usuario lo
// confirme. Depende de importer.js (normalizarConcepto, aNumeroCelda, esFilaDeTope,
// extraerMetadatosInforme) y de calculator.js (compararConTope1).

// Mismos nombres que las etiquetas del formulario, en el orden en que se muestran.
const ETIQUETAS_CAMPOS_EXOGENA = {
  i_lab_bruto: "Salarios y pagos laborales (ingresos brutos)",
  i_lab_cesantias: "Auxilio de cesantías e intereses (total)",
  i_lab_aportes: "Aportes obligatorios a salud y pensión",
  i_lab_promedio6m: "Ingreso laboral promedio últimos 6 meses (Art. 206 num. 4)",
  i_cap_intereses: "Intereses y rendimientos financieros",
  i_cap_arriendos: "Arriendos",
  i_cap_otros: "Otros ingresos de capital",
  i_nolab_honorarios: "Honorarios / servicios independientes",
  i_nolab_otros: "Otros ingresos no laborales",
  i_nolab_incrngo: "Ingresos no constitutivos de renta (no laboral)",
  pen_anual: "Ingreso bruto anual por pensión",
  pen_incrngo: "Ingresos no constitutivos de renta (aportes obligatorios a salud)",
  d_voluntarios: "Aportes voluntarios a pensión / cuentas AFC",
  d_compras_factura: "Total de compras que califican",
  p_activos: "Total activos (patrimonio bruto)",
  p_pasivos: "Total pasivos (deudas)",
  r_retencion: "Retención en la fuente practicada",
  r_saldofavor: "Saldo a favor del año anterior",
};

// Los campos que suman al "Tope 1 - Ingresos" de la DIAN (ingresos brutos de todas las cédulas).
const CAMPOS_INGRESOS_BRUTOS_EXOGENA = [
  "i_lab_bruto", "i_cap_intereses", "i_cap_arriendos", "i_cap_otros",
  "i_nolab_honorarios", "i_nolab_otros", "pen_anual",
];

const NOTA_VEHICULO_EXOGENA =
  "El avalúo del vehículo lo da la DIAN solo como referencia: para efectos fiscales el valor patrimonial es el costo fiscal. Confírmalo.";
const NOTA_R33_EXOGENA =
  "La DIAN deja elegir la cédula (trabajo, capital, no laborales, pensiones); se asignó a rentas de trabajo.";
const NOTA_R35_EXOGENA =
  "La DIAN lo ubica como renta exenta o deducción imputable (R35) y la deja asignar según la cédula; se asignó a rentas de trabajo.";
const NOTA_R76_EXOGENA =
  "La DIAN sugiere también tratarlo como ingreso no constitutivo de renta (R76). Confírmalo con tu contador.";
const NOTA_R100_EXOGENA =
  "Quien reporta estos aportes es quien te paga la pensión, así que se asignaron a la cédula de pensiones (casilla 100).";
const NOTA_R43_EXOGENA =
  "La DIAN lo ubica en la casilla 43 (rentas de trabajo sin relación laboral, con costos y gastos). Esta app no modela esa columna y lo cuenta en rentas no laborales (casilla 74): el impuesto no cambia si no reclamas exentas ni deducciones contra ese ingreso. Al digitar en la DIAN, pásalo a la casilla 43.";
const NOTA_INMUEBLE_EXOGENA =
  "El avalúo catastral es la referencia de la DIAN: para efectos fiscales el valor patrimonial de un inmueble depende de su costo fiscal y de tu porcentaje de propiedad. Confírmalo.";

// Cesantías consignadas al fondo o pagadas: son ingreso laboral (R32) y a la vez base de la
// renta exenta del art. 206 num. 4 ET, así que alimentan los dos campos. El mismo dinero puede
// venir reportado por el empleador y por el fondo; `grupo` permite contarlo una sola vez.
function laboralYCesantias(valor, grupo) {
  return {
    asignaciones: [
      { campoId: "i_lab_bruto", valor, grupo },
      { campoId: "i_lab_cesantias", valor, grupo },
    ],
  };
}

// `ctx` (opcional) dice quién reporta pensión (R99) y quién reporta salarios (R32): los aportes
// obligatorios a salud los puede reportar cualquiera de los dos y la DIAN deja elegir la cédula.
function clasificarPartidaExogena(it, ctx) {
  const det = normalizarConcepto(it.detalle);
  const uso = normalizarConcepto(it.uso);
  const codigos = uso.match(/\br\d{2,3}\b/g) || [];
  const tiene = (codigo) => codigos.includes(codigo);
  const v = it.valor;
  const una = (campoId, extra) => ({ asignaciones: [{ campoId, valor: v, ...extra }] });
  const sugiereCasilla = codigos.length > 0 || /\btope [12]\b/.test(uso);

  let r;
  if (/facturacion electronica susceptible/.test(det)) {
    r = una("d_compras_factura", { unico: true });
  } else if (/ingreso laboral promedio/.test(det)) {
    r = una("i_lab_promedio6m", { unico: true });
  } else if (tiene("r131") || /^total saldo a favor/.test(det)) {
    r = una("r_saldofavor", { unico: true });
  } else if (tiene("r132")) {
    r = una("r_retencion");
  } else if (tiene("r123")) {
    r = { informativa: "donacion" };
  } else if (/^total patrimonio bruto declarado en el ano anterior/.test(det)) {
    r = { informativa: "patrimonioAnterior" };
  } else if (/^cesantias consignadas/.test(det)) {
    r = laboralYCesantias(v, "cesantiasEmpleador");
  } else if (/cesantias abonadas/.test(det)) {
    r = laboralYCesantias(v, "cesantiasFondo");
  } else if (/^cesantias e intereses de cesantias pagadas/.test(det)) {
    r = laboralYCesantias(v, null);
  } else if (/asignacion segun el tipo de renta/.test(uso) && /ingresos no constitutivos/.test(uso)) {
    const esDePension =
      ctx &&
      ((ctx.informantesPension.has(it.informante) && !ctx.informantesLaboral.has(it.informante)) ||
        (ctx.hayPension && !ctx.hayLaboral));
    r = esDePension
      ? una("pen_incrngo", { nota: NOTA_R100_EXOGENA })
      : una("i_lab_aportes", { nota: NOTA_R33_EXOGENA });
  } else if (/se asigna y calcula segun el tipo de renta/.test(uso) && /voluntari|avc|afc/.test(det)) {
    r = una("d_voluntarios", { nota: NOTA_R35_EXOGENA });
  } else if (tiene("r32")) {
    r = una("i_lab_bruto");
  } else if (tiene("r99")) {
    r = una("pen_anual");
  } else if (tiene("r43")) {
    r = una("i_nolab_honorarios", { nota: NOTA_R43_EXOGENA });
  } else if (tiene("r58")) {
    r = una(
      /arrend|canon/.test(det)
        ? "i_cap_arriendos"
        : /interes|rendimiento/.test(det)
        ? "i_cap_intereses"
        : "i_cap_otros"
    );
  } else if (tiene("r74")) {
    r = una(/honorario|comision|servicio/.test(det) ? "i_nolab_honorarios" : "i_nolab_otros");
    if (tiene("r76")) r.asignaciones.push({ campoId: "i_nolab_incrngo", valor: v, nota: NOTA_R76_EXOGENA });
  } else if (/avaluo vehiculo/.test(det)) {
    r = una("p_activos", { nota: NOTA_VEHICULO_EXOGENA });
  } else if (/avaluo catastral/.test(det)) {
    r = una("p_activos", { nota: NOTA_INMUEBLE_EXOGENA });
  } else if (/si el saldo es positivo/.test(uso)) {
    r = v >= 0 ? una("p_activos") : una("p_pasivos", { valor: -v });
  } else if (tiene("r29")) {
    r = una("p_activos");
  } else if (tiene("r30")) {
    r = una("p_pasivos");
  } else {
    r = {};
  }
  return { asignaciones: [], informativa: null, ...r, sugiereCasilla };
}

// Suma los aportes de una línea sin contar dos veces lo que reportan dos terceros: los datos de
// un solo valor (saldo a favor, promedio 6 meses, compras 1%) toman el mayor; las cesantías
// toman el mayor entre lo que suman los empleadores y lo que suman los fondos.
function consolidarLineaExogena(l) {
  const suma = (arr) => arr.reduce((s, a) => s + a.valor, 0);
  const normales = l.aportes.filter((a) => !a.unico && !a.grupo);
  const unicos = l.aportes.filter((a) => a.unico);
  const porGrupo = {};
  l.aportes
    .filter((a) => a.grupo)
    .forEach((a) => (porGrupo[a.grupo] = porGrupo[a.grupo] || []).push(a));
  const grupos = Object.values(porGrupo);

  let total = suma(normales);
  if (unicos.length) {
    const mayor = unicos.reduce((m, a) => (a.valor > m.valor ? a : m));
    unicos.forEach((a) => (a.contado = a === mayor));
    total += mayor.valor;
    if (unicos.length > 1) {
      l.notas.push("La DIAN reporta más de un valor para este dato; se tomó el mayor. Verifícalo.");
    }
  }
  if (grupos.length) {
    const mayor = grupos.reduce((m, g) => (suma(g) > suma(m) ? g : m));
    grupos.forEach((g) => g.forEach((a) => (a.contado = g === mayor)));
    total += suma(mayor);
    if (grupos.length > 1) {
      l.notas.push(
        "Las cesantías consignadas las reportan el empleador y el fondo a la vez: se cuentan una sola vez."
      );
    }
  }
  l.valor = Math.round(total);
  return l;
}

function construirPropuestasExogena(items) {
  const lineas = {};
  const informativas = [];
  const sinUbicar = [];
  const controles = [];

  // Contexto para decidir a qué cédula van los aportes a salud: si quien los reporta también paga la
  // pensión (R99) y no pagó salarios, son de la cédula de pensiones.
  const contexto = { informantesPension: new Set(), informantesLaboral: new Set(), hayPension: false, hayLaboral: false };
  items.forEach((it) => {
    const cods = normalizarConcepto(it.uso).match(/\br\d{2,3}\b/g) || [];
    if (cods.includes("r99")) {
      contexto.informantesPension.add(it.informante);
      contexto.hayPension = true;
    }
    if (cods.includes("r32") || /cesantias/.test(normalizarConcepto(it.detalle))) {
      contexto.informantesLaboral.add(it.informante);
      contexto.hayLaboral = true;
    }
  });

  items.forEach((it) => {
    const c = clasificarPartidaExogena(it, contexto);
    if (c.informativa) {
      informativas.push({ tipo: c.informativa, informante: it.informante, detalle: it.detalle, valor: it.valor });
      return;
    }
    if (c.asignaciones.length === 0) {
      (c.sugiereCasilla ? sinUbicar : controles).push(it);
      return;
    }
    c.asignaciones.forEach((a) => {
      const l =
        lineas[a.campoId] ||
        (lineas[a.campoId] = {
          campoId: a.campoId,
          etiqueta: ETIQUETAS_CAMPOS_EXOGENA[a.campoId],
          aportes: [],
          notas: [],
        });
      l.aportes.push({
        informante: it.informante,
        detalle: it.detalle,
        valor: a.valor,
        grupo: a.grupo || null,
        unico: !!a.unico,
        contado: true,
      });
      if (a.nota && !l.notas.includes(a.nota)) l.notas.push(a.nota);
    });
  });

  const ordenadas = Object.keys(ETIQUETAS_CAMPOS_EXOGENA)
    .filter((id) => lineas[id])
    .map((id) => consolidarLineaExogena(lineas[id]));
  const ingresosPropuestos = ordenadas
    .filter((l) => CAMPOS_INGRESOS_BRUTOS_EXOGENA.includes(l.campoId))
    .reduce((s, l) => s + l.valor, 0);

  const advertencias = [];
  if (lineas.i_lab_cesantias) {
    advertencias.push(
      "Cesantías: el reporte solo trae lo consignado o pagado en el año. A tu patrimonio debes sumar además el saldo acumulado en el fondo de cesantías a 31 de diciembre; pídeselo al fondo (por ejemplo FOMAG, Porvenir o Protección)."
    );
  }
  advertencias.push(
    "Patrimonio: la exógena solo incluye lo que reportan terceros (bancos, fondos, tránsito). No trae inmuebles, saldos de entidades que no reportan ni deudas con particulares: complétalo con tus certificados."
  );
  advertencias.push(
    "No vienen en la exógena y debes completarlos tú: personas a cargo, intereses de vivienda, medicina prepagada y los costos y deducciones de tus ingresos no laborales."
  );

  return { lineas: ordenadas, informativas, sinUbicar, controles, ingresosPropuestos, advertencias };
}

function extraerDatosConsultanteExogena(filas) {
  const datos = { nombre: "", tipoDocumento: null };
  for (let i = 0; i < Math.min(filas.length, 14); i++) {
    const etiqueta = normalizarConcepto(filas[i][0]);
    const valor = filas[i].slice(1).find((c) => String(c).trim() !== "");
    if (valor === undefined) continue;
    if (/^nombres? \/ razon social/.test(etiqueta)) {
      datos.nombre = String(valor).trim();
    } else if (/^tipo de documento/.test(etiqueta)) {
      const t = String(valor).toLowerCase().replace(/[^a-z]/g, "");
      datos.tipoDocumento = { cc: "CC", ce: "CE", nit: "NIT", pasaporte: "Pasaporte" }[t] || null;
    }
  }
  return datos;
}

// Reconoce el reporte por su encabezado ("Detalle" y "Uso declaración Sugerida"), ubica las
// columnas por nombre y devuelve las partidas, los topes y las propuestas por campo de la app.
function analizarExogenaDian(filas) {
  let idxEnc = -1;
  let enc = [];
  for (let i = 0; i < Math.min(filas.length, 60); i++) {
    const h = filas[i].map(normalizarConcepto);
    if (h.includes("detalle") && h.some((c) => c.startsWith("uso declaracion"))) {
      idxEnc = i;
      enc = h;
      break;
    }
  }
  if (idxEnc === -1) return { encontrado: false };

  const cDetalle = enc.indexOf("detalle");
  const cValor = enc.indexOf("valor");
  const cUso = enc.findIndex((c) => c.startsWith("uso declaracion"));
  if (cValor < 0) return { encontrado: false };
  const cInformante = Math.max(enc.findIndex((c) => /^nombre \/ razon social$/.test(c)), 0);

  const items = [];
  const topes = [];
  filas.slice(idxEnc + 1).forEach((f) => {
    const detalle = String(f[cDetalle] || "").replace(/\s+/g, " ").trim();
    if (!detalle) return;
    const valor = aNumeroCelda(f[cValor]);
    if (esFilaDeTope(detalle)) {
      topes.push({ detalle, valor });
      return;
    }
    items.push({
      informante: String(f[cInformante] || "").trim(),
      detalle,
      valor,
      uso: String(f[cUso] || "").replace(/\s+/g, " ").trim(),
    });
  });

  const propuestas = construirPropuestasExogena(items);
  const topeIngresos = topes.find((t) => /ingreso/i.test(t.detalle));
  return {
    encontrado: true,
    meta: extraerMetadatosInforme(filas),
    consultante: extraerDatosConsultanteExogena(filas),
    topes,
    items,
    ...propuestas,
    cruceTope1: topeIngresos ? compararConTope1(topeIngresos.valor, propuestas.ingresosPropuestos) : null,
  };
}
