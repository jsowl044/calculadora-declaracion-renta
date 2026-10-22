// Casillas del Formulario 210: con miles de declaraciones aleatorias, deben cumplirse SIEMPRE las fórmulas del
// instructivo oficial de la DIAN (las mismas que cumplen las declaraciones presentadas), los topes y el
// redondeo a miles.
function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fórmulas del instructivo. Devuelve la lista de las que NO se cumplen.
function fallasDeFormulas(e) {
  const g = (n) => e[n] || 0;
  const fallas = [];
  const igual = (nombre, a, b) => { if (a !== b) fallas.push(`${nombre}: ${a} ≠ ${b}`); };
  igual("31 = 29 − 30", g(31), Math.max(g(29) - g(30), 0));
  igual("32 = 355 + 356", g(32), g(355) + g(356));
  igual("34 = 32 − 33", g(34), Math.max(g(32) - g(33), 0));
  igual("46 = 43 − 44 − 45", g(46), Math.max(g(43) - g(44) - g(45), 0));
  igual("49 = 47 + 48", g(49), g(47) + g(48));
  igual("52 = 50 + 51", g(52), g(50) + g(51));
  igual("54 = 43 − 44 − 45 − 53", g(54), Math.max(g(43) - g(44) - g(45) - g(53), 0));
  igual("57 = 54 − 56", g(57), Math.max(g(54) - g(56), 0));
  igual("37 = 35 + 36", g(37), g(35) + g(36));
  igual("40 = 38 + 39", g(40), g(38) + g(39));
  igual("42 = 34 − 41", g(42), Math.max(g(34) - g(41), 0));
  igual("61 = 58 − 59 − 60", g(61), Math.max(g(58) - g(59) - g(60), 0));
  igual("78 = 74 − 75 − 76 − 77", g(78), Math.max(g(74) - g(75) - g(76) - g(77), 0));
  igual("91 = 41+42+53+57+69+73+86+90", g(91), g(41) + g(42) + g(53) + g(57) + g(69) + g(73) + g(86) + g(90));
  igual("92 = 28+41+53+69+86+139", g(92), g(28) + g(41) + g(53) + g(69) + g(86) + g(139));
  igual("93 = 91 − 92", g(93), Math.max(g(91) - g(92), 0));
  igual("97 = 93 + 96 − 94 − 95", g(97), g(93) + g(96) - g(94) - g(95));
  igual("101 = 99 − 100", g(101), Math.max(g(99) - g(100), 0));
  igual("103 = 101 − 102", g(103), Math.max(g(101) - g(102), 0));
  igual("121 = 116+117+118+119+120", g(121), g(116) + g(117) + g(118) + g(119) + g(120));
  igual("126 = 121 − 125", g(126), g(121) - g(125));
  igual("129 = 126 + 127 − 128", g(129), g(126) + g(127) - g(128));
  igual("134", g(134), Math.max(g(129) + g(133) - g(130) - g(131) - g(132), 0));
  igual("136", g(136), Math.max(g(129) + g(133) + g(135) - g(130) - g(131) - g(132), 0));
  igual("137", g(137), Math.max(g(130) + g(131) + g(132) - g(129) - g(133) - g(135), 0));
  return fallas;
}

const SIN_REDONDEO = new Set([138, 297, 299, 355, 356, 980]); // número de dependientes y casillas auxiliares

