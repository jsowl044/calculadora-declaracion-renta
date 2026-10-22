// Lógica de interfaz: formulario, cálculo, importación, exportación del documento Excel y modal de
// configuración. La app no guarda nada: lo que la persona conserva es el documento que exporta.

// Versión visible al pie de la página: sirve para saber qué copia de la app se está usando.
const VERSION_APP = "2026.10.22-1";

aplicarUvtGuardados();

let declaracionActual = plantillaDeclaracion();

const fmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const money = (n) => `$${fmt.format(Math.round(n || 0))}`;

function q(id) {
  return document.getElementById(id);
}

// Los textos que vienen de un archivo (nombres de terceros, detalles) se escapan antes de ir a innerHTML.
function esc(texto) {
  return String(texto).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// --- Tabs ---
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.querySelector(`.tab-panel[data-tab="${btn.dataset.tab}"]`).classList.add("active");
  });
});

// --- Cargar formulario desde un objeto declaración ---
function cargarFormulario(d) {
  q("personaNombre").value = d.personaNombre;
  q("tipoDocumento").value = d.tipoDocumento;
  q("numeroDocumento").value = d.numeroDocumento;
  q("anioGravable").value = d.anioGravable;
  q("notas").value = d.notas;

  q("p_activos").value = d.patrimonio.activos;
  q("p_pasivos").value = d.patrimonio.pasivos;

  q("i_lab_bruto").value = d.cedulaGeneral.laboral.ingresosBrutos;
  q("i_lab_aportes").value = d.cedulaGeneral.laboral.aportesObligatoriosSaludPension;
  q("i_lab_cesantias").value = d.cedulaGeneral.laboral.cesantiasEIntereses;
  q("i_lab_promedio6m").value = d.cedulaGeneral.laboral.ingresoLaboralPromedio6Meses;
  q("d_exenta_manual_activa").checked = !!d.cedulaGeneral.laboral.rentaExentaManualActiva;
  q("d_exenta_manual_valor").value = d.cedulaGeneral.laboral.rentaExentaManualValor;
  q("d_compras_factura").value = d.cedulaGeneral.comprasFacturaElectronica;
  q("i_cap_intereses").value = d.cedulaGeneral.capital.intereses;
  q("i_cap_arriendos").value = d.cedulaGeneral.capital.arriendos;
  q("i_cap_otros").value = d.cedulaGeneral.capital.otrosCapital;
  q("i_cap_incrngo").value = d.cedulaGeneral.capital.ingresosNoConstitutivos;
  q("i_cap_costos").value = d.cedulaGeneral.capital.costosYDeduccionesProcedentes;
  q("i_nolab_honorarios").value = d.cedulaGeneral.noLaboral.honorariosServicios;
  q("i_nolab_otros").value = d.cedulaGeneral.noLaboral.otrosNoLaborales;
  q("i_nolab_incrngo").value = d.cedulaGeneral.noLaboral.ingresosNoConstitutivos;
  q("i_nolab_costos").value = d.cedulaGeneral.noLaboral.costosYDeduccionesProcedentes;

  q("d_vivienda").value = d.cedulaGeneral.deduccionesEspeciales.interesesVivienda;
  q("d_salud").value = d.cedulaGeneral.deduccionesEspeciales.saludPrepagada;
  q("d_dependientes").value = d.cedulaGeneral.deduccionesEspeciales.numeroDependientes;
  q("d_voluntarios").value = d.cedulaGeneral.deduccionesEspeciales.aportesVoluntariosPensionAFC;

  q("pen_anual").value = d.pensiones.ingresoBrutoAnual;
  q("pen_mensual").value = d.pensiones.ingresoBrutoMensualPromedio;
  q("pen_incrngo").value = d.pensiones.ingresosNoConstitutivos;

  q("div_gravables").value = d.dividendos.dividendosGravables;
  q("div_antiguos").value = d.dividendos.dividendosAnio2016yAnteriores;
  q("div_antiguos_tarifa").value = (d.dividendos.tarifaDividendosAntiguos || 0) * 100;

  q("r_retencion").value = d.retenciones.retencionFuentePracticada;
  q("r_autorretencion").value = d.retenciones.autorretenciones;
  q("r_anticipo").value = d.anticipos.anticipoRentaAnioAnterior;
  q("r_saldofavor").value = d.anticipos.saldoAFavorAnioAnterior;

  ocultarBanner();
}

function mostrarBanner(html) {
  const el = q("banner-info");
  el.innerHTML = html;
  el.hidden = false;
}

function ocultarBanner() {
  q("banner-info").hidden = true;
}

// --- Leer formulario a un objeto declaración ---
function num(id) {
  return parseFloat(q(id).value) || 0;
}

function leerFormulario() {
  const d = declaracionActual;
  d.personaNombre = q("personaNombre").value.trim();
  d.tipoDocumento = q("tipoDocumento").value;
  d.numeroDocumento = q("numeroDocumento").value.trim();
  d.anioGravable = parseInt(q("anioGravable").value, 10) || d.anioGravable;
  d.notas = q("notas").value;

  d.patrimonio.activos = num("p_activos");
  d.patrimonio.pasivos = num("p_pasivos");

  d.cedulaGeneral.laboral.ingresosBrutos = num("i_lab_bruto");
  d.cedulaGeneral.laboral.aportesObligatoriosSaludPension = num("i_lab_aportes");
  d.cedulaGeneral.laboral.cesantiasEIntereses = num("i_lab_cesantias");
  d.cedulaGeneral.laboral.ingresoLaboralPromedio6Meses = num("i_lab_promedio6m");
  d.cedulaGeneral.laboral.rentaExentaManualActiva = q("d_exenta_manual_activa").checked;
  d.cedulaGeneral.laboral.rentaExentaManualValor = num("d_exenta_manual_valor");
  d.cedulaGeneral.comprasFacturaElectronica = num("d_compras_factura");
  d.cedulaGeneral.capital.intereses = num("i_cap_intereses");
  d.cedulaGeneral.capital.arriendos = num("i_cap_arriendos");
  d.cedulaGeneral.capital.otrosCapital = num("i_cap_otros");
  d.cedulaGeneral.capital.ingresosNoConstitutivos = num("i_cap_incrngo");
  d.cedulaGeneral.capital.costosYDeduccionesProcedentes = num("i_cap_costos");
  d.cedulaGeneral.noLaboral.honorariosServicios = num("i_nolab_honorarios");
  d.cedulaGeneral.noLaboral.otrosNoLaborales = num("i_nolab_otros");
  d.cedulaGeneral.noLaboral.ingresosNoConstitutivos = num("i_nolab_incrngo");
  d.cedulaGeneral.noLaboral.costosYDeduccionesProcedentes = num("i_nolab_costos");

  d.cedulaGeneral.deduccionesEspeciales.interesesVivienda = num("d_vivienda");
  d.cedulaGeneral.deduccionesEspeciales.saludPrepagada = num("d_salud");
  d.cedulaGeneral.deduccionesEspeciales.numeroDependientes = num("d_dependientes");
  d.cedulaGeneral.deduccionesEspeciales.aportesVoluntariosPensionAFC = num("d_voluntarios");

  d.pensiones.ingresoBrutoAnual = num("pen_anual");
  d.pensiones.ingresoBrutoMensualPromedio = num("pen_mensual");
  d.pensiones.ingresosNoConstitutivos = num("pen_incrngo");

  d.dividendos.dividendosGravables = num("div_gravables");
  d.dividendos.dividendosAnio2016yAnteriores = num("div_antiguos");
  d.dividendos.tarifaDividendosAntiguos = num("div_antiguos_tarifa") / 100;

  d.retenciones.retencionFuentePracticada = num("r_retencion");
  d.retenciones.autorretenciones = num("r_autorretencion");
  d.anticipos.anticipoRentaAnioAnterior = num("r_anticipo");
  d.anticipos.saldoAFavorAnioAnterior = num("r_saldofavor");

  return d;
}

