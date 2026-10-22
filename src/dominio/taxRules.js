// Reglas tributarias para la declaración de renta de personas naturales en Colombia.
// IMPORTANTE: Estos valores reflejan el Estatuto Tributario tras la Ley 2277 de 2022 y el
// instructivo del Formulario 210 "año gravable 2023 y siguientes", validados contra declaraciones
// de los años gravables 2024 y 2025. La DIAN publica el UVT de cada año nuevo mediante
// resolución (usualmente en noviembre/diciembre del año anterior). Si la ley cambia las
// tarifas o topes, actualiza este archivo.

// Valor de la UVT (Unidad de Valor Tributario) por año gravable, en pesos COP.
const UVT_BY_YEAR = {
  2023: 42412,
  2024: 47065,
  2025: 49799,
  // Resolución DIAN 000238 del 15 de diciembre de 2025 (verificada en el normograma de la DIAN).
  2026: 52374,
  // 2027: agrégalo aquí cuando la DIAN publique la resolución con el valor oficial (suele salir
  // entre noviembre y diciembre del año anterior). También puedes agregarlo desde la app, en
  // Configuración (UVT), donde la app lo recuerda en el navegador. No se incluye un valor por
  // defecto para evitar dar una cifra no verificada.
};

// Tabla progresiva del Art. 241 ET, aplicable a la cédula general + pensiones.
// Rangos en UVT. impuestoUVT = baseImpuestoUVT + (baseGravableUVT - desde) * tarifaMarginal
const TAX_BRACKETS_241 = [
  { desde: 0, hasta: 1090, tarifa: 0.00, baseImpuestoUVT: 0 },
  { desde: 1090, hasta: 1700, tarifa: 0.19, baseImpuestoUVT: 0 },
  { desde: 1700, hasta: 4100, tarifa: 0.28, baseImpuestoUVT: 116 },
  { desde: 4100, hasta: 8670, tarifa: 0.33, baseImpuestoUVT: 788 },
  { desde: 8670, hasta: 18970, tarifa: 0.35, baseImpuestoUVT: 2296 },
  { desde: 18970, hasta: 31000, tarifa: 0.37, baseImpuestoUVT: 5901 },
  { desde: 31000, hasta: Infinity, tarifa: 0.39, baseImpuestoUVT: 10352 },
];

// Tabla de exención del auxilio de cesantías e intereses (Art. 206 num. 4 ET), según el
// ingreso laboral promedio mensual de los últimos 6 meses. Es la tabla estándar citada en
// software de nómina colombiano; verifica los tramos exactos si el resultado cae cerca de
// un límite (350/410/470/530/590/650 UVT), porque no se pudo confirmar con una fuente oficial
// dentro de esta sesión.
const CESANTIAS_EXENCION_TABLA_UVT = [
  { hasta: 350, porcentaje: 1.0 },
  { hasta: 410, porcentaje: 0.9 },
  { hasta: 470, porcentaje: 0.8 },
  { hasta: 530, porcentaje: 0.6 },
  { hasta: 590, porcentaje: 0.4 },
  { hasta: 650, porcentaje: 0.2 },
  { hasta: Infinity, porcentaje: 0 },
];

function calcularPorcentajeExencionCesantias(promedioMensualPesos, valorUvt) {
  if (!valorUvt) return 0;
  const promedioUVT = promedioMensualPesos / valorUvt;
  const tramo = CESANTIAS_EXENCION_TABLA_UVT.find((t) => promedioUVT <= t.hasta);
  return tramo ? tramo.porcentaje : 0;
}

// Topes y límites expresados en UVT (se convierten a pesos con el UVT del año gravable).
const LIMITS = {
  // Renta exenta laboral del 25% (Art. 206 num. 10 ET)
  RENTA_EXENTA_LABORAL_25_TOPE_ANUAL_UVT: 790,
  // Intereses de vivienda deducibles (Art. 119 ET)
  INTERESES_VIVIENDA_TOPE_ANUAL_UVT: 1200,
  // Salud prepagada deducible (Art. 387 ET)
  SALUD_PREPAGADA_TOPE_ANUAL_UVT: 16 * 12,
  // Deducción por dependientes: 10% de ingresos laborales, tope mensual 32 UVT (Art. 387 ET)
  DEPENDIENTES_TOPE_ANUAL_UVT: 32 * 12,
  // Aportes voluntarios a pensión y cuentas AFC (Art. 126-1 ET)
  APORTES_VOLUNTARIOS_TOPE_ANUAL_UVT: 3800,
  APORTES_VOLUNTARIOS_TOPE_PORCENTAJE_INGRESO: 0.30,
  // Límite global: deducciones especiales + rentas exentas <= 40% del ingreso (sin INCRNGO), tope 1340 UVT (Art. 336 ET)
  LIMITE_GLOBAL_TOPE_ANUAL_UVT: 1340,
  LIMITE_GLOBAL_PORCENTAJE_INGRESO: 0.40,
  // Renta exenta de pensiones: primeras 1000 UVT mensuales (Art. 206 num. 5 ET)
  PENSION_EXENTA_MENSUAL_UVT: 1000,
  // Beneficio adicional por dependiente (Ley 2277 de 2022, adición al Art. 336 ET, casilla 139
  // del Formulario 210): se suma directamente a la casilla 92 y NO está sujeto al límite global
  // del 40%/1340 UVT — es aparte de la deducción por dependientes del Art. 387 ET. Confirmado
  // con el instructivo oficial del Formulario 210 y con una declaración real (1 dependiente =
  // 72,00 UVT exactas): tope de 72 UVT por dependiente, hasta máximo 4 dependientes.
  BENEFICIO_ADICIONAL_POR_DEPENDIENTE_UVT: 72,
  BENEFICIO_ADICIONAL_POR_DEPENDIENTE_MAX_DEPENDIENTES: 4,
  // Uno por ciento (1%) de compras con factura electrónica (Art. 336 num. 5 ET, casilla 28 del
  // Formulario 210): 1% del valor de compras que cumplan los requisitos legales (factura
  // electrónica a tu nombre, pagada con tarjeta/medio electrónico, no reclamada ya como
  // costo/deducción/exenta en otro lado), tope 240 UVT/año. Tampoco está sujeto al límite
  // global del 40%/1340 UVT.
  COMPRAS_FACTURA_ELECTRONICA_TASA: 0.01,
  COMPRAS_FACTURA_ELECTRONICA_TOPE_ANUAL_UVT: 240,
};

// Topes que determinan si una persona natural está obligada a declarar renta
// (Art. 592, 593, 594-1, 594-3 ET y resoluciones anuales de la DIAN). Se muestran
// como referencia informativa, no como verificación legal completa (hay más
// requisitos, p.ej. responsable de IVA, notario, etc.).
const OBLIGACION_DECLARAR_TOPES_UVT = {
  patrimonioBruto: 4500,
  ingresosBrutos: 1400,
  consumosTarjetaCredito: 1400,
  comprasYConsumosTotales: 1400,
  consignacionesEInversiones: 1400,
};

function getUvt(anioGravable) {
  const uvt = UVT_BY_YEAR[anioGravable];
  if (!uvt) return null;
  return uvt;
}

function uvtToPesos(uvt, anioGravable) {
  const valor = getUvt(anioGravable);
  if (!valor) return 0;
  return uvt * valor;
}
