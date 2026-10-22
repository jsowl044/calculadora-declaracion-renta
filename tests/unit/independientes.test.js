// Independientes (honorarios y compensación de servicios personales), según el instructivo del Formulario 210:
//  - Sin costos: van en la casilla 32 (con la 356) y conservan la renta exenta del 25% (num. 10 art. 206).
//  - Con costos: columna propia (casillas 43 a 57), sin el 25%, con sus costos (45), aportes (44) y deducciones.
//  - El cupo del 40% (máx. 1.340 UVT) es uno solo: se reparte primero a la casilla 41 y luego a la 53.
//  - Sin relación laboral, un mismo dependiente da la deducción del 10% O la adición de 72 UVT, no las dos.
// Valores calculados a mano con UVT 2025 = 49.799: 790 UVT = 39.341.210; 1.340 UVT = 66.730.660;
// 1.200 UVT = 59.758.800; 72 UVT = 3.585.528; 1.090 UVT = 54.280.910.
const UVT = 49799;
const impuestoNaivoUvt = (b) => (b <= 1090 ? 0 : b <= 1700 ? (b - 1090) * 0.19 : b <= 4100 ? (b - 1700) * 0.28 + 116 : b <= 8670 ? (b - 4100) * 0.33 + 788 : b <= 18970 ? (b - 8670) * 0.35 + 2296 : b <= 31000 ? (b - 18970) * 0.37 + 5901 : (b - 31000) * 0.39 + 10352);
const impuestoNaivo = (base) => impuestoNaivoUvt(base / UVT) * UVT;