// Mensaje del cruce entre los ingresos de la app y el "Tope 1 - Ingresos" de la DIAN.
function htmlCruceDian(c) {
  const dif = money(Math.abs(c.diferencia));
  const pct = (Math.abs(c.porcentaje) * 100).toFixed(1).replace(".", ",");
  const base = `Tope 1 de la DIAN: ${money(c.tope1Dian)} · ingresos en la app: ${money(c.ingresosApp)}.`;
  if (c.estado === "faltan_ingresos") {
    return `<div class="aviso"><strong>Te faltan ingresos por incluir.</strong> ${base} La DIAN tiene registrados ${dif} (${pct}%) más que tú. Revisa si falta algún certificado (otro empleador, fondo de cesantías, ventas, intereses) o pide al emisor o a tu contador el detalle de lo que reportó cada tercero. Declarar menos de lo que reportan terceros puede generar un requerimiento de la DIAN.</div>`;
  }
  if (c.estado === "ingresos_adicionales") {
    return `<div class="aviso-info">${base} Tus ingresos superan lo registrado por la DIAN en ${dif} (${pct}%). Es normal si recibes ingresos que ningún tercero reporta (efectivo, exterior); conserva los soportes.</div>`;
  }
  return `<div class="aviso-ok">${base} Coinciden (diferencia de ${dif}, dentro del redondeo).</div>`;
}

// Compara el año y el documento de un reporte de la DIAN con la declaración abierta, para no
// mezclar archivos de otra persona u otro año al manejar varias declaraciones.
function avisosMetadatos(meta) {
  const d = leerFormulario();
  const avisos = [];
  if (meta && meta.anio && meta.anio !== parseInt(d.anioGravable, 10)) {
    avisos.push(
      `Este archivo es del año ${meta.anio} y la declaración abierta es del año gravable ${d.anioGravable}.`
    );
  }
  const docForm = String(d.numeroDocumento || "").replace(/\D/g, "");
  if (meta && meta.documento && docForm && docForm !== meta.documento) {
    avisos.push(
      `El archivo es del documento ${meta.documento}, pero la declaración abierta es del ${d.numeroDocumento}. ¿Es de otra persona?`
    );
  }
  return {
    ok: avisos.length === 0,
    html: avisos.map((a) => `<div class="aviso"><strong>Revisa:</strong> ${a}</div>`).join(""),
  };
}

// Una declaración sin datos (nada digitado ni importado) no tiene un año que defender: si el archivo
// de la DIAN trae el suyo, se adopta en vez de avisar que no coincide. Con datos ya capturados solo se
// avisa (ver avisosMetadatos). Devuelve el aviso en HTML para mostrarlo, o "" si no cambió nada.
function sinDatosCapturados(valor, clave = "") {
  if (["anioGravable", "tipoDocumento", "notas"].includes(clave)) return true;
  if (valor && typeof valor === "object") return Object.entries(valor).every(([k, v]) => sinDatosCapturados(v, k));
  if (typeof valor === "number") return valor === 0;
  if (typeof valor === "string") return valor === "";
  return !valor;
}

function adoptarAnioDelArchivo(meta) {
  const anio = meta && meta.anio;
  if (!anio || anio < 2000 || anio > new Date().getFullYear()) return "";
  const d = leerFormulario();
  if (d.anioGravable === anio || !sinDatosCapturados(d)) return "";
  q("anioGravable").value = anio;
  renderizarResultado();
  return `<div class="aviso-info">La declaración estaba en blanco, así que se usó el año gravable del archivo: <strong>${anio}</strong>.</div>`;
}

