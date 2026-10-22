// Documento Excel de la declaración. Es lo que la persona conserva: la app no necesita guardar nada.
//  - Hoja "Formulario 210": las casillas con sus valores, para digitar en el SI de la DIAN.
//  - Hoja "Datos": todos los datos de entrada y la UVT usada, para reabrir la declaración en la app
//    (o corregirlos directamente en Excel y volver a abrirla).
// Depende de SheetJS (XLSX), declaracion.js (plantillaDeclaracion) y formulario210.js.

const FORMATO_DOCUMENTO = "declaracion-renta-co";
const VERSION_DOCUMENTO = 1;
const HOJA_FORMULARIO = "Formulario 210";
const HOJA_DATOS = "Datos";

// id = el mismo identificador del campo en el formulario de la app. tipo: texto | numero | bool | porcentaje
// (el porcentaje se guarda como fracción en la declaración y se escribe como % en el documento).
const CAMPOS_DOCUMENTO = [
  { id: "personaNombre", etiqueta: "Nombre de la persona/entidad", ruta: "personaNombre", tipo: "texto" },
  { id: "tipoDocumento", etiqueta: "Tipo de documento", ruta: "tipoDocumento", tipo: "texto" },
  { id: "numeroDocumento", etiqueta: "Número de documento", ruta: "numeroDocumento", tipo: "texto" },
  { id: "anioGravable", etiqueta: "Año gravable", ruta: "anioGravable", tipo: "numero" },
  { id: "notas", etiqueta: "Notas", ruta: "notas", tipo: "texto" },
  { id: "p_activos", etiqueta: "Total activos (patrimonio bruto)", ruta: "patrimonio.activos", tipo: "numero" },
  { id: "p_pasivos", etiqueta: "Total pasivos (deudas)", ruta: "patrimonio.pasivos", tipo: "numero" },
  { id: "i_lab_bruto", etiqueta: "Salarios y pagos laborales (ingresos brutos)", ruta: "cedulaGeneral.laboral.ingresosBrutos", tipo: "numero" },
  { id: "i_lab_honorarios", etiqueta: "Honorarios y servicios sin costos (con renta exenta del 25%)", ruta: "cedulaGeneral.laboral.honorariosSinCostos", tipo: "numero" },
  { id: "i_hon_bruto", etiqueta: "Honorarios y servicios con costos: ingresos brutos (casilla 43)", ruta: "cedulaGeneral.honorarios.ingresosBrutos", tipo: "numero" },
  { id: "i_hon_incrngo", etiqueta: "Honorarios y servicios con costos: ingresos no constitutivos de renta (casilla 44)", ruta: "cedulaGeneral.honorarios.ingresosNoConstitutivos", tipo: "numero" },
  { id: "i_hon_costos", etiqueta: "Honorarios y servicios con costos: costos y gastos procedentes (casilla 45)", ruta: "cedulaGeneral.honorarios.costosYGastos", tipo: "numero" },
  { id: "i_lab_aportes", etiqueta: "Aportes obligatorios a salud y pensión", ruta: "cedulaGeneral.laboral.aportesObligatoriosSaludPension", tipo: "numero" },
  { id: "i_lab_cesantias", etiqueta: "Auxilio de cesantías e intereses (total)", ruta: "cedulaGeneral.laboral.cesantiasEIntereses", tipo: "numero" },
  { id: "i_lab_promedio6m", etiqueta: "Ingreso laboral promedio últimos 6 meses", ruta: "cedulaGeneral.laboral.ingresoLaboralPromedio6Meses", tipo: "numero" },
  { id: "d_exenta_manual_activa", etiqueta: "Usar renta exenta laboral manual (Sí/No)", ruta: "cedulaGeneral.laboral.rentaExentaManualActiva", tipo: "bool" },
  { id: "d_exenta_manual_valor", etiqueta: "Renta exenta laboral manual", ruta: "cedulaGeneral.laboral.rentaExentaManualValor", tipo: "numero" },
  { id: "d_compras_factura", etiqueta: "Total de compras que califican (1% factura electrónica)", ruta: "cedulaGeneral.comprasFacturaElectronica", tipo: "numero" },
  { id: "i_cap_intereses", etiqueta: "Capital: intereses y rendimientos financieros", ruta: "cedulaGeneral.capital.intereses", tipo: "numero" },
  { id: "i_cap_arriendos", etiqueta: "Capital: arriendos", ruta: "cedulaGeneral.capital.arriendos", tipo: "numero" },
  { id: "i_cap_otros", etiqueta: "Capital: otros ingresos", ruta: "cedulaGeneral.capital.otrosCapital", tipo: "numero" },
  { id: "i_cap_incrngo", etiqueta: "Capital: ingresos no constitutivos de renta", ruta: "cedulaGeneral.capital.ingresosNoConstitutivos", tipo: "numero" },
  { id: "i_cap_costos", etiqueta: "Capital: costos y deducciones procedentes", ruta: "cedulaGeneral.capital.costosYDeduccionesProcedentes", tipo: "numero" },
  { id: "i_nolab_honorarios", etiqueta: "No laboral: honorarios / servicios independientes", ruta: "cedulaGeneral.noLaboral.honorariosServicios", tipo: "numero" },
  { id: "i_nolab_otros", etiqueta: "No laboral: otros ingresos", ruta: "cedulaGeneral.noLaboral.otrosNoLaborales", tipo: "numero" },
  { id: "i_nolab_incrngo", etiqueta: "No laboral: ingresos no constitutivos de renta", ruta: "cedulaGeneral.noLaboral.ingresosNoConstitutivos", tipo: "numero" },
  { id: "i_nolab_costos", etiqueta: "No laboral: costos y deducciones procedentes", ruta: "cedulaGeneral.noLaboral.costosYDeduccionesProcedentes", tipo: "numero" },
  { id: "d_vivienda", etiqueta: "Intereses de vivienda", ruta: "cedulaGeneral.deduccionesEspeciales.interesesVivienda", tipo: "numero" },
  { id: "d_salud", etiqueta: "Medicina prepagada / seguros de salud", ruta: "cedulaGeneral.deduccionesEspeciales.saludPrepagada", tipo: "numero" },
  { id: "d_dependientes", etiqueta: "Número de dependientes económicos", ruta: "cedulaGeneral.deduccionesEspeciales.numeroDependientes", tipo: "numero" },
  { id: "d_voluntarios", etiqueta: "Aportes voluntarios a pensión / cuentas AFC", ruta: "cedulaGeneral.deduccionesEspeciales.aportesVoluntariosPensionAFC", tipo: "numero" },
  { id: "pen_anual", etiqueta: "Pensiones: ingreso bruto anual", ruta: "pensiones.ingresoBrutoAnual", tipo: "numero" },
  { id: "pen_mensual", etiqueta: "Pensiones: ingreso bruto mensual promedio", ruta: "pensiones.ingresoBrutoMensualPromedio", tipo: "numero" },
  { id: "pen_incrngo", etiqueta: "Pensiones: ingresos no constitutivos de renta (aportes a salud)", ruta: "pensiones.ingresosNoConstitutivos", tipo: "numero" },
  { id: "div_gravables", etiqueta: "Dividendos gravables (2017 en adelante)", ruta: "dividendos.dividendosGravables", tipo: "numero" },
  { id: "div_antiguos", etiqueta: "Dividendos de 2016 y anteriores", ruta: "dividendos.dividendosAnio2016yAnteriores", tipo: "numero" },
  { id: "div_antiguos_tarifa", etiqueta: "Tarifa de los dividendos de 2016 y anteriores (%)", ruta: "dividendos.tarifaDividendosAntiguos", tipo: "porcentaje" },
  { id: "r_retencion", etiqueta: "Retención en la fuente practicada", ruta: "retenciones.retencionFuentePracticada", tipo: "numero" },
  { id: "r_autorretencion", etiqueta: "Autorretenciones", ruta: "retenciones.autorretenciones", tipo: "numero" },
  { id: "r_anticipo", etiqueta: "Anticipo de renta del año anterior", ruta: "anticipos.anticipoRentaAnioAnterior", tipo: "numero" },
  { id: "r_saldofavor", etiqueta: "Saldo a favor del año anterior", ruta: "anticipos.saldoAFavorAnioAnterior", tipo: "numero" },
  { id: "tope1Ingresos", etiqueta: "Tope 1 - Ingresos de la exógena de la DIAN (referencia)", ruta: "referenciasDian.tope1Ingresos", tipo: "numero" },
  { id: "tope2Patrimonio", etiqueta: "Tope 2 - Patrimonio de la exógena de la DIAN (referencia)", ruta: "referenciasDian.tope2Patrimonio", tipo: "numero" },
  { id: "tope3ConsumosTarjeta", etiqueta: "Tope 3 - Consumos con tarjeta de la exógena de la DIAN (referencia)", ruta: "referenciasDian.tope3ConsumosTarjeta", tipo: "numero" },
  { id: "tope4Movimientos", etiqueta: "Tope 4 - Consignaciones e inversiones de la exógena de la DIAN (referencia)", ruta: "referenciasDian.tope4Movimientos", tipo: "numero" },
  { id: "tope5Compras", etiqueta: "Tope 5 - Compras de la exógena de la DIAN (referencia)", ruta: "referenciasDian.tope5Compras", tipo: "numero" },
];

