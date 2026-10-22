// ¿Estoy obligado a declarar renta? (persona natural residente). Revisa los cinco topes de los artículos 592 y
// 594-3 del Estatuto Tributario con los datos de la app y con los topes que la DIAN reporta en la exógena.
//
// Una persona NO está obligada solo si cumple todos estos requisitos; basta con que falle uno para tener que declarar:
//   - patrimonio bruto a 31 de diciembre: "no exceda de 4.500 UVT"           → declara si supera 4.500 UVT
//   - ingresos brutos del año: "inferiores a 1.400 UVT"                       → declara con 1.400 UVT o más
//   - consumos con tarjeta de crédito: "no excedan de 1.400 UVT"              → declara si superan 1.400 UVT
//   - compras y consumos totales: "no superen 1.400 UVT"                      → declara si superan 1.400 UVT
//   - consignaciones, depósitos o inversiones: "no exceda de 1.400 UVT"       → declara si superan 1.400 UVT
// No revisa otras condiciones (responsable de IVA, no residentes, Régimen Simple, reglas especiales de
// asalariados del art. 593): se avisa en las notas.
//
// Los datos de la app solo cubren patrimonio e ingresos; los otros tres topes salen de la exógena (Tope 3, 5 y 4).
// Cuando hay dos fuentes se usa la mayor, que es lo prudente. Un valor 0 o ausente cuenta como "sin dato".

const miles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const CRITERIOS_OBLIGACION = [
  { id: "patrimonio", nombre: "Patrimonio bruto a 31 de diciembre", uvt: () => OBLIGACION_DECLARAR_TOPES_UVT.patrimonioBruto, incluyeElTope: false, datoApp: "patrimonioApp", campoDian: "tope2Patrimonio", topeDian: "Tope 2" },
  { id: "ingresos", nombre: "Ingresos brutos del año", uvt: () => OBLIGACION_DECLARAR_TOPES_UVT.ingresosBrutos, incluyeElTope: true, datoApp: "ingresosApp", campoDian: "tope1Ingresos", topeDian: "Tope 1" },
  { id: "consumosTarjeta", nombre: "Consumos con tarjeta de crédito", uvt: () => OBLIGACION_DECLARAR_TOPES_UVT.consumosTarjetaCredito, incluyeElTope: false, datoApp: null, campoDian: "tope3ConsumosTarjeta", topeDian: "Tope 3" },
  { id: "compras", nombre: "Compras y consumos totales", uvt: () => OBLIGACION_DECLARAR_TOPES_UVT.comprasYConsumosTotales, incluyeElTope: false, datoApp: null, campoDian: "tope5Compras", topeDian: "Tope 5" },
  { id: "consignaciones", nombre: "Consignaciones, depósitos o inversiones", uvt: () => OBLIGACION_DECLARAR_TOPES_UVT.consignacionesEInversiones, incluyeElTope: false, datoApp: null, campoDian: "tope4Movimientos", topeDian: "Tope 4" },
];

const NOTAS_OBLIGACION = [
  "No se revisan otras condiciones que también obligan a declarar: ser responsable de IVA, no ser residente en Colombia o pertenecer al Régimen Simple, ni las reglas especiales de asalariados (art. 593 ET).",
  "Aunque no estés obligado, puedes declarar de forma voluntaria; por ejemplo, para recuperar retenciones que te practicaron.",
];

// datos = { valorUvt, ingresosApp, patrimonioApp, referenciasDian }
function evaluarObligacionDeclarar({ valorUvt, ingresosApp = 0, patrimonioApp = 0, referenciasDian = {} } = {}) {
  if (!valorUvt) return { disponible: false, estado: "sin_uvt", criterios: [], motivos: [], pendientes: [], notas: NOTAS_OBLIGACION };
  const datos = { ingresosApp, patrimonioApp };
  const criterios = CRITERIOS_OBLIGACION.map((def) => {
    const uvt = def.uvt();
    const topePesos = uvt * valorUvt;
    const valorApp = def.datoApp ? datos[def.datoApp] || 0 : 0;
    const valorDian = (referenciasDian && referenciasDian[def.campoDian]) || 0;
    const conDato = [valorApp, valorDian].filter((v) => v > 0);
    const valorUsado = conDato.length ? Math.max(...conDato) : null;
    const supera = valorUsado === null ? null : def.incluyeElTope ? valorUsado >= topePesos : valorUsado > topePesos;
    return {
      id: def.id,
      nombre: def.nombre,
      regla: `${def.incluyeElTope ? "" : "más de "}${miles(uvt)} UVT${def.incluyeElTope ? " o más" : ""}`,
      topeDian: def.topeDian,
      uvt,
      topePesos,
      valorApp: def.datoApp ? valorApp : null,
      valorDian: valorDian || null,
      valorUsado,
      supera,
    };
  });
  const superan = criterios.filter((c) => c.supera === true);
  const sinDato = criterios.filter((c) => c.supera === null);
  return {
    disponible: true,
    estado: superan.length ? "obligado" : sinDato.length ? "incompleto" : "no_obligado",
    criterios,
    motivos: superan.map((c) => c.nombre),
    pendientes: sinDato.map((c) => c.nombre),
    notas: NOTAS_OBLIGACION,
  };
}