// --- Renderizar resultado ---
function renderizarResultado() {
  const d = leerFormulario();
  const r = calcular(d);

  const avisosEl = q("avisos-calculo");
  avisosEl.innerHTML = r.avisos.map((a) => `<div class="aviso">${a}</div>`).join("");

  const linea = (label, valor, clase = "") =>
    `<div class="linea ${clase}"><span>${label}</span><span>${money(valor)}</span></div>`;

  let html = "";
  if (r.cruceDian) {
    html += `<div class="seccion-titulo">Cruce con la información exógena de la DIAN</div>`;
    html += htmlCruceDian(r.cruceDian);
  }
  html += `<div class="seccion-titulo">Patrimonio</div>`;
  html += linea("Patrimonio bruto (activos)", r.patrimonio.patrimonioBruto);
  html += linea("Pasivos", r.patrimonio.pasivos);
  html += linea("Patrimonio líquido", r.patrimonio.patrimonioLiquido, "subtotal");

  html += `<div class="seccion-titulo">Cédula general</div>`;
  html += linea("Ingresos brutos cédula general", r.ingresos.ingresosBrutosCedulaGeneral);
  html += linea("Ingresos no constitutivos de renta (aportes obligatorios)", r.ingresos.incrngo);
  if (r.ingresos.costosCapital || r.ingresos.costosNoLaboral) {
    html += linea(
      "Costos y deducciones procedentes (capital + no laboral)",
      r.ingresos.costosCapital + r.ingresos.costosNoLaboral
    );
  }
  html += linea("Ingreso neto cédula general", r.ingresos.ingresoNetoCedulaGeneral, "subtotal");
  html += linea("Deducciones especiales aplicadas", r.deducciones.totalDeduccionesEspeciales);
  if (r.deducciones.rentaExentaManualActiva) {
    html += `<div class="hint">Usando el valor manual de renta exenta laboral que ingresaste, en vez del cálculo automático del 25%+cesantías.</div>`;
  } else if (r.deducciones.cesantiasEIntereses) {
    html += linea(
      `Cesantías exentas (${Math.round(r.deducciones.porcentajeExencionCesantias * 100)}% de ${money(r.deducciones.cesantiasEIntereses)})`,
      r.deducciones.cesantiasExenta
    );
  }
  html += linea("Renta exenta laboral 25% + cesantías aplicada", r.deducciones.totalRentasExentas);
  if (r.deducciones.factorAjuste < 1) {
    html += `<div class="aviso">Tus deducciones y rentas exentas superaban el límite global (40% del ingreso neto, máx. 1.340 UVT/año) y fueron ajustadas proporcionalmente.</div>`;
  }
  if (r.deducciones.beneficioAdicionalPorDependientes) {
    html += linea(
      "Beneficio adicional por dependientes (72 UVT c/u, fuera del límite global)",
      r.deducciones.beneficioAdicionalPorDependientes
    );
  }
  if (r.deducciones.descuentoComprasFacturaElectronica) {
    html += linea(
      "1% compras con factura electrónica (fuera del límite global)",
      r.deducciones.descuentoComprasFacturaElectronica
    );
  }
  html += linea(
    "Renta líquida gravable cédula general",
    r.rentaLiquidaGravableCedulaGeneral,
    "subtotal"
  );

  html += `<div class="seccion-titulo">Pensiones</div>`;
  html += linea("Ingreso bruto anual por pensión", r.ingresos.pensionIngresoAnual);
  html += linea("Aportes a salud de la pensión (no constitutivos de renta)", r.ingresos.pensionIncrngo);
  html += linea("Parte exenta de la pensión", r.ingresos.pensionExentaAnual);
  html += linea("Renta gravable por pensión", r.ingresos.pensionGravable, "subtotal");

  html += `<div class="seccion-titulo">Impuesto</div>`;
  html += linea(
    "Base gravable cédula general + pensiones",
    r.impuesto.baseSinDividendosPesos
  );
  html += linea("Impuesto sobre cédula general + pensiones", r.impuesto.impuestoSinDividendosPesos);
  html += linea("Impuesto por dividendos (2017+)", r.impuesto.impuestoDividendosPesos);
  html += linea(
    "Impuesto por dividendos (2016 y anteriores)",
    r.impuesto.impuestoDividendosAntiguosPesos
  );
  html += linea("Impuesto de renta total", r.impuesto.impuestoTotal, "subtotal");

  html += `<div class="seccion-titulo">Retenciones y anticipos</div>`;
  html += linea("Total retenciones y autorretenciones", r.retenciones.totalRetenciones);
  html += linea("Anticipo de renta año anterior", r.anticipos.anticipoAnioAnterior);
  html += linea("Saldo a favor año anterior", r.anticipos.saldoAFavorAnioAnterior);

  const saldoLabel =
    r.saldoTipo === "a_pagar"
      ? "Saldo a pagar"
      : r.saldoTipo === "a_favor"
      ? "Saldo a favor"
      : "Saldo (sin diferencia)";
  const saldoClase = r.saldoTipo === "a_pagar" ? "saldo-a-pagar" : "saldo-a-favor";
  html += `<div class="linea total ${saldoClase}"><span>${saldoLabel}</span><span>${money(
    Math.abs(r.saldoNeto)
  )}</span></div>`;

  html += `<div class="seccion-titulo">Referencia: ¿obligado a declarar?</div>`;
  if (r.obligadoADeclarar.porPatrimonio === null) {
    html += `<div class="hint">No se puede verificar sin un valor de UVT configurado para este año.</div>`;
  } else {
    html += `<div class="hint">Supera tope de patrimonio bruto (4.500 UVT): ${
      r.obligadoADeclarar.porPatrimonio ? "Sí" : "No"
    }. Supera tope de ingresos brutos (1.400 UVT): ${
      r.obligadoADeclarar.porIngresos ? "Sí" : "No"
    }. Hay otros topes (consumos con tarjeta, consignaciones, compras) que esta herramienta no verifica todavía — revisa la resolución de la DIAN del año correspondiente.</div>`;
  }

  q("resultado").innerHTML = html;
}

// --- Estado de la declaración abierta ---
// La app no guarda nada. Para avisar antes de perder cambios se compara el contenido del formulario
// con el de la última vez que se exportó, abrió o creó una declaración.
let firmaLimpia = "";

function firmaActual() {
  return JSON.stringify(leerFormulario());
}

function marcarComoLimpio() {
  firmaLimpia = firmaActual();
}

function hayCambiosSinExportar() {
  return firmaActual() !== firmaLimpia;
}

function confirmarDescartarCambios(consecuencia) {
  return !hayCambiosSinExportar() || confirm(`Tienes cambios sin exportar. ${consecuencia} ¿Descartarlos?`);
}

function cargarDeclaracion(d) {
  declaracionActual = d;
  cargarFormulario(d);
  // El análisis de un archivo es de la declaración anterior: no debe poder aplicarse a esta.
  q("import-resultado").innerHTML = "";
  q("import-file").value = "";
  renderizarResultado();
  marcarComoLimpio();
}