function leerPorRuta(obj, ruta) {
  return ruta.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function escribirPorRuta(obj, ruta, valor) {
  const claves = ruta.split(".");
  const ultima = claves.pop();
  const destino = claves.reduce((o, k) => o[k], obj);
  destino[ultima] = valor;
}

function partirTexto(texto, ancho) {
  const lineas = [];
  let actual = "";
  String(texto).split(" ").forEach((palabra) => {
    if ((actual + " " + palabra).trim().length > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = (actual + " " + palabra).trim();
    }
  });
  if (actual) lineas.push(actual);
  return lineas;
}

function nombreArchivoDocumento(d) {
  const quien = String(d.numeroDocumento || d.personaNombre || "sin-nombre").trim();
  return `Declaracion-renta-${quien}-${d.anioGravable}.xlsx`.replace(/[^A-Za-z0-9._-]+/g, "_");
}

// Construye el libro de Excel (objeto de SheetJS) con las dos hojas.
function construirLibroDocumento(d, casillas, uvt, fechaIso) {
  // --- Hoja "Formulario 210" ---
  const aoa = [
    ["FORMULARIO 210 · Declaración de renta y complementario, personas naturales y asimiladas residentes"],
    [`Año gravable ${d.anioGravable}`],
    ["Declarante", d.personaNombre || "(sin nombre)"],
    ["Documento", `${d.tipoDocumento} ${d.numeroDocumento}`.trim()],
    ["UVT usada", uvt || "(sin configurar)"],
    [],
  ];
  if (!casillas.disponible) {
    casillas.avisos.forEach((a) => aoa.push(["", a]));
  } else {
    aoa.push(["Casilla", "Concepto", "Valor ($)", "Cómo diligenciarla"]);
    casillas.filas.forEach((f) => {
      if (f.tipo === "seccion") {
        aoa.push([]);
        aoa.push(["", f.titulo.toUpperCase()]);
      } else {
        aoa.push([f.n, f.nombre, f.valor, f.como]);
      }
    });
  }
  aoa.push([], ["", "NOTAS"]);
  casillas.notas.forEach((nota) => partirTexto(nota, 120).forEach((linea) => aoa.push(["", linea])));
  const hojaFormulario = XLSX.utils.aoa_to_sheet(aoa);
  hojaFormulario["!cols"] = [{ wch: 9 }, { wch: 88 }, { wch: 18 }, { wch: 62 }];
  Object.keys(hojaFormulario).forEach((k) => {
    if (k[0] === "!") return;
    const { c } = XLSX.utils.decode_cell(k);
    if (c === 2 && hojaFormulario[k].t === "n") hojaFormulario[k].z = "#,##0";
  });

  // --- Hoja "Datos" ---
  const datos = [
    ["Campo", "Descripción", "Valor"],
    ["formato", "Formato del documento (no lo modifiques)", FORMATO_DOCUMENTO],
    ["version", "Versión del formato (no la modifiques)", VERSION_DOCUMENTO],
    ["exportado", "Fecha de exportación", fechaIso],
    ["uvt", "UVT usada en el cálculo", uvt || ""],
  ];
  CAMPOS_DOCUMENTO.forEach((c) => {
    let valor = leerPorRuta(d, c.ruta);
    if (c.tipo === "bool") valor = valor ? "Sí" : "No";
    else if (c.tipo === "porcentaje") valor = Math.round((valor || 0) * 10000) / 100;
    else if (c.tipo === "numero") valor = valor || 0;
    else valor = valor == null ? "" : String(valor);
    datos.push([c.id, c.etiqueta, valor]);
  });
  const hojaDatos = XLSX.utils.aoa_to_sheet(datos);
  hojaDatos["!cols"] = [{ wch: 24 }, { wch: 62 }, { wch: 40 }];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaFormulario, HOJA_FORMULARIO);
  XLSX.utils.book_append_sheet(libro, hojaDatos, HOJA_DATOS);
  return libro;
}

