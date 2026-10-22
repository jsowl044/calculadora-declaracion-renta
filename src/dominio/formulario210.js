// Formulario 210 (año gravable 2023 y siguientes): casillas calculadas a partir de una declaración.
// Los nombres y las fórmulas son los del instructivo oficial de la DIAN. El SI de Diligenciamiento
// aproxima cada casilla al múltiplo de mil más cercano y calcula las casillas derivadas a partir de
// esos valores ya aproximados; aquí se hace igual, para que lo que ves coincida con lo que debe
// mostrar el formulario cuando digitas las casillas marcadas "Digítala".
// Depende de taxRules.js (LIMITS), calculator.js (calcularImpuestoPorTabla241) y declaracion.js
// (redondearAMiles).

const COMO_DIGITAR = "Digítala";
const COMO_DIGITAR_APP = "Digítala (la calcula esta app)";
const COMO_CALCULADA = "La calcula el SI (verifica que coincida)";
const COMO_ANTERIOR = "El SI la trae de tu declaración anterior si la presentaste en la DIAN; verifícala";

// [casilla, nombre oficial, cómo se diligencia, se muestra aunque valga 0]
const SECCIONES_210 = [
  {
    titulo: "Patrimonio y beneficios",
    casillas: [
      [29, "Total patrimonio bruto", COMO_DIGITAR, true],
      [30, "Deudas", COMO_DIGITAR, true],
      [31, "Total patrimonio líquido (29 − 30)", COMO_CALCULADA, true],
      [297, "Valor compras con factura electrónica (el SI la habilita cuando respondes que hiciste compras que cumplen el num. 5 art. 336 E.T.)", COMO_DIGITAR, false],
      [28, "Uno por ciento (1%) de compras con factura electrónica", "La calcula el SI a partir de la casilla 297", false],
    ],
  },
  {
    titulo: "Cédula general · Rentas de trabajo",
    casillas: [
      [32, "Ingresos brutos de las Rentas de trabajo", COMO_DIGITAR, true],
      [355, "Salarios (el SI habilita la 355 y la 356 al diligenciar la 32; no salen en el PDF; la 356, Honorarios sin costos, queda en 0)", COMO_DIGITAR, false],
      [356, "Honorarios sin costos (el SI la habilita al diligenciar la 32; no sale en el PDF)", COMO_DIGITAR, false],
      [33, "Ingresos no constitutivos de renta de las Rentas de trabajo", COMO_DIGITAR, true],
      [34, "Renta líquida de las Rentas de trabajo (32 − 33)", COMO_CALCULADA, true],
      [35, "Rentas exentas de las Rentas de trabajo – Aportes voluntarios AFC, FVP y/o AVC", COMO_DIGITAR, false],
      [36, "Rentas exentas de las Rentas de trabajo – Otras rentas exentas", COMO_DIGITAR_APP, true],
      [37, "Total rentas exentas de las Rentas de trabajo (35 + 36)", COMO_CALCULADA, false],
      [38, "Deducciones imputables a las Rentas de trabajo – Intereses de vivienda", COMO_DIGITAR, false],
      [39, "Deducciones imputables a las Rentas de trabajo – Otras deducciones imputables", COMO_DIGITAR_APP, true],
      [40, "Total deducciones imputables a las Rentas de trabajo (38 + 39)", COMO_CALCULADA, false],
      [41, "Rentas exentas y/o deducciones imputables a las Rentas de trabajo (Limitadas)", "La calcula el SI respetando el límite del 40% (máximo 1.340 UVT)", true],
      [42, "Renta líquida ordinaria de las Rentas de trabajo (34 − 41)", COMO_CALCULADA, true],
    ],
  },
  {
    titulo: "Cédula general · Rentas de capital",
    casillas: [
      [58, "Ingresos brutos de las Rentas de capital", COMO_DIGITAR, false],
      [59, "Ingresos no constitutivos de renta de las Rentas de capital", COMO_DIGITAR, false],
      [60, "Costos y deducciones procedentes de las Rentas de capital", COMO_DIGITAR, false],
      [61, "Renta líquida de las Rentas de capital (58 − 59 − 60)", COMO_CALCULADA, false],
      [70, "Renta líquida ordinaria del ejercicio de las Rentas de capital", COMO_CALCULADA, false],
      [73, "Renta líquida ordinaria de las Rentas de capital", COMO_CALCULADA, false],
    ],
  },
  {
    titulo: "Cédula general · Rentas no laborales",
    casillas: [
      [74, "Ingresos brutos de las Rentas no laborales", COMO_DIGITAR, false],
      [76, "Ingresos no constitutivos de renta de las Rentas no laborales", COMO_DIGITAR, false],
      [77, "Costos y deducciones procedentes de las Rentas no laborales", COMO_DIGITAR, false],
      [78, "Renta líquida de las Rentas no laborales (74 − 75 − 76 − 77)", COMO_CALCULADA, false],
      [87, "Renta líquida ordinaria del ejercicio de las Rentas no laborales", COMO_CALCULADA, false],
      [90, "Renta líquida ordinaria de las Rentas no laborales", COMO_CALCULADA, false],
    ],
  },
  {
    titulo: "Cédula general · Totales",
    casillas: [
      [91, "Renta líquida cédula general (41 + 42 + 53 + 57 + 69 + 73 + 86 + 90)", COMO_CALCULADA, true],
      [92, "Rentas exentas y deducciones imputables limitadas (28 + 41 + 53 + 69 + 86 + 139)", COMO_CALCULADA, true],
      [93, "Renta líquida ordinaria cédula general (91 − 92)", COMO_CALCULADA, true],
      [97, "Renta líquida gravable cédula general (93 + 96 − 94 − 95)", COMO_CALCULADA, true],
    ],
  },
  {
    titulo: "Cédula de pensiones",
    casillas: [
      [99, "Ingresos brutos por rentas de pensiones del país y del exterior", COMO_DIGITAR, false],
      [100, "Ingresos no constitutivos de renta (cédula de pensiones)", COMO_DIGITAR, false],
      [101, "Renta líquida (99 − 100)", COMO_CALCULADA, false],
      [102, "Rentas exentas de pensiones", COMO_DIGITAR, false],
      [103, "Renta líquida gravable cédula de pensiones (101 − 102)", COMO_CALCULADA, false],
    ],
  },
  {
    titulo: "Cédula de dividendos y/o participaciones",
    casillas: [
      [104, "Dividendos, participaciones año 2016 y anteriores, y otros", COMO_DIGITAR, false],
      [106, "Renta líquida ordinaria año 2016 y anteriores (104 − 105)", COMO_CALCULADA, false],
      [107, "1a. Subcédula años 2017 y siguientes numeral 3 art. 49 del E.T.", COMO_DIGITAR, false],
      [111, "Renta líquida gravable (cédula general o renta presuntiva, de pensiones y de dividendos y participaciones, art. 241 E.T.)", COMO_CALCULADA, true],
    ],
  },
  {
    titulo: "Liquidación privada",
    casillas: [
      [116, "Impuesto sobre las rentas líquidas gravables: cédula general, de pensiones y de dividendos y participaciones (base casilla 111)", COMO_CALCULADA, true],
      [119, "Por dividendos y participaciones año 2016 (base casilla 106)", COMO_CALCULADA, false],
      [121, "Total impuesto sobre las rentas líquidas gravables", COMO_CALCULADA, true],
      [126, "Impuesto neto de renta (121 − 125)", COMO_CALCULADA, true],
      [129, "Total impuesto a cargo (126 + 127 − 128)", COMO_CALCULADA, true],
      [130, "Anticipo renta liquidado año gravable anterior", COMO_ANTERIOR, false],
      [131, "Saldo a favor del año gravable anterior sin solicitud de devolución y/o compensación", COMO_ANTERIOR, false],
      [132, "Retenciones año gravable a declarar", COMO_DIGITAR, true],
      [134, "Saldo a pagar por impuesto (129 + 133 − 130 − 131 − 132)", COMO_CALCULADA, true],
      [136, "Total saldo a pagar (129 + 133 + 135 − 130 − 131 − 132)", COMO_CALCULADA, true],
      [137, "Total saldo a favor (130 + 131 + 132 − 129 − 133 − 135)", COMO_CALCULADA, true],
    ],
  },
  {
    titulo: "Dependientes",
    casillas: [
      [138, "Número de dependientes económicos", "Se registra en la sección de dependientes del SI", false],
      [139, "Adición por dependientes a la casilla 92 (72 UVT por dependiente, máximo 4)", COMO_CALCULADA, false],
    ],
  },
];