window.addEventListener("beforeunload", (e) => {
  if (hayCambiosSinExportar()) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// --- Eventos del formulario ---
q("form-declaracion").addEventListener("submit", (e) => e.preventDefault());

q("btn-nueva").addEventListener("click", () => {
  if (!confirmarDescartarCambios("Se abrirá una declaración en blanco.")) return;
  cargarDeclaracion(plantillaDeclaracion());
  document.querySelector('.tab-btn[data-tab="documentos"]').click();
});

q("btn-siguiente-anio").addEventListener("click", () => {
  if (!confirmarDescartarCambios("Se reemplazará lo que tienes en pantalla por la declaración del año siguiente.")) return;
  const base = leerFormulario();
  const { declaracion, revisar } = derivarDeclaracionAnioSiguiente(base);
  cargarDeclaracion(declaracion);
  document.querySelector('.tab-btn[data-tab="patrimonio"]').click();
  mostrarBannerConCierre(`
    <strong>Declaración del año gravable ${declaracion.anioGravable} creada a partir de la de ${base.anioGravable}.</strong>
    <div>Se copió lo que persiste de un año a otro:</div>
    <ul>
      <li>Nombre y documento de la persona</li>
      <li>Dependientes económicos: ${declaracion.cedulaGeneral.deduccionesEspeciales.numeroDependientes}</li>
      <li>Patrimonio de cierre: activos ${money(declaracion.patrimonio.activos)} y pasivos ${money(declaracion.patrimonio.pasivos)}</li>
      <li>Saldo a favor del año anterior: ${money(declaracion.anticipos.saldoAFavorAnioAnterior)}</li>
    </ul>
    <div>Antes de seguir, revisa:</div>
    <ul>${revisar.map((t) => `<li>${t}</li>`).join("")}</ul>
  `);
});

// --- Documento Excel: exportar y abrir ---
// El documento es lo que la persona conserva: la hoja "Formulario 210" trae las casillas para
// digitar en la DIAN y la hoja "Datos" permite reabrirlo aquí (ver infraestructura/documento.js).
const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function mostrarBannerConCierre(html) {
  mostrarBanner(`${html}<button type="button" id="btn-cerrar-banner" class="btn btn-secondary">Entendido</button>`);
  q("btn-cerrar-banner").addEventListener("click", ocultarBanner);
}

function descargarArchivo(bytes, nombre, tipo) {
  const url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function exportarDocumento() {
  if (!window.XLSX) {
    alert("No se pudo cargar el generador de Excel (carpeta vendor/).");
    return;
  }
  const d = leerFormulario();
  const r = calcular(d);
  const casillas = construirCasillas210(d, r);
  const nombre = nombreArchivoDocumento(d);
  const libro = construirLibroDocumento(d, casillas, r.valorUvt, new Date().toISOString());
  descargarArchivo(XLSX.write(libro, { type: "array", bookType: "xlsx" }), nombre, TIPO_XLSX);
  marcarComoLimpio();
  const avisos = casillas.avisos.map((a) => `<div class="aviso">${esc(a)}</div>`).join("");
  mostrarBannerConCierre(`
    <strong>Documento exportado: ${esc(nombre)}</strong>
    <div>Quedó en tu carpeta de descargas. La hoja «Formulario 210» trae las casillas para digitar en la
    DIAN; la hoja «Datos» te permite reabrirlo con «Abrir documento». Conserva este archivo: es tu copia de
    la declaración.</div>
    ${avisos}
  `);
}

async function abrirDocumento(archivo) {
  if (!window.XLSX) {
    alert("No se pudo cargar el lector de Excel (carpeta vendor/).");
    return;
  }
  try {
    const resultado = leerLibroDocumento(XLSX.read(await archivo.arrayBuffer(), { type: "array" }));
    if (!resultado.ok) {
      alert(resultado.error);
      return;
    }
    if (!confirmarDescartarCambios("Se abrirá el documento y se reemplazará lo que tienes en pantalla.")) return;
    const avisos = [...resultado.avisos];
    const anio = resultado.declaracion.anioGravable;
    const uvtApp = getUvt(anio);
    if (resultado.uvt && !uvtApp) {
      usarUvtDelDocumento(anio, resultado.uvt);
      avisos.push(`La app no tenía la UVT de ${anio}; se tomó la del documento (${money(resultado.uvt)}) solo para esta sesión.`);
    } else if (resultado.uvt && uvtApp && resultado.uvt !== uvtApp) {
      avisos.push(`El documento se calculó con una UVT de ${money(resultado.uvt)} y la app tiene ${money(uvtApp)} para ${anio}; se usa la de la app.`);
    }
    cargarDeclaracion(resultado.declaracion);
    document.querySelector('.tab-btn[data-tab="resultado"]').click();
    mostrarBannerConCierre(`
      <strong>Documento abierto: ${esc(declaracionActual.personaNombre || "(sin nombre)")} · año gravable ${anio}.</strong>
      <div>Cuando termines, vuelve a exportarlo para conservar los cambios.</div>
      ${avisos.map((a) => `<div class="aviso">${esc(a)}</div>`).join("")}
    `);
  } catch (err) {
    console.error(err);
    alert(`No se pudo abrir el documento: ${err.message}`);
  }
}

q("btn-exportar-documento").addEventListener("click", exportarDocumento);
q("btn-exportar-documento-resultado").addEventListener("click", exportarDocumento);
q("btn-abrir-documento").addEventListener("click", () => q("input-abrir-documento").click());
q("input-abrir-documento").addEventListener("change", async (e) => {
  const archivo = e.target.files[0];
  e.target.value = "";
  if (archivo) await abrirDocumento(archivo);
});

document.querySelectorAll("#form-declaracion input, #form-declaracion select").forEach((el) => {
  el.addEventListener("input", renderizarResultado);
});

// --- Modal de configuración de UVT ---
// Los UVT oficiales vienen en dominio/taxRules.js. Los que se agregan aquí se recuerdan en el navegador hasta
// que se cambien o se quiten (ver infraestructura/uvtGuardados.js).
function renderizarTablaUvt() {
  const filas = Object.entries(UVT_BY_YEAR)
    .sort((a, b) => a[0] - b[0])
    .map(([anio, valor]) => {
      const recordado = uvtGuardados[anio] !== undefined;
      const oficial = UVT_OFICIALES[anio];
      const origen = recordado
        ? oficial
          ? `Agregado por ti (el oficial de la app es ${money(oficial)})`
          : "Agregado por ti, se recuerda en este navegador"
        : oficial
        ? "Oficial, incluido en la app"
        : "Solo en esta sesión (viene de un documento)";
      const quitar = recordado
        ? `<button type="button" class="btn btn-secondary btn-quitar-uvt" data-anio="${anio}">Quitar</button>`
        : "";
      return `<tr><td>${anio}</td><td>${money(valor)}</td><td class="hint">${origen}</td><td>${quitar}</td></tr>`;
    })
    .join("");
  q("tabla-uvt").innerHTML = `<tr><th>Año</th><th>Valor UVT</th><th>Origen</th><th></th></tr>${filas}`;
  q("tabla-uvt").querySelectorAll(".btn-quitar-uvt").forEach((boton) =>
    boton.addEventListener("click", () => {
      quitarUvtPersonalizado(boton.dataset.anio);
      renderizarTablaUvt();
      renderizarResultado();
    })
  );
}

q("btn-config").addEventListener("click", () => {
  renderizarTablaUvt();
  q("modal-config").hidden = false;
});

q("btn-cerrar-config").addEventListener("click", () => {
  q("modal-config").hidden = true;
  renderizarResultado();
});

q("btn-guardar-uvt").addEventListener("click", () => {
  const anio = parseInt(q("nuevo_uvt_anio").value, 10);
  const valor = parseFloat(q("nuevo_uvt_valor").value);
  if (!anio || !valor) {
    alert("Ingresa un año y un valor de UVT válidos.");
    return;
  }
  // Un UVT mal digitado distorsiona todo el impuesto: se rechazan valores fuera de lo razonable.
  if (anio < 2000 || anio > 2100 || valor < 20000 || valor > 200000) {
    alert("Revisa el año y el valor: el año debe estar entre 2000 y 2100 y la UVT entre $20.000 y $200.000.");
    return;
  }
  const recordado = guardarUvtPersonalizado(anio, valor);
  renderizarTablaUvt();
  renderizarResultado();
  q("nuevo_uvt_anio").value = "";
  q("nuevo_uvt_valor").value = "";
  if (!recordado) {
    alert("No se pudo guardar en este navegador (¿modo privado o datos bloqueados?). El valor se usa mientras la app esté abierta y viaja dentro del documento Excel que exportes.");
  }
});

// --- Importar datos desde archivo (PDF / Excel / CSV) ---
function opcionesCampoSelect(seleccionado) {
  const opciones = CAMPOS_IMPORTABLES.map(
    (c) =>
      `<option value="${c.id}" ${c.id === seleccionado ? "selected" : ""}>${c.label}</option>`
  ).join("");
  return `<option value="">-- Ignorar --</option>${opciones}`;
}

function aplicarValorACampo(campoId, valor) {
  const actual = parseFloat(q(campoId).value) || 0;
  q(campoId).value = actual + valor;
}

function renderizarResultadoImportPdf(sugerencias, textoCompleto) {
  const cont = q("import-resultado");
  if (sugerencias.length === 0) {
    cont.innerHTML = `<div class="aviso">No se reconoció ninguna etiqueta conocida en este PDF. Revisa el texto extraído abajo y digita los valores manualmente.</div>`;
  } else {
    const filas = sugerencias
      .map(
        (s, i) => `
        <tr>
          <td><input type="checkbox" data-idx="${i}" class="chk-sugerencia" checked /></td>
          <td>${s.etiqueta}<br /><span class="hint">Encontrado: "${s.textoEncontrado}"</span></td>
          <td><input type="number" class="valor-sugerencia" data-idx="${i}" value="${s.valor}" /></td>
        </tr>`
      )
      .join("");
    cont.innerHTML = `
      <table class="tabla-import">
        <tr><th>Aplicar</th><th>Campo detectado</th><th>Valor</th></tr>
        ${filas}
      </table>
      <button type="button" id="btn-aplicar-pdf" class="btn btn-primary">Aplicar seleccionados</button>
    `;
    q("btn-aplicar-pdf").addEventListener("click", () => {
      let aplicados = 0;
      cont.querySelectorAll(".chk-sugerencia").forEach((chk) => {
        if (chk.checked) {
          const idx = parseInt(chk.dataset.idx, 10);
          const valorInput = cont.querySelector(`.valor-sugerencia[data-idx="${idx}"]`);
          const valor = parseFloat(valorInput.value) || 0;
          aplicarValorACampo(sugerencias[idx].campoId, valor);
          aplicados++;
        }
      });
      renderizarResultado();
      alert(`Se aplicaron ${aplicados} valor(es) al formulario. Revisa las pestañas correspondientes.`);
    });
  }
  cont.innerHTML += `
    <details class="texto-extraido">
      <summary>Ver texto extraído del PDF (para revisar manualmente)</summary>
      <textarea readonly>${textoCompleto.replace(/</g, "&lt;")}</textarea>
    </details>`;
}

// Compara cada "Tope N - ..." reportado por la DIAN contra el valor equivalente ya calculado
// en la app, cuando existe uno comparable (ingresos, patrimonio). Es solo referencia — la
// DIAN misma advierte que esta información no reemplaza tu conocimiento de tu propia
// realidad económica, así que nunca se ofrece como algo para "aplicar" a un campo.
function compararTope(detalle, resultado) {
  const d = detalle.toLowerCase();
  if (/ingreso/.test(d)) {
    return { etiqueta: "Ingresos brutos totales en la app", valor: resultado.ingresos.ingresosBrutosTotales };
  }
  if (/patrimonio/.test(d)) {
    return { etiqueta: "Patrimonio bruto en la app", valor: resultado.patrimonio.patrimonioBruto };
  }
  return null;
}

function renderizarTopesImportados(topes, meta, { avisosMeta: mostrarAvisosMeta = true, cruce: mostrarCruce = true } = {}) {
  if (topes.length === 0) return "";
  const avisosMeta = avisosMetadatos(meta);
  // El Tope de ingresos solo se toma como referencia si el archivo es del mismo año y persona.
  const topeIngresos = topes.find((t) => /ingreso/i.test(t.detalle));
  if (topeIngresos && avisosMeta.ok) {
    declaracionActual.referenciasDian = { tope1Ingresos: topeIngresos.valor };
  }
  const resultado = calcular(leerFormulario());
  const filasTopes = topes
    .map((t) => {
      const comparacion = compararTope(t.detalle, resultado);
      const celdaComparacion = comparacion
        ? `${money(comparacion.valor)} <span class="hint">(${comparacion.etiqueta})</span>`
        : `<span class="hint">Sin equivalente calculado en la app</span>`;
      return `<tr><td>${t.detalle}</td><td>${money(t.valor)}</td><td>${celdaComparacion}</td></tr>`;
    })
    .join("");
  const cruce = mostrarCruce && topeIngresos && avisosMeta.ok ? resultado.cruceDian : null;
  return `
    ${mostrarAvisosMeta ? avisosMeta.html : ""}
    <p class="hint"><strong>Topes reportados por la DIAN (solo referencia):</strong> son los totales
    que la DIAN usa para revisar si estás obligado a declarar. No se pueden "aplicar" a un campo porque
    son sumas agregadas, no un concepto individual — úsalos para comparar contra lo que ya tienes en la
    app. Nota de la DIAN: esta información no es indispensable ni reemplaza tu conocimiento de tu propia
    realidad económica.</p>
    <table class="tabla-import">
      <tr><th>Tope (DIAN)</th><th>Valor reportado por terceros</th><th>Comparación</th></tr>
      ${filasTopes}
    </table>
    ${
      cruce
        ? htmlCruceDian(cruce) +
          '<p class="hint">Este Tope viaja en el documento que exportes y el cruce queda visible, actualizado a medida que llenas los ingresos, en la pestaña Resultado.</p>'
        : ""
    }
  `;
}

function renderizarResultadoImportExcel(grupos, topes, meta) {
  const cont = q("import-resultado");
  const htmlTopes = renderizarTopesImportados(topes || [], meta);
  if (grupos.length === 0) {
    cont.innerHTML =
      htmlTopes ||
      `<div class="aviso">No se encontraron filas con concepto y valor reconocibles. Verifica que el archivo tenga columnas de "Concepto"/"Detalle" y "Valor".</div>`;
    if (htmlTopes) {
      cont.innerHTML += `<div class="hint">En este archivo no se encontraron filas con detalle por concepto, solo el resumen de topes de arriba. Si esperabas ver el detalle por tercero, revisa que el archivo esté completo; mientras tanto diligencia tus ingresos en las demás pestañas.</div>`;
    }
    return;
  }
  const filas = grupos
    .map((g, i) => {
      const { campoId, origen } = sugerirCampoParaConcepto(g.concepto);
      const notaOrigen =
        origen === "palabra_clave" ? '<br /><span class="hint">Sugerido por palabra clave — revísalo</span>' : "";
      return `
      <tr>
        <td>${g.concepto}${notaOrigen}</td>
        <td>${money(g.total)}</td>
        <td>
          <select class="select-destino" data-idx="${i}">${opcionesCampoSelect(campoId)}</select>
        </td>
      </tr>`;
    })
    .join("");
  cont.innerHTML = `
    ${htmlTopes}
    <p class="hint">Se agruparon los valores por concepto. Asigna cada fila al campo del formulario que corresponda (o déjala en "Ignorar").</p>
    <table class="tabla-import">
      <tr><th>Concepto (según el archivo)</th><th>Total</th><th>Asignar a</th></tr>
      ${filas}
    </table>
    <button type="button" id="btn-aplicar-excel" class="btn btn-primary">Aplicar asignaciones</button>
  `;
  q("btn-aplicar-excel").addEventListener("click", () => {
    let aplicados = 0;
    cont.querySelectorAll(".select-destino").forEach((sel) => {
      const idx = parseInt(sel.dataset.idx, 10);
      if (sel.value) {
        aplicarValorACampo(sel.value, grupos[idx].total);
        aplicados++;
      }
    });
    renderizarResultado();
    alert(`Se aplicaron ${aplicados} valor(es) al formulario. Revisa las pestañas correspondientes.`);
  });
}

// --- Información exógena de la DIAN: importación automática ---
// Cada partida del reporte trae la casilla que la DIAN sugiere (R32, R74, R30...) y exogena.js la
// traduce al campo de la app. Los totales son del año completo, así que por defecto el valor
// REEMPLAZA al del campo; también se puede sumar o no aplicar, fila por fila.
function pestanaDeCampo(campoId) {
  const panel = q(campoId).closest(".tab-panel");
  const btn = panel && document.querySelector(`.tab-btn[data-tab="${panel.dataset.tab}"]`);
  return btn ? btn.textContent.trim() : "";
}

function accionInicialExogena(linea) {
  const actual = parseFloat(q(linea.campoId).value) || 0;
  if (Math.abs(actual - linea.valor) < 1) return "omitir";
  // El patrimonio de la exógena es parcial: un valor ya digitado no se pisa sin que el usuario elija.
  if (/^p_/.test(linea.campoId) && actual !== 0) return "omitir";
  return "reemplazar";
}

function htmlCruceExogena(c) {
  const dif = money(Math.abs(c.diferencia));
  const base = `Los ingresos que se importan suman ${money(c.ingresosApp)} y el Tope 1 de la DIAN es ${money(c.tope1Dian)}.`;
  if (c.estado === "coincide") {
    return `<div class="aviso-ok"><strong>Cruce con la DIAN correcto.</strong> ${base} Coinciden (diferencia de ${dif}, dentro del redondeo): ninguna partida de ingresos quedó por fuera.</div>`;
  }
  if (c.estado === "faltan_ingresos") {
    return `<div class="aviso"><strong>Faltan ingresos.</strong> ${base} La DIAN tiene ${dif} más: revisa las partidas que la app no pudo ubicar.</div>`;
  }
  return `<div class="aviso-info">${base} Lo importado supera al Tope 1 en ${dif}; revisa si alguna partida se está contando dos veces.</div>`;
}

function renderizarResultadoImportExogena(info) {
  const cont = q("import-resultado");
  const avisosMeta = avisosMetadatos(info.meta);
  const c = info.consultante || {};
  const hayLineas = info.lineas.length > 0;

  const filas = info.lineas
    .map((l, i) => {
      const actual = parseFloat(q(l.campoId).value) || 0;
      const igual = Math.abs(actual - l.valor) < 1;
      const accion = accionInicialExogena(l);
      const opcion = (valor, texto) => `<option value="${valor}" ${accion === valor ? "selected" : ""}>${texto}</option>`;
      const partidas = l.aportes
        .map(
          (a) =>
            `<li class="${a.contado ? "" : "no-contada"}">${esc(a.informante)} — ${esc(a.detalle)}: ${money(a.valor)}${
              a.contado ? "" : " (no se suma: ya está en otro reporte del mismo dinero)"
            }</li>`
        )
        .join("");
      const notas = l.notas.map((n) => `<span class="nota-exogena">${esc(n)}</span>`).join("");
      return `
      <tr>
        <td>${esc(l.etiqueta)} <span class="hint">(pestaña ${esc(pestanaDeCampo(l.campoId))})</span>
          ${notas}
          <details class="partidas-exogena"><summary>${l.aportes.length} partida(s) del reporte</summary><ul>${partidas}</ul></details>
        </td>
        <td>${money(l.valor)}</td>
        <td class="celda-actual" data-campo="${l.campoId}">${money(actual)}${igual ? ' <span class="hint">(igual)</span>' : ""}</td>
        <td><select class="select-accion-exogena" data-idx="${i}">
          ${opcion("reemplazar", "Reemplazar")}${opcion("sumar", "Sumar a lo actual")}${opcion("omitir", "No aplicar")}
        </select></td>
      </tr>`;
    })
    .join("");

  const donaciones = info.informativas.filter((x) => x.tipo === "donacion");
  const totalDonaciones = donaciones.reduce((s, x) => s + x.valor, 0);
  const htmlDonaciones = donaciones.length
    ? `<div class="aviso-info"><strong>Donaciones:</strong> la DIAN reporta ${money(totalDonaciones)} (casilla sugerida R123). La app aún no calcula el descuento tributario por donaciones (hasta el 25% de lo donado, Art. 257 ET, si la entidad califica); solo importa si te queda impuesto a cargo. Pregúntale a tu contador si te aplica.</div>`
    : "";
  const htmlSinUbicar = info.sinUbicar.length
    ? `<div class="aviso"><strong>${info.sinUbicar.length} partida(s) traen una casilla sugerida que la app no sabe ubicar.</strong> Digítalas tú en el formulario:<ul>${info.sinUbicar
        .map((x) => `<li>${esc(x.informante)} — ${esc(x.detalle)}: ${money(x.valor)} <span class="hint">(${esc(x.uso)})</span></li>`)
        .join("")}</ul></div>`
    : "";
  const htmlAdvertencias = `<div class="aviso-info"><ul>${info.advertencias.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>`;
  const htmlControles = info.controles.length
    ? `<details class="texto-extraido"><summary>${info.controles.length} partida(s) de control que no se importan (consumos con tarjeta, movimientos bancarios y compras: la DIAN solo las usa para sus cruces)</summary><ul>${info.controles
        .map((x) => `<li>${esc(x.informante)} — ${esc(x.detalle)}: ${money(x.valor)}</li>`)
        .join("")}</ul></details>`
    : "";

  const htmlRevision = `
    <p class="hint">La DIAN indica en este reporte en qué casilla sugiere declarar cada partida. La app la
    tradujo a los campos del formulario. Revisa cada fila y elige qué hacer: <strong>Reemplazar</strong>
    deja el valor de la DIAN (lo normal, porque los totales son del año completo), <strong>Sumar</strong> lo
    agrega a lo que ya tienes y <strong>No aplicar</strong> lo deja como está.</p>
    ${info.cruceTope1 ? htmlCruceExogena(info.cruceTope1) : ""}
    <table class="tabla-import">
      <tr><th>Campo de la app</th><th>Según la DIAN</th><th>Hoy en el formulario</th><th>Acción</th></tr>
      ${filas}
    </table>
    <label id="exogena-confirmar-otro-label" class="confirmar-otro" ${avisosMeta.ok ? "hidden" : ""}>
      <input type="checkbox" id="exogena-confirmar-otro" />
      Entiendo que este archivo no corresponde a esta declaración y quiero aplicarlo de todos modos
    </label>
    <button type="button" id="btn-aplicar-exogena" class="btn btn-primary">Aplicar al formulario</button>
    <p id="exogena-aplicado" class="hint"></p>`;
  const htmlSinPartidas = `<div class="aviso-info">${
    info.sinUbicar.length
      ? "La app no pudo ubicar ninguna partida de este reporte en el formulario; las que traen casilla sugerida están listadas abajo para que las digites tú."
      : "Este reporte no trae partidas con casilla sugerida para importar, solo los topes de referencia."
  } Si esperabas ver el detalle por tercero, revisa que hayas descargado el reporte completo desde tu cuenta de la DIAN; mientras tanto diligencia tus datos en las demás pestañas.</div>`;

  cont.innerHTML = `
    <p><strong>Reporte de información exógena de la DIAN</strong>${info.meta.anio ? ` · año ${info.meta.anio}` : ""}${
    c.nombre ? ` · ${esc(c.nombre)}` : ""
  }${info.meta.documento ? ` · documento ${esc(info.meta.documento)}` : ""}</p>
    ${avisosMeta.html}
    ${hayLineas ? htmlRevision : htmlSinPartidas}
    ${htmlDonaciones}
    ${htmlSinUbicar}
    ${htmlAdvertencias}
    <div id="exogena-topes">${renderizarTopesImportados(info.topes, info.meta, { avisosMeta: false, cruce: false })}</div>
    ${htmlControles}
  `;

  if (!hayLineas) return;
  q("btn-aplicar-exogena").addEventListener("click", () => {
    if (!avisosMetadatos(info.meta).ok && !q("exogena-confirmar-otro").checked) {
      q("exogena-confirmar-otro-label").hidden = false;
      alert("Este archivo no coincide con la declaración abierta (año o documento). Revisa el aviso, o marca la casilla de confirmación si quieres aplicarlo de todos modos.");
      return;
    }
    let aplicados = 0;
    cont.querySelectorAll(".select-accion-exogena").forEach((sel) => {
      if (sel.value === "omitir") return;
      const linea = info.lineas[parseInt(sel.dataset.idx, 10)];
      const actual = parseFloat(q(linea.campoId).value) || 0;
      q(linea.campoId).value = sel.value === "sumar" ? actual + linea.valor : linea.valor;
      aplicados++;
      // Evita que un segundo clic sume otra vez lo mismo.
      sel.value = "omitir";
      const celda = cont.querySelector(`.celda-actual[data-campo="${linea.campoId}"]`);
      celda.innerHTML = `${money(parseFloat(q(linea.campoId).value) || 0)} <span class="hint">✓ aplicado</span>`;
    });
    // Datos generales: solo se completan si estaban vacíos.
    const completados = [];
    if (!q("personaNombre").value.trim() && c.nombre) {
      q("personaNombre").value = c.nombre;
      completados.push("nombre");
    }
    if (!q("numeroDocumento").value.trim() && info.meta.documento) {
      q("numeroDocumento").value = info.meta.documento;
      if (c.tipoDocumento) q("tipoDocumento").value = c.tipoDocumento;
      completados.push("documento");
    }
    renderizarResultado();
    q("exogena-topes").innerHTML = renderizarTopesImportados(info.topes, info.meta, { avisosMeta: false });
    q("exogena-aplicado").textContent =
      (aplicados
        ? `Listo: se aplicaron ${aplicados} campo(s)${completados.length ? ` y se completó ${completados.join(" y ")}` : ""}.`
        : "No se aplicó ningún campo (todas las filas están en \"No aplicar\").") +
      " Completa lo que falta en las demás pestañas y exporta el documento.";
  });
}

// Informe de la DIAN "Facturas electrónicas adquiridas por año": la columna "Valor Susceptible
// Beneficio" ya viene neta de notas crédito y sin lo pagado en efectivo; es la base del 1%.
// A diferencia de los otros importes, este total se REEMPLAZA en el campo (es el total del año).
function renderizarResultadoImportFacturas(info) {
  const cont = q("import-resultado");
  const d = leerFormulario();
  const uvt = getUvt(parseInt(d.anioGravable, 10)) || 0;
  const avisosMeta = avisosMetadatos(info.meta);
  const filaND = info.totalNotasDebito
    ? `<tr><td>+ Notas débito</td><td>${money(info.totalNotasDebito)}</td></tr>`
    : "";
  cont.innerHTML = `
    ${avisosMeta.html}
    <p class="hint"><strong>Informe de facturas electrónicas adquiridas</strong> (${info.nFacturas} facturas).
    La DIAN ya excluye lo pagado en efectivo y descuenta las notas crédito: la columna "Valor Susceptible
    Beneficio" es la base del descuento del 1% (casilla 28).</p>
    <table class="tabla-import">
      <tr><td>Valor facturado (${info.nFacturas} facturas)</td><td>${money(info.totalFacturado)}</td></tr>
      <tr><td>− Notas crédito</td><td>${money(info.totalNotasCredito)}</td></tr>
      ${filaND}
      <tr><td>− Excluido por la DIAN (pagos en efectivo u otras causas)</td><td>${money(info.totalExcluido)}</td></tr>
      <tr><th>= Valor susceptible al beneficio</th><th>${money(info.totalSusceptible)}</th></tr>
    </table>
    <div class="grid">
      <label>Menos: compras que ya usaste como costo o deducción en otro lado
        <input type="number" id="facturas-ya-usadas" min="0" step="any" value="0" />
      </label>
    </div>
    <p>Base para el 1%: <strong id="facturas-base"></strong> · Descuento estimado (1%, tope 240 UVT):
    <strong id="facturas-descuento"></strong></p>
    <button type="button" id="btn-aplicar-facturas" class="btn btn-primary">
      Usar como "Total de compras que califican"
    </button>
    <p id="facturas-aplicado" class="hint"></p>
  `;
  const baseActual = () =>
    Math.max(info.totalSusceptible - (parseFloat(q("facturas-ya-usadas").value) || 0), 0);
  const actualizar = () => {
    const base = baseActual();
    q("facturas-base").textContent = money(base);
    q("facturas-descuento").textContent = uvt
      ? money(calcularDescuentoFacturaElectronica(base, uvt))
      : "(configura la UVT de este año)";
  };
  q("facturas-ya-usadas").addEventListener("input", actualizar);
  actualizar();
  q("btn-aplicar-facturas").addEventListener("click", () => {
    const base = Math.round(baseActual());
    q("d_compras_factura").value = base;
    renderizarResultado();
    q("facturas-aplicado").textContent = `Listo: "Total de compras que califican" (pestaña Deducciones) quedó en ${money(base)}.`;
  });
}

q("btn-analizar-archivo").addEventListener("click", async () => {
  const input = q("import-file");
  const file = input.files[0];
  if (!file) {
    alert("Selecciona primero un archivo.");
    return;
  }
  const cont = q("import-resultado");
  cont.innerHTML = `<div class="hint">Analizando archivo...</div>`;
  const nombre = file.name.toLowerCase();
  try {
    if (nombre.endsWith(".pdf")) {
      const texto = await extraerTextoPdf(file);
      const sugerencias = sugerirDesdeTextoPdf(texto);
      renderizarResultadoImportPdf(sugerencias, texto);
    } else if (nombre.endsWith(".xlsx") || nombre.endsWith(".xls") || nombre.endsWith(".csv")) {
      const filas = await leerFilasExcelOCsv(file);
      const facturas = analizarInformeFacturas(filas);
      if (facturas.encontrado) {
        const notaAnio = adoptarAnioDelArchivo(facturas.meta);
        renderizarResultadoImportFacturas(facturas);
        cont.insertAdjacentHTML("afterbegin", notaAnio);
        return;
      }
      const exogena = analizarExogenaDian(filas);
      if (exogena.encontrado) {
        const notaAnio = adoptarAnioDelArchivo(exogena.meta);
        renderizarResultadoImportExogena(exogena);
        renderizarResultado();
        cont.insertAdjacentHTML("afterbegin", notaAnio);
        return;
      }
      const { encontrado, grupos, topes } = agruparFilasPorConcepto(filas);
      if (!encontrado) {
        cont.innerHTML = `<div class="aviso">No se encontró una fila de encabezado con columnas de "Concepto"/"Detalle" y "Valor", ni es el informe de facturas electrónicas. Revisa que el archivo sea el reporte exportado directamente desde la DIAN.</div>`;
      } else {
        renderizarResultadoImportExcel(grupos, topes, extraerMetadatosInforme(filas));
        renderizarResultado();
      }
    } else {
      cont.innerHTML = `<div class="aviso">Formato no soportado. Usa un PDF, XLSX, XLS o CSV.</div>`;
    }
  } catch (err) {
    console.error(err);
    cont.innerHTML = `<div class="aviso">No se pudo leer el archivo: ${err.message}</div>`;
  }
});

// --- Copiar resumen de resultado para pegar en la DIAN ---
function generarResumenTexto() {
  const d = leerFormulario();
  const r = calcular(d);
  return [
    `Declaración de renta estimada - ${d.personaNombre} (Año gravable ${d.anioGravable})`,
    `Patrimonio líquido: ${money(r.patrimonio.patrimonioLiquido)}`,
    `Ingresos brutos cédula general: ${money(r.ingresos.ingresosBrutosCedulaGeneral)}`,
    `Ingresos no constitutivos de renta: ${money(r.ingresos.incrngo)}`,
    `Deducciones especiales aplicadas: ${money(r.deducciones.totalDeduccionesEspeciales)}`,
    `Renta exenta laboral 25% aplicada: ${money(r.deducciones.totalRentasExentas)}`,
    `Renta líquida gravable cédula general: ${money(r.rentaLiquidaGravableCedulaGeneral)}`,
    `Renta gravable por pensión: ${money(r.ingresos.pensionGravable)}`,
    `Impuesto de renta total: ${money(r.impuesto.impuestoTotal)}`,
    `Total retenciones y autorretenciones: ${money(r.retenciones.totalRetenciones)}`,
    `Anticipo año anterior: ${money(r.anticipos.anticipoAnioAnterior)}`,
    `Saldo a favor año anterior: ${money(r.anticipos.saldoAFavorAnioAnterior)}`,
    `${r.saldoTipo === "a_pagar" ? "Saldo a pagar" : "Saldo a favor"}: ${money(Math.abs(r.saldoNeto))}`,
  ].join("\n");
}

q("btn-copiar-resumen").addEventListener("click", async () => {
  const texto = generarResumenTexto();
  const textarea = q("resumen-texto");
  textarea.value = texto;
  textarea.hidden = false;
  try {
    await navigator.clipboard.writeText(texto);
    alert("Resumen copiado al portapapeles.");
  } catch (e) {
    textarea.focus();
    textarea.select();
    alert("No se pudo copiar automáticamente (permiso del navegador). El texto quedó seleccionado abajo: usa Ctrl+C.");
  }
});

// --- Inicio ---
q("version-app").textContent = VERSION_APP;
cargarFormulario(declaracionActual);
renderizarResultado();
marcarComoLimpio();