function aNumeroDocumento(valor) {
  if (typeof valor === "number") return valor;
  const n = parseFloat(String(valor).replace(/[^\d.,-]/g, "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

// Lee un libro de Excel exportado por esta app y devuelve la declaración y la UVT que traía.
function leerLibroDocumento(libro) {
  const hoja = libro.Sheets && libro.Sheets[HOJA_DATOS];
  if (!hoja) {
    return { ok: false, error: `El archivo no tiene la hoja "${HOJA_DATOS}": no es un documento exportado por esta app.` };
  }
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });
  const porId = {};
  filas.forEach((f) => {
    if (String(f[0]).trim()) porId[String(f[0]).trim()] = f[2];
  });
  if (porId.formato !== FORMATO_DOCUMENTO) {
    return { ok: false, error: `La hoja "${HOJA_DATOS}" no tiene el formato de esta app (se esperaba "${FORMATO_DOCUMENTO}").` };
  }
  const avisos = [];
  const version = Number(porId.version) || 0;
  if (version > VERSION_DOCUMENTO) {
    avisos.push(`El documento es de una versión más nueva del formato (${version}); puede traer datos que esta app no entiende.`);
  }
  const d = plantillaDeclaracion();
  CAMPOS_DOCUMENTO.forEach((c) => {
    if (!(c.id in porId)) return;
    const crudo = porId[c.id];
    if (c.tipo === "texto") {
      escribirPorRuta(d, c.ruta, String(crudo));
    } else if (c.tipo === "bool") {
      escribirPorRuta(d, c.ruta, /^(s[ií]|true|1|x)$/i.test(String(crudo).trim()));
    } else {
      const n = crudo === "" ? 0 : aNumeroDocumento(crudo);
      if (Number.isNaN(n)) {
        avisos.push(`El valor de "${c.etiqueta}" no es un número ("${crudo}"); se usó 0.`);
        escribirPorRuta(d, c.ruta, 0);
      } else {
        escribirPorRuta(d, c.ruta, c.tipo === "porcentaje" ? n / 100 : n);
      }
    }
  });
  const uvt = porId.uvt === "" || porId.uvt === undefined ? null : aNumeroDocumento(porId.uvt);
  return { ok: true, declaracion: d, uvt: Number.isFinite(uvt) ? uvt : null, avisos };
}
