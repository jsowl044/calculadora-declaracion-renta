// Motor de cálculo. Toma un registro de declaración (ver declaracion.js para el esquema)
// y devuelve todos los valores intermedios y el resultado final, con nombres que
// corresponden a los renglones del Formulario 210 para que sea fácil trasladarlos.

function calcularImpuestoPorTabla241(baseGravableUVT) {
  if (baseGravableUVT <= 0) return 0;
  const bracket = TAX_BRACKETS_241.find(
    (b) => baseGravableUVT > b.desde && baseGravableUVT <= b.hasta
  ) || TAX_BRACKETS_241[TAX_BRACKETS_241.length - 1];
  return bracket.baseImpuestoUVT + (baseGravableUVT - bracket.desde) * bracket.tarifa;
}

// Descuento del 1% por compras con factura electrónica (casilla 28), con su tope en UVT.
function calcularDescuentoFacturaElectronica(compras, valorUvt) {
  return Math.min(
    LIMITS.COMPRAS_FACTURA_ELECTRONICA_TASA * (compras || 0),
    LIMITS.COMPRAS_FACTURA_ELECTRONICA_TOPE_ANUAL_UVT * (valorUvt || 0)
  );
}

// Cruce de los ingresos de la app con el "Tope 1 - Ingresos" de la información exógena de la
// DIAN (lo que terceros le reportaron sobre ti). La tolerancia cubre redondeos a miles y
// pequeños ingresos que ningún tercero reporta a la DIAN (ej. intereses de una cuenta).
const TOLERANCIA_TOPE_ABSOLUTA = 10000;
const TOLERANCIA_TOPE_RELATIVA = 0.002;

function compararConTope1(tope1Dian, ingresosApp) {
  if (!tope1Dian) return null;
  const diferencia = tope1Dian - ingresosApp; // > 0: la DIAN tiene registrado más que tu app
  const tolerancia = Math.max(TOLERANCIA_TOPE_ABSOLUTA, TOLERANCIA_TOPE_RELATIVA * tope1Dian);
  let estado = "coincide";
  if (diferencia > tolerancia) estado = "faltan_ingresos";
  else if (diferencia < -tolerancia) estado = "ingresos_adicionales";
  return {
    tope1Dian,
    ingresosApp,
    diferencia,
    porcentaje: diferencia / tope1Dian,
    tolerancia,
    estado,
  };
}