const NOTAS_210 = [
  "El formulario aproxima cada casilla al múltiplo de mil más cercano; las casillas que calcula el SI salen de esos valores ya aproximados, por eso pueden diferir en unos miles de los totales sin aproximar que muestra la pestaña Resultado.",
  "Casilla 133 (anticipo renta para el año gravable siguiente): esta app no la calcula. Si tu impuesto neto de renta (casilla 126) es mayor que cero, el SI la pide: 25%, 50% o 75% del impuesto neto menos las retenciones (instructivo, casilla 133). Los totales 134, 136 y 137 de esta hoja no la incluyen.",
  "Esta app no modela: rentas de trabajo sin relación laboral o legal y reglamentaria (casillas 43 a 57; los honorarios se cuentan en rentas no laborales, casilla 74), ganancias ocasionales (112 a 115, 127, 128), descuentos tributarios como donaciones (122 a 125), renta presuntiva (98, tarifa 0%), compensaciones de pérdidas (94, 95) ni sanciones (135). Si te aplican, complétalos tú.",
  "No es asesoría profesional: verifica estos valores con un contador o directamente en el SI de la DIAN antes de presentar.",
];

function construirCasillas210(d, r) {
  const uvt = r.valorUvt;
  if (!uvt) {
    return {
      disponible: false,
      valores: {},
      filas: [],
      notas: NOTAS_210,
      avisos: [`No hay un valor de UVT para el año gravable ${d.anioGravable}: agrégalo en Configuración para calcular las casillas.`],
    };
  }
  const R = redondearAMiles;
  const cg = d.cedulaGeneral;
  const x = r.deducciones;
  const ing = r.ingresos;
  const v = {};

  // Patrimonio
  v[29] = R(r.patrimonio.patrimonioBruto);
  v[30] = R(r.patrimonio.pasivos);
  v[31] = Math.max(v[29] - v[30], 0);

  // Rentas de trabajo. Las casillas 35 a 40 solo se diligencian si la renta líquida (34) es mayor que 0.
  v[32] = R(ing.ingresosLaborales);
  v[33] = R(cg.laboral.aportesObligatoriosSaludPension || 0);
  v[34] = Math.max(v[32] - v[33], 0);
  const hayRentaLaboral = v[34] > 0;
  v[35] = hayRentaLaboral ? R(x.aportesVoluntarios) : 0;
  v[36] = hayRentaLaboral ? R(x.totalRentasExentasSinTope) : 0;
  v[37] = v[35] + v[36];
  v[38] = hayRentaLaboral ? R(x.interesesVivienda) : 0;
  v[39] = hayRentaLaboral ? R(x.saludPrepagada + x.dependientes) : 0;
  v[40] = v[38] + v[39];

  // Rentas de capital y no laborales (la app no modela sus exentas ni deducciones imputables)
  v[58] = R(ing.ingresosCapital);
  v[59] = R(cg.capital.ingresosNoConstitutivos || 0);
  v[60] = R(cg.capital.costosYDeduccionesProcedentes || 0);
  v[61] = Math.max(v[58] - v[59] - v[60], 0);
  v[69] = 0;
  v[70] = Math.max(v[58] - v[59] - v[60] - v[69], 0);
  v[73] = v[70];
  v[74] = R(ing.ingresosNoLaborales);
  v[75] = 0;
  v[76] = R(cg.noLaboral.ingresosNoConstitutivos || 0);
  v[77] = R(cg.noLaboral.costosYDeduccionesProcedentes || 0);
  v[78] = Math.max(v[74] - v[75] - v[76] - v[77], 0);
  v[86] = 0;
  v[87] = Math.max(v[74] - v[75] - v[76] - v[77] - v[86], 0);
  v[90] = v[87];

  // Casilla 41: el SI toma el 40% de (ingresos brutos − ingresos no constitutivos), máximo 1.340 UVT,
  // y no deja que supere la renta líquida de trabajo (34) ni la suma de las casillas 37 y 40.
  const baseLimite = Math.max(v[32] + v[58] + v[74] - v[33] - v[59] - v[76], 0);
  const cupo = Math.min(LIMITS.LIMITE_GLOBAL_PORCENTAJE_INGRESO * baseLimite, LIMITS.LIMITE_GLOBAL_TOPE_ANUAL_UVT * uvt);
  v[41] = R(Math.min(v[34], v[37] + v[40], cupo));
  v[42] = Math.max(v[34] - v[41], 0);

  // Compras con factura electrónica (297 -> 28) y dependientes (138 -> 139): fuera del límite
  v[297] = R(cg.comprasFacturaElectronica || 0);
  v[28] = R(Math.min(LIMITS.COMPRAS_FACTURA_ELECTRONICA_TASA * v[297], LIMITS.COMPRAS_FACTURA_ELECTRONICA_TOPE_ANUAL_UVT * uvt));
  const nDependientes = cg.deduccionesEspeciales.numeroDependientes || 0;
  v[138] = nDependientes;
  v[139] = Math.min(
    R(Math.min(nDependientes, LIMITS.BENEFICIO_ADICIONAL_POR_DEPENDIENTE_MAX_DEPENDIENTES) * LIMITS.BENEFICIO_ADICIONAL_POR_DEPENDIENTE_UVT * uvt),
    v[42]
  );
  v[355] = v[32];
  v[356] = 0;

  // Totales de la cédula general (casillas 53, 57, 94, 95 y 96 valen 0 en esta app)
  v[91] = v[41] + v[42] + v[69] + v[73] + v[86] + v[90];
  v[92] = v[28] + v[41] + v[69] + v[86] + v[139];
  v[93] = Math.max(v[91] - v[92], 0);
  v[97] = v[93];

  // Pensiones y dividendos
  v[99] = R(ing.pensionIngresoAnual);
  v[100] = Math.min(R(ing.pensionIncrngo), v[99]);
  v[101] = Math.max(v[99] - v[100], 0);
  v[102] = Math.min(R(ing.pensionExentaAnual), v[101]);
  v[103] = Math.max(v[101] - v[102], 0);
  v[104] = R(ing.dividendosAntiguos);
  v[105] = 0;
  v[106] = Math.max(v[104] - v[105], 0);
  v[107] = R(ing.dividendosGravables);

  // Liquidación (renta presuntiva, casilla 98, con tarifa 0%: la base es la casilla 97)
  v[111] = v[97] + v[103] + v[107];
  v[116] = R(calcularImpuestoPorTabla241(v[111] / uvt) * uvt);
  v[119] = R(r.impuesto.impuestoDividendosAntiguosPesos);
  v[121] = v[116] + v[119];
  v[125] = 0;
  v[126] = v[121] - v[125];
  v[127] = 0;
  v[128] = 0;
  v[129] = v[126] + v[127] - v[128];
  v[130] = R(r.anticipos.anticipoAnioAnterior);
  v[131] = R(r.anticipos.saldoAFavorAnioAnterior);
  v[132] = R(r.retenciones.totalRetenciones);
  v[133] = 0;
  v[135] = 0;
  v[134] = Math.max(v[129] + v[133] - v[130] - v[131] - v[132], 0);
  v[136] = Math.max(v[129] + v[133] + v[135] - v[130] - v[131] - v[132], 0);
  v[137] = Math.max(v[130] + v[131] + v[132] - v[129] - v[133] - v[135], 0);

  const filas = [];
  SECCIONES_210.forEach((s) => {
    const visibles = s.casillas.filter(([n, , , siempre]) => siempre || v[n]);
    if (visibles.length === 0) return;
    filas.push({ tipo: "seccion", titulo: s.titulo });
    visibles.forEach(([n, nombre, como]) => filas.push({ tipo: "casilla", n, nombre, valor: v[n], como }));
  });
  // La 133 (anticipo) siempre aparece, sin valor, porque esta app no la calcula
  const iLiquidacion = filas.findIndex((f) => f.tipo === "casilla" && f.n === 134);
  filas.splice(iLiquidacion, 0, {
    tipo: "casilla",
    n: 133,
    nombre: "Anticipo renta para el año gravable siguiente",
    valor: null,
    como: "No la calcula esta app; ver la nota sobre la casilla 133",
  });

  return { disponible: true, uvt, valores: v, filas, notas: NOTAS_210, avisos: [] };
}