module.exports = ({ prueba, grupo, A }, { api }) => {
  grupo("Casillas del Formulario 210 con declaraciones aleatorias");
  const N = 4000;
  const rand = aleatorio(20261022);
  const monto = (max) => (rand() < 0.35 ? 0 : Math.round((rand() * max) / 1000) * 1000);

  function declaracionAleatoria() {
    const d = api.plantillaDeclaracion();
    d.anioGravable = 2023 + Math.floor(rand() * 4);
    const L = d.cedulaGeneral.laboral;
    L.ingresosBrutos = monto(rand() < 0.2 ? 1500e6 : 250e6);
    L.aportesObligatoriosSaludPension = Math.min(monto(20e6), L.ingresosBrutos);
    L.cesantiasEIntereses = monto(30e6);
    L.ingresoLaboralPromedio6Meses = monto(60e6);
    L.rentaExentaManualActiva = rand() < 0.1;
    L.rentaExentaManualValor = monto(40e6);
    L.honorariosSinCostos = monto(rand() < 0.15 ? 600e6 : 120e6);
    const H = d.cedulaGeneral.honorarios;
    H.ingresosBrutos = monto(rand() < 0.15 ? 600e6 : 150e6);
    H.ingresosNoConstitutivos = Math.min(monto(20e6), H.ingresosBrutos);
    H.costosYGastos = monto(rand() < 0.3 ? 200e6 : 60e6);
    const C = d.cedulaGeneral.capital;
    C.intereses = monto(20e6); C.arriendos = monto(60e6); C.otrosCapital = monto(10e6);
    C.ingresosNoConstitutivos = monto(5e6); C.costosYDeduccionesProcedentes = monto(30e6);
    const N_ = d.cedulaGeneral.noLaboral;
    N_.honorariosServicios = monto(120e6); N_.otrosNoLaborales = monto(120e6);
    N_.ingresosNoConstitutivos = monto(5e6); N_.costosYDeduccionesProcedentes = monto(60e6);
    const E = d.cedulaGeneral.deduccionesEspeciales;
    E.interesesVivienda = monto(90e6); E.saludPrepagada = monto(20e6);
    E.numeroDependientes = Math.floor(rand() * 7); E.aportesVoluntariosPensionAFC = monto(80e6);
    d.cedulaGeneral.comprasFacturaElectronica = monto(rand() < 0.1 ? 3e9 : 80e6);
    d.pensiones.ingresoBrutoAnual = monto(rand() < 0.1 ? 1500e6 : 120e6);
    d.pensiones.ingresosNoConstitutivos = Math.min(monto(10e6), d.pensiones.ingresoBrutoAnual);
    d.dividendos.dividendosGravables = monto(100e6);
    d.dividendos.dividendosAnio2016yAnteriores = monto(20e6);
    d.dividendos.tarifaDividendosAntiguos = [0, 0.33, 0.35][Math.floor(rand() * 3)];
    d.retenciones.retencionFuentePracticada = monto(40e6); d.retenciones.autorretenciones = monto(5e6);
    d.anticipos.anticipoRentaAnioAnterior = monto(5e6); d.anticipos.saldoAFavorAnioAnterior = monto(10e6);
    d.patrimonio.activos = monto(600e6); d.patrimonio.pasivos = monto(200e6);
    return d;
  }

  let primeraFalla = null;
  const resumen = { formulas: 0, redondeo: 0, topes: 0 };
  for (let i = 0; i < N; i++) {
    const d = declaracionAleatoria();
    const r = api.calcular(d);
    const c = api.construirCasillas210(d, r);
    if (!c.disponible) continue;
    const v = c.valores;
    const uvt = c.uvt;
    const fallas = fallasDeFormulas(v);
    if (fallas.length) { resumen.formulas++; primeraFalla = primeraFalla || `fórmulas (caso ${i}): ${fallas.slice(0, 3).join("; ")}`; }
    const malRedondeadas = Object.entries(v).filter(([n, val]) => !SIN_REDONDEO.has(Number(n)) && typeof val === "number" && val % 1000 !== 0);
    if (malRedondeadas.length) { resumen.redondeo++; primeraFalla = primeraFalla || `redondeo (caso ${i}): casilla ${malRedondeadas[0][0]} = ${malRedondeadas[0][1]}`; }
    const topes = [];
    if (v[41] > v[34]) topes.push("41 > 34");
    if (v[53] > v[46]) topes.push("53 > 46");
    if (v[53] > v[49] + v[52]) topes.push("53 > 49 + 52");
    const cupo = Math.min(0.4 * Math.max(v[32] + v[43] + v[58] + v[74] - v[33] - v[44] - v[59] - v[76], 0), 1340 * uvt);
    if (v[41] + v[53] > cupo + 2000) topes.push(`41 + 53 (${v[41] + v[53]}) > cupo (${Math.round(cupo)})`);
    if (v[139] > (v[42] || 0) + (v[57] || 0)) topes.push("139 > 42 + 57");
    if (v[28] > 240 * uvt + 500) topes.push("28 > 240 UVT");
    if (v[41] > 1340 * uvt + 500) topes.push("41 > 1.340 UVT");
    if (Object.values(v).some((x) => typeof x === "number" && (x < 0 || !Number.isFinite(x)))) topes.push("valor negativo o no finito");
    if (topes.length) { resumen.topes++; primeraFalla = primeraFalla || `topes (caso ${i}): ${topes.join(", ")}`; }
  }
  prueba(`${N} declaraciones aleatorias: se cumplen las fórmulas oficiales del instructivo`, () => A.igual(resumen.formulas, 0, primeraFalla));
  prueba(`${N} declaraciones aleatorias: todas las casillas van aproximadas a miles`, () => A.igual(resumen.redondeo, 0, primeraFalla));
  prueba(`${N} declaraciones aleatorias: se respetan los topes (41 ≤ 34, 139 ≤ 42+57, 28 ≤ 240 UVT, 41 ≤ 1.340 UVT)`, () => A.igual(resumen.topes, 0, primeraFalla));

  grupo("Casillas: casos puntuales");
  prueba("redondeo a miles: la mitad sube", () => {
    A.igual(api.redondearAMiles(1499), 1000);
    A.igual(api.redondearAMiles(1500), 2000);
    A.igual(api.redondearAMiles(0), 0);
  });
  prueba("empleado simple: casillas 32, 33, 34, 36, 41, 42, 97", () => {
    const d = api.plantillaDeclaracion();
    d.anioGravable = 2025;
    d.cedulaGeneral.laboral.ingresosBrutos = 100e6;
    d.cedulaGeneral.laboral.aportesObligatoriosSaludPension = 8e6;
    const v = api.construirCasillas210(d, api.calcular(d)).valores;
    A.igual([v[32], v[33], v[34], v[36], v[41], v[42], v[97]], [100e6, 8e6, 92e6, 23e6, 23e6, 69e6, 69e6]);
    A.igual(v[355], 100e6);
    A.igual(v[356], 0);
  });
  prueba("sin UVT para el año: no hay casillas y avisa", () => {
    const d = api.plantillaDeclaracion();
    d.anioGravable = 2031;
    const c = api.construirCasillas210(d, api.calcular(d));
    A.igual(c.disponible, false);
    A.cierto(c.avisos.length > 0);
  });
};

module.exports.fallasDeFormulas = fallasDeFormulas;