function calcular(declaracion) {
  const anio = declaracion.anioGravable;
  const uvt = getUvt(anio);
  const avisos = [];
  if (!uvt) {
    avisos.push(
      `No hay un valor de UVT configurado para el año gravable ${anio}. Agrégalo en Configuración antes de confiar en este resultado.`
    );
  }
  const valorUvt = uvt || 0;
  const enUvt = (pesos) => (valorUvt ? pesos / valorUvt : 0);
  const enPesos = (uvtVal) => uvtVal * valorUvt;

  const cg = declaracion.cedulaGeneral;

  // --- Patrimonio ---
  const patrimonioBruto = declaracion.patrimonio.activos || 0;
  const pasivos = declaracion.patrimonio.pasivos || 0;
  const patrimonioLiquido = Math.max(patrimonioBruto - pasivos, 0);

  // --- Ingresos brutos y renta líquida por columna de la cédula general ---
  // Cada columna del Formulario 210 (laboral, capital, no laboral) resta sus propios
  // ingresos no constitutivos de renta; capital y no laboral además restan sus "costos y
  // deducciones procedentes" (la laboral no tiene esa línea en el formulario real).
  const ingresosLaborales = cg.laboral.ingresosBrutos || 0;
  const incrngoLaboral = cg.laboral.aportesObligatoriosSaludPension || 0;
  const rentaLiquidaLaboral = Math.max(ingresosLaborales - incrngoLaboral, 0);

  const ingresosCapital =
    (cg.capital.intereses || 0) + (cg.capital.arriendos || 0) + (cg.capital.otrosCapital || 0);
  const incrngoCapital = cg.capital.ingresosNoConstitutivos || 0;
  const costosCapital = cg.capital.costosYDeduccionesProcedentes || 0;
  const rentaLiquidaCapital = Math.max(ingresosCapital - incrngoCapital - costosCapital, 0);

  const ingresosNoLaborales =
    (cg.noLaboral.honorariosServicios || 0) + (cg.noLaboral.otrosNoLaborales || 0);
  const incrngoNoLaboral = cg.noLaboral.ingresosNoConstitutivos || 0;
  const costosNoLaboral = cg.noLaboral.costosYDeduccionesProcedentes || 0;
  const rentaLiquidaNoLaboral = Math.max(ingresosNoLaborales - incrngoNoLaboral - costosNoLaboral, 0);

  const ingresosBrutosCedulaGeneral = ingresosLaborales + ingresosCapital + ingresosNoLaborales;
  const incrngo = incrngoLaboral + incrngoCapital + incrngoNoLaboral;
  // Suma de las tres rentas líquidas por columna (equivale a la casilla 91 del Formulario 210).
  const ingresoNetoCedulaGeneral = rentaLiquidaLaboral + rentaLiquidaCapital + rentaLiquidaNoLaboral;

  // --- Deducciones especiales (con sus topes individuales) ---
  const de = cg.deduccionesEspeciales;
  const interesesVivienda = Math.min(
    de.interesesVivienda || 0,
    enPesos(LIMITS.INTERESES_VIVIENDA_TOPE_ANUAL_UVT)
  );
  const saludPrepagada = Math.min(
    de.saludPrepagada || 0,
    enPesos(LIMITS.SALUD_PREPAGADA_TOPE_ANUAL_UVT)
  );
  const dependientes =
    (de.numeroDependientes || 0) > 0
      ? Math.min(0.10 * ingresosLaborales, enPesos(LIMITS.DEPENDIENTES_TOPE_ANUAL_UVT))
      : 0;
  const aportesVoluntarios = Math.min(
    de.aportesVoluntariosPensionAFC || 0,
    Math.min(
      LIMITS.APORTES_VOLUNTARIOS_TOPE_PORCENTAJE_INGRESO * ingresosBrutosCedulaGeneral,
      enPesos(LIMITS.APORTES_VOLUNTARIOS_TOPE_ANUAL_UVT)
    )
  );
  const totalDeduccionesEspecialesSinTope =
    interesesVivienda + saludPrepagada + dependientes + aportesVoluntarios;

  // --- Auxilio de cesantías e intereses (Art. 206 num. 4 ET) ---
  // Exención total o parcial según el ingreso laboral promedio mensual de los últimos 6
  // meses. No tiene el tope de 790 UVT del 25% general — solo el porcentaje de la tabla.
  const cesantiasEIntereses = cg.laboral.cesantiasEIntereses || 0;
  const ingresoLaboralPromedio6Meses = cg.laboral.ingresoLaboralPromedio6Meses || 0;
  const porcentajeExencionCesantias = calcularPorcentajeExencionCesantias(
    ingresoLaboralPromedio6Meses,
    valorUvt
  );
  const cesantiasExenta = cesantiasEIntereses * porcentajeExencionCesantias;

  // --- Renta exenta laboral 25% ---
  // Instructivo oficial del Formulario 210 (numeral 9, casilla 36): "El cálculo de esta renta
  // exenta se efectuará una vez se detraiga del valor total de los pagos laborales recibidos
  // por el trabajador, los ingresos no constitutivos de renta [ya restados en rentaLiquidaLaboral],
  // LAS DEDUCCIONES [totalDeduccionesEspecialesSinTope] y las demás rentas exentas [cesantías]
  // diferentes a la establecida en este numeral." Restar solo las cesantías, sin las deducciones,
  // no cuadra con el instructivo: hay que restar ambas.
  const rentaExentaLaboral25SinTope = 0.25 * Math.max(
    rentaLiquidaLaboral - cesantiasExenta - totalDeduccionesEspecialesSinTope,
    0
  );
  const rentaExentaLaboral25 = Math.min(
    rentaExentaLaboral25SinTope,
    enPesos(LIMITS.RENTA_EXENTA_LABORAL_25_TOPE_ANUAL_UVT)
  );
  // Si conoces la renta exenta laboral real (ej. de una declaración ya hecha por tu contador),
  // puedes reemplazar el cálculo del 25%+cesantías por ese valor directo — la interacción
  // exacta entre esos dos beneficios depende de datos mensuales que este cálculo anual no
  // tiene, así que el valor manual es más confiable cuando lo conoces.
  const rentaExentaManualActiva = !!cg.laboral.rentaExentaManualActiva;
  const rentaExentaManualValor = cg.laboral.rentaExentaManualValor || 0;
  const totalRentasExentasSinTope = rentaExentaManualActiva
    ? rentaExentaManualValor
    : rentaExentaLaboral25 + cesantiasExenta;

  // --- Límite global (Art. 336 ET, casillas 41 y 92) ---
  // Instructivo oficial del Formulario 210 (casilla 40): el SI de la DIAN suma los ingresos brutos
  // de toda la cédula general (casillas 32 + 43 + 58 + 74), les resta los ingresos no constitutivos
  // de renta (33 + 44 + 59 + 76) y toma el 40% de ese resultado, sin pasar de 1.340 UVT. NO resta
  // los costos y deducciones procedentes. Ese cupo único se reparte en cascada (primero rentas de
  // trabajo, luego trabajo sin relación laboral, capital y no laborales). Esta app solo modela
  // exenciones/deducciones de la columna laboral, así que es la única que reclama cupo. Además, la
  // casilla 41 no puede superar la renta líquida de trabajo (casilla 34).
  const baseLimiteGlobal = Math.max(ingresosBrutosCedulaGeneral - incrngo, 0);
  const sumaDeduccionesYExentas = totalDeduccionesEspecialesSinTope + totalRentasExentasSinTope;
  const limiteGlobal = Math.min(
    LIMITS.LIMITE_GLOBAL_PORCENTAJE_INGRESO * baseLimiteGlobal,
    enPesos(LIMITS.LIMITE_GLOBAL_TOPE_ANUAL_UVT)
  );
  const cupoLaboral = Math.min(limiteGlobal, rentaLiquidaLaboral);
  let factorAjuste = 1;
  if (sumaDeduccionesYExentas > cupoLaboral && sumaDeduccionesYExentas > 0) {
    factorAjuste = cupoLaboral / sumaDeduccionesYExentas;
  }
  const totalDeduccionesEspeciales = totalDeduccionesEspecialesSinTope * factorAjuste;
  const totalRentasExentas = totalRentasExentasSinTope * factorAjuste;
  // Casilla 42: renta líquida ordinaria de las rentas de trabajo (34 − 41).
  const rentaLiquidaOrdinariaLaboral = Math.max(
    rentaLiquidaLaboral - totalDeduccionesEspeciales - totalRentasExentas,
    0
  );

  // Beneficio adicional por dependiente (casilla 139): se suma DESPUÉS del límite global, no está
  // sujeto a él. Máximo 4 dependientes, y su valor no puede ser mayor que la renta líquida ordinaria
  // de las rentas de trabajo (casillas 42 + 57), según el instructivo oficial.
  const numeroDependientesParaBeneficio = Math.min(
    de.numeroDependientes || 0,
    LIMITS.BENEFICIO_ADICIONAL_POR_DEPENDIENTE_MAX_DEPENDIENTES
  );
  const beneficioAdicionalPorDependientes = Math.min(
    numeroDependientesParaBeneficio * enPesos(LIMITS.BENEFICIO_ADICIONAL_POR_DEPENDIENTE_UVT),
    rentaLiquidaOrdinariaLaboral
  );

  // 1% de compras con factura electrónica (casilla 28): tampoco sujeto al límite global.
  const comprasFacturaElectronica = cg.comprasFacturaElectronica || 0;
  const descuentoComprasFacturaElectronica = calcularDescuentoFacturaElectronica(
    comprasFacturaElectronica,
    valorUvt
  );

  const rentaLiquidaGravableCedulaGeneral = Math.max(
    ingresoNetoCedulaGeneral -
      totalDeduccionesEspeciales -
      totalRentasExentas -
      beneficioAdicionalPorDependientes -
      descuentoComprasFacturaElectronica,
    0
  );

  // --- Pensiones ---
  // Casillas 99 a 103 del Formulario 210: ingresos brutos, menos los ingresos no constitutivos de renta
  // (aportes obligatorios a salud y fondo de solidaridad pensional), menos la renta exenta del num. 5
  // del art. 206 ET: la parte de la mesada que no supere 1.000 UVT mensuales, una vez descontados
  // esos aportes (instructivo, casilla 102).
  const pensionIngresoAnual = declaracion.pensiones.ingresoBrutoAnual || 0;
  const pensionIncrngo = Math.min(declaracion.pensiones.ingresosNoConstitutivos || 0, pensionIngresoAnual);
  const pensionRentaLiquida = pensionIngresoAnual - pensionIncrngo;
  const pensionIngresoMensual =
    declaracion.pensiones.ingresoBrutoMensualPromedio || pensionIngresoAnual / 12 || 0;
  const pensionNetaMensual = Math.max(pensionIngresoMensual - pensionIncrngo / 12, 0);
  const pensionExentaMensual = Math.min(
    pensionNetaMensual,
    enPesos(LIMITS.PENSION_EXENTA_MENSUAL_UVT)
  );
  const pensionExentaAnual = Math.min(pensionExentaMensual * 12, pensionRentaLiquida);
  const pensionGravable = Math.max(pensionRentaLiquida - pensionExentaAnual, 0);

  // --- Base combinada cédula general + pensiones, tabla Art. 241 ET ---
  const baseSinDividendosPesos = rentaLiquidaGravableCedulaGeneral + pensionGravable;
  const baseSinDividendosUVT = enUvt(baseSinDividendosPesos);
  const impuestoSinDividendosUVT = calcularImpuestoPorTabla241(baseSinDividendosUVT);
  const impuestoSinDividendosPesos = enPesos(impuestoSinDividendosUVT);

  // --- Dividendos y participaciones (post-2017): método de tarifa marginal conjunta ---
  // Art. 242 ET (modificado por Ley 2277 de 2022). Se suma el dividendo a la base gravable
  // para hallar la tarifa marginal aplicable, y el impuesto del dividendo es la diferencia.
  const dividendosGravables = declaracion.dividendos.dividendosGravables || 0;
  const baseConDividendosUVT = enUvt(baseSinDividendosPesos + dividendosGravables);
  const impuestoConDividendosUVT = calcularImpuestoPorTabla241(baseConDividendosUVT);
  const impuestoDividendosPesos = enPesos(impuestoConDividendosUVT - impuestoSinDividendosUVT);

  // --- Dividendos años 2016 y anteriores (régimen especial anterior) ---
  // La tarifa depende de si la utilidad ya fue gravada en la sociedad (0%) o no (33%/35%
  // según el año). No se asume una tarifa por defecto: el usuario debe indicarla.
  const dividendosAntiguos = declaracion.dividendos.dividendosAnio2016yAnteriores || 0;
  const tarifaDividendosAntiguos = declaracion.dividendos.tarifaDividendosAntiguos || 0;
  const impuestoDividendosAntiguosPesos = dividendosAntiguos * tarifaDividendosAntiguos;

  const impuestoTotal =
    impuestoSinDividendosPesos + impuestoDividendosPesos + impuestoDividendosAntiguosPesos;

  // --- Retenciones, autorretenciones y anticipos ---
  const totalRetenciones =
    (declaracion.retenciones.retencionFuentePracticada || 0) +
    (declaracion.retenciones.autorretenciones || 0);
  const anticipoAnioAnterior = declaracion.anticipos.anticipoRentaAnioAnterior || 0;
  const saldoAFavorAnioAnterior = declaracion.anticipos.saldoAFavorAnioAnterior || 0;

  const saldoNeto =
    impuestoTotal - totalRetenciones - anticipoAnioAnterior - saldoAFavorAnioAnterior;

  // --- Verificación informativa de obligación de declarar ---
  const topesObligacion = OBLIGACION_DECLARAR_TOPES_UVT;
  const ingresosBrutosTotales =
    ingresosBrutosCedulaGeneral + pensionIngresoAnual + dividendosGravables + dividendosAntiguos;
  const obligadoADeclarar = {
    porPatrimonio: valorUvt ? patrimonioBruto > enPesos(topesObligacion.patrimonioBruto) : null,
    porIngresos: valorUvt ? ingresosBrutosTotales > enPesos(topesObligacion.ingresosBrutos) : null,
  };

  const cruceDian = compararConTope1(
    declaracion.referenciasDian && declaracion.referenciasDian.tope1Ingresos,
    ingresosBrutosTotales
  );

  return {
    avisos,
    valorUvt,
    patrimonio: { patrimonioBruto, pasivos, patrimonioLiquido },
    ingresos: {
      ingresosLaborales,
      rentaLiquidaLaboral,
      ingresosCapital,
      costosCapital,
      rentaLiquidaCapital,
      ingresosNoLaborales,
      costosNoLaboral,
      rentaLiquidaNoLaboral,
      ingresosBrutosCedulaGeneral,
      incrngo,
      ingresoNetoCedulaGeneral,
      pensionIngresoAnual,
      pensionIncrngo,
      pensionExentaAnual,
      pensionGravable,
      dividendosGravables,
      dividendosAntiguos,
      ingresosBrutosTotales,
    },
    deducciones: {
      interesesVivienda,
      saludPrepagada,
      dependientes,
      aportesVoluntarios,
      totalDeduccionesEspecialesSinTope,
      cesantiasEIntereses,
      porcentajeExencionCesantias,
      cesantiasExenta,
      rentaExentaLaboral25,
      rentaExentaManualActiva,
      rentaExentaManualValor,
      totalRentasExentasSinTope,
      baseLimiteGlobal,
      limiteGlobal,
      factorAjuste,
      rentaLiquidaOrdinariaLaboral,
      totalDeduccionesEspeciales,
      totalRentasExentas,
      beneficioAdicionalPorDependientes,
      comprasFacturaElectronica,
      descuentoComprasFacturaElectronica,
    },
    rentaLiquidaGravableCedulaGeneral,
    impuesto: {
      baseSinDividendosPesos,
      baseSinDividendosUVT,
      impuestoSinDividendosPesos,
      impuestoDividendosPesos,
      impuestoDividendosAntiguosPesos,
      impuestoTotal,
    },
    retenciones: { totalRetenciones },
    anticipos: { anticipoAnioAnterior, saldoAFavorAnioAnterior },
    saldoNeto,
    saldoTipo: saldoNeto > 0 ? "a_pagar" : saldoNeto < 0 ? "a_favor" : "cero",
    obligadoADeclarar,
    cruceDian,
  };
}
