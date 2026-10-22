// Exógena de la DIAN INVENTADA (misma estructura que el Excel real "Consulta de Información reportada por
// terceros"), para probar sin usar archivos de nadie. Todos los nombres, documentos y valores son falsos.
const path = require("path");
const { RAIZ } = require("./cargar.js");

const ENCABEZADO = ["NIT", "Nombre / Razón Social", "NIT", "Nombre/Razón Social reportada por ", "Detalle", "Valor", "Uso declaración Sugerida", "Información Adicional "];
const CONSULTANTE = ["900000001", "NOMBRE DE EJEMPLO"];

// Partida: [nitInformante, nombreInformante, detalle, valor, uso, adicional]
function partida(nit, nombre, detalle, valor, uso, adicional = "") {
  return [nit, nombre, "1000000000", "NOMBRE DE EJEMPLO", detalle, valor, uso, adicional];
}

function filasExogena({ anio = 2025, documento = "1000000000", nombre = "NOMBRE DE EJEMPLO", topes = {}, partidas = [] } = {}) {
  const f = [];
  f.push(["", "", "Consulta de Información reportada ", "", "", "", "", ""]);
  f.push(["ARCHIVO DE EJEMPLO CON DATOS INVENTADOS: no es un reporte de la DIAN ni corresponde a ninguna persona real", "", "", "", "", "", "Fecha Reporte:", 46300.5]);
  f.push(["Fecha corte del proceso: ", "", 46299, "", "", "", "", ""]);
  f.push(["Año al que se refiere la consulta:", "", String(anio), "", "", "", "", ""]);
  f.push(["Identificación del consultante", "", "", "", "", "", "", ""]);
  f.push(["Tipo de documento:", "", "C. C.", "", "", "", "", ""]);
  f.push(["Identificación:", "", documento, "", "", "", "", ""]);
  f.push(["Nombres / Razón social:", "", nombre, "", "", "", "", ""]);
  f.push(["", "", "", "", "", "", "", ""]);
  f.push(["Si esta información presenta inconsistencias, debe comunicarse con quien la reporta", "", "", "", "", "", "", ""]);
  f.push(["IMPORTANTE: la información exógena NO ES INDISPENSABLE", "", "", "", "", "", "", ""]);
  f.push(["", "", "", "", "", "", "", ""]);
  f.push(["Persona que reporta", "", "Información reportada", "", "", "", "", ""]);
  f.push(ENCABEZADO);
  const nombresTopes = { tope1: "Tope 1 - Ingresos", tope2: "Tope 2 - Patrimonio", tope3: "Tope 3 - Consumo TC", tope4: "Tope 4 - Movimiento", tope5: "Tope 5 - Compras" };
  Object.entries(nombresTopes).forEach(([k, texto]) => { if (topes[k] !== undefined) f.push(["", "", "", "", texto, topes[k], "", ""]); });
  partidas.forEach((p) => f.push(p));
  return f;
}

// Libro .xlsx (Buffer) con esas filas, usando la SheetJS incluida en vendor/.
function libroExogena(opciones) {
  const XLSX = require(path.join(RAIZ, "vendor", "xlsx.full.min.js"));
  const hoja = XLSX.utils.aoa_to_sheet(filasExogena(opciones));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Reporte");
  return XLSX.write(libro, { type: "buffer", bookType: "xlsx" });
}

// Un caso completo de ejemplo: empleado con pensión pequeña, ingresos de un colegio y cuentas.
// Los valores esperados de cada campo están en `esperado`, calculados a mano.
function casoEjemplo() {
  const P = partida;
  const partidas = [
    P("800000001", "EMPRESA DE EJEMPLO S.A.S.", "Pagos laborales: salarios (Concepto: 2276)", 60000000, "Tope 1: Ingresos brutos | R32 Ingresos brutos por rentas de trabajo"),
    P("800000001", "EMPRESA DE EJEMPLO S.A.S.", "Aportes obligatorios a salud a cargo Trabajador (Concepto: 2276)", 2400000, "Ingresos no constitutivos de renta | Asignación según el tipo de renta: R33 (Trabajo) / R59 (Capital) / R100 (Pensiones)"),
    P("800000001", "EMPRESA DE EJEMPLO S.A.S.", "Retención en la fuente por salarios (Concepto: 2276)", 1500000, "R132 Retenciones año gravable a declarar"),
    P("800000002", "COLEGIO DE EJEMPLO", "Otros ingresos (Concepto: 5016)", 10000000, "Tope 1: Ingresos brutos | R74 Ingresos brutos rentas no laborales"),
    P("800000002", "COLEGIO DE EJEMPLO", "Otras retenciones (Concepto: 5016)", 200000, "R132 Retenciones año gravable a declarar"),
    P("800000003", "BANCO DE EJEMPLO S.A.", "Saldo cuentas bancarias (Titular Principal)", 5000000, "Tope 2: Patrimonio | R29 Patrimonio Bruto (si el saldo es positivo)| R30 Deudas (si el saldo es negativo)", "Número de Cuenta / Documento: 1 | Concepto Códigos Tributaria: *1* Cuenta de ahorro"),
    P("800000003", "BANCO DE EJEMPLO S.A.", "Cuentas por pagar de clientes (Concepto: 1315)", 800000, "R30 Deudas"),
    P("800000004", "FONDO DE EJEMPLO", "Saldo a favor", 0, ""),
    P("1000000000", "NOMBRE DE EJEMPLO", "Total saldo a favor", 300000, "R131 Saldo a favor del año gravable anterior sin solicitud de devolución y/o compensación"),
    P("800000005", "ENTIDAD DE EJEMPLO", "Monto total de facturación electrónica susceptible de beneficio", 7000000, ""),
    P("800000005", "ENTIDAD DE EJEMPLO", "Suma valor total facturas tras ajustes por notas", 9000000, "Tope 5: Compras registradas en Factura Electrónica"),
    P("800000006", "TARJETA DE EJEMPLO", "Total consumos o gastos con tarjeta Crédito o Débito (Concepto: 1023)", 4000000, "Tope 3: Consumos TC", "Número de Cuenta / Documento: 1 | Clase de Tarjeta: *1* Tarjeta de Credito Principal"),
    P("800000003", "BANCO DE EJEMPLO S.A.", "Valor total de los movimientos en cuentas corrientes y de ahorros (Titular Principal)", 30000000, "Tope 4: Consignaciones e inversiones"),
  ];
  return {
    opciones: { anio: 2025, documento: "1000000000", nombre: "NOMBRE DE EJEMPLO", topes: { tope1: 70000000, tope2: 5000000, tope3: 4000000, tope4: 30000000, tope5: 9000000 }, partidas },
    esperado: { i_lab_bruto: 60000000, i_lab_aportes: 2400000, i_nolab_otros: 10000000, r_retencion: 1700000, p_activos: 5000000, p_pasivos: 800000, r_saldofavor: 300000, d_compras_factura: 7000000 },
  };
}

module.exports = { filasExogena, libroExogena, casoEjemplo, partida };