module.exports = ({ prueba, grupo, A }, { api }) => {
  const nueva = (cambios) => { const d = api.plantillaDeclaracion(); d.anioGravable = 2025; cambios(d); return d; };
  const casillas = (d) => api.construirCasillas210(d, api.calcular(d)).valores;

  grupo("Independientes: honorarios sin costos (casilla 32 con la 356, con renta exenta del 25%)");
  prueba("60M de honorarios sin costos y 7,2M de aportes: exenta 25% = 13,2M, base 39,6M", () => {
    const d = nueva((x) => { x.cedulaGeneral.laboral.honorariosSinCostos = 60e6; x.cedulaGeneral.laboral.aportesObligatoriosSaludPension = 7.2e6; });
    const r = api.calcular(d);
    A.cerca(r.deducciones.rentaExentaLaboral25, 13.2e6, 0.5);
    A.cerca(r.rentaLiquidaGravableCedulaGeneral, 39.6e6, 0.5);
    const v = casillas(d);
    A.igual([v[32], v[33], v[34], v[36], v[41], v[42], v[355], v[356], v[97]], [60e6, 7.2e6, 52.8e6, 13.2e6, 13.2e6, 39.6e6, 0, 60e6, 39.6e6]);
  });
  prueba("salarios y honorarios sin costos se suman en la casilla 32 y se separan en la 355 y la 356", () => {
    const d = nueva((x) => { x.cedulaGeneral.laboral.ingresosBrutos = 80e6; x.cedulaGeneral.laboral.honorariosSinCostos = 20e6; });
    const v = casillas(d);
    A.igual([v[32], v[355], v[356]], [100e6, 80e6, 20e6]);
  });

  grupo("Independientes: honorarios con costos (casillas 43 a 57)");
  prueba("200M de honorarios, 20M de aportes, 50M de costos: renta líquida 130M (sin renta exenta del 25%)", () => {
    const d = nueva((x) => { Object.assign(x.cedulaGeneral.honorarios, { ingresosBrutos: 200e6, ingresosNoConstitutivos: 20e6, costosYGastos: 50e6 }); });
    const v = casillas(d);
    A.igual([v[43], v[44], v[45], v[46], v[48], v[53], v[54], v[57], v[97]], [200e6, 20e6, 50e6, 130e6, 0, 0, 130e6, 130e6, 130e6]);
    A.cerca(api.calcular(d).impuesto.impuestoTotal, impuestoNaivo(130e6), 0.5);
  });
  prueba("sin ingresos de trabajo en la columna 1, las deducciones (vivienda y salud) van a la columna de honorarios", () => {
    // c46 = 130M; vivienda 10M + salud 5M = 15M (cupo = min(40% × 180M = 72M, 66.730.660) no se alcanza)
    // c52 = 15M, c53 = 15M, c54 = c57 = 115M; base = 115M
    const d = nueva((x) => {
      Object.assign(x.cedulaGeneral.honorarios, { ingresosBrutos: 200e6, ingresosNoConstitutivos: 20e6, costosYGastos: 50e6 });
      x.cedulaGeneral.deduccionesEspeciales.interesesVivienda = 10e6; x.cedulaGeneral.deduccionesEspeciales.saludPrepagada = 5e6;
    });
    const v = casillas(d);
    A.igual([v[50], v[51], v[52], v[53], v[54], v[57], v[41], v[91], v[92], v[93]], [10e6, 5e6, 15e6, 15e6, 115e6, 115e6, 0, 130e6, 15e6, 115e6]);
    A.cerca(api.calcular(d).impuesto.impuestoTotal, impuestoNaivo(115e6), 0.5);
  });
  prueba("el cupo del 40% es uno solo y se reparte en cascada: primero la columna 1, luego la de honorarios", () => {
    // Salarios 50M (aportes 4M): c34 = 46M. Honorarios con costos: 80M − 8M − 20M: c46 = 52M. Vivienda 60M (tope 1.200 UVT = 59.758.800).
    // Cupo = min(40% × (50M + 80M − 4M − 8M) = 47,2M; 1.340 UVT) = 47,2M. La columna 1 absorbe 46M (c41 = 46M);
    // sobran 13.758.800 que pasan a la columna 2, pero solo quedan 1,2M de cupo: c53 = 1,2M. c57 = 52M − 1,2M = 50,8M.
    const d = nueva((x) => {
      x.cedulaGeneral.laboral.ingresosBrutos = 50e6; x.cedulaGeneral.laboral.aportesObligatoriosSaludPension = 4e6;
      Object.assign(x.cedulaGeneral.honorarios, { ingresosBrutos: 80e6, ingresosNoConstitutivos: 8e6, costosYGastos: 20e6 });
      x.cedulaGeneral.deduccionesEspeciales.interesesVivienda = 60e6;
    });
    const v = casillas(d);
    // (13.758.800 se aproxima a miles como 13.759.000)
    A.igual([v[34], v[38], v[41], v[42], v[46], v[50], v[52], v[53], v[57]], [46e6, 46e6, 46e6, 0, 52e6, 13759000, 13759000, 1.2e6, 50.8e6]);
    A.cerca(api.calcular(d).rentaLiquidaGravableCedulaGeneral, 50.8e6, 0.5);
  });
  prueba("más de 60% de costos sobre los ingresos: avisa de la casilla 140 (tope indicativo, art. 336-1)", () => {
    const d = nueva((x) => { Object.assign(x.cedulaGeneral.honorarios, { ingresosBrutos: 100e6, costosYGastos: 61e6 }); });
    const c = api.construirCasillas210(d, api.calcular(d));
    A.cierto(c.avisos.some((a) => /140/.test(a)), "debía avisar de la casilla 140");
    const d2 = nueva((x) => { Object.assign(x.cedulaGeneral.honorarios, { ingresosBrutos: 100e6, costosYGastos: 60e6 }); });
    A.igual(api.construirCasillas210(d2, api.calcular(d2)).avisos.some((a) => /140/.test(a)), false);
  });
  prueba("la renta de la columna de honorarios entra al total de la cédula general y al cruce con el Tope 1", () => {
    const d = nueva((x) => { Object.assign(x.cedulaGeneral.honorarios, { ingresosBrutos: 70e6 }); x.referenciasDian.tope1Ingresos = 70e6; });
    const r = api.calcular(d);
    A.igual(r.ingresos.ingresosBrutosCedulaGeneral, 70e6);
    A.igual(r.cruceDian.estado, "coincide");
    A.igual(r.obligacion.criterios.find((c) => c.id === "ingresos").valorApp, 70e6);
  });

  grupo("Dependientes: sin relación laboral, cada dependiente da UNA de las dos deducciones");
  prueba("con relación laboral (salarios) se aplican ambas, como antes", () => {
    const d = nueva((x) => { x.cedulaGeneral.laboral.ingresosBrutos = 100e6; x.cedulaGeneral.laboral.aportesObligatoriosSaludPension = 8e6; x.cedulaGeneral.deduccionesEspeciales.numeroDependientes = 2; });
    const r = api.calcular(d);
    A.igual(r.dependientes.modo, "ambas");
    A.cerca(r.deducciones.dependientes, 10e6, 0.5);
    A.cerca(r.deducciones.beneficioAdicionalPorDependientes, 2 * 72 * UVT, 0.5);
  });
  prueba("independiente con ingresos altos y 2 dependientes: conviene 10% con uno y 72 UVT con el otro", () => {
    // X: deducción 10% = 10M; exenta 25% = 0,25 × (92M − 10M) = 20,5M; c41 = 30,5M (cupo 36,8M); c42 = 61,5M; 72 UVT × 1 = 3.585.528
    // → base = 57.914.472. Y (solo 72 UVT × 2): exenta 23M, c42 = 69M, adición 7.171.056 → base 61.828.944. Gana X.
    const d = nueva((x) => { x.cedulaGeneral.laboral.honorariosSinCostos = 100e6; x.cedulaGeneral.laboral.aportesObligatoriosSaludPension = 8e6; x.cedulaGeneral.deduccionesEspeciales.numeroDependientes = 2; });
    const r = api.calcular(d);
    A.igual(r.dependientes.modo, "una_u_otra");
    A.igual(r.dependientes.usaDeduccion10, true);
    A.igual(r.dependientes.adicion72, 1);
    A.cerca(r.rentaLiquidaGravableCedulaGeneral, 61.5e6 - 3585528, 0.5);
  });
  prueba("independiente con ingresos bajos y 1 dependiente: conviene solo la adición de 72 UVT", () => {
    // X: deducción 2M, exenta 25% = 0,25 × (18,4M − 2M) = 4,1M, c42 = 12,3M, sin adición → base 12,3M.
    // Y: exenta 25% = 4,6M, c42 = 13,8M, adición 3.585.528 → base 10.214.472. Gana Y.
    const d = nueva((x) => { x.cedulaGeneral.laboral.honorariosSinCostos = 20e6; x.cedulaGeneral.laboral.aportesObligatoriosSaludPension = 1.6e6; x.cedulaGeneral.deduccionesEspeciales.numeroDependientes = 1; });
    const r = api.calcular(d);
    A.igual([r.dependientes.usaDeduccion10, r.dependientes.adicion72], [false, 1]);
    A.cerca(r.rentaLiquidaGravableCedulaGeneral, 13.8e6 - 3585528, 0.5);
  });
  prueba("5 dependientes sin relación laboral: 10% con uno y 72 UVT con cuatro (el máximo)", () => {
    const d = nueva((x) => { x.cedulaGeneral.laboral.honorariosSinCostos = 200e6; x.cedulaGeneral.deduccionesEspeciales.numeroDependientes = 5; });
    const r = api.calcular(d);
    A.igual([r.dependientes.usaDeduccion10, r.dependientes.adicion72], [true, 4]);
  });
  prueba("honorarios con costos y dependientes: la deducción del 10% se pide sobre ese ingreso (casilla 51)", () => {
    // c43 = 100M → 10% = 10M va a la casilla 51; sin ingresos en la columna 1
    const d = nueva((x) => { Object.assign(x.cedulaGeneral.honorarios, { ingresosBrutos: 100e6 }); x.cedulaGeneral.deduccionesEspeciales.numeroDependientes = 1; });
    const r = api.calcular(d);
    const v = casillas(d);
    // Con 1 dependiente: la deducción del 10% (10M, base 90M) deja menos impuesto que 72 UVT (base 96,4M)
    A.igual(r.dependientes.modo, "una_u_otra");
    A.igual([v[51], v[53], v[57], v[139], v[138]], [10e6, 10e6, 90e6, 0, 1]);
  });

  grupo("Independientes: la exógena y el documento");
  prueba("los servicios que la DIAN ubica en la casilla 43 (R43) se importan a la columna de honorarios con costos", () => {
    const { filasExogena, partida } = require("../lib/exogenaSintetica.js");
    const info = api.analizarExogenaDian(filasExogena({ anio: 2025, partidas: [partida("800000002", "COLEGIO DE EJEMPLO", "Servicios (Concepto: 5004)", 3000000, "Tope 1: Ingresos brutos | R43 Ingresos brutos por rentas por honorarios y compensación de servicios personales sujetos a costos y gastos y no a las rentas exentas num 10 art 206")] }));
    const linea = info.lineas.find((l) => l.campoId === "i_hon_bruto");
    A.igual(linea && linea.valor, 3000000);
    A.cierto(linea.notas.length > 0, "debía explicar la alternativa sin costos");
    A.igual(info.cruceTope1 === null || info.cruceTope1 === undefined || typeof info.cruceTope1 === "object", true);
  });
};
