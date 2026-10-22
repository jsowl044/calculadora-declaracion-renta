// Tabla del Art. 241 y motor de cálculo. Los valores esperados se calculan aquí a mano, sin usar el código de la
// app, con la tabla escrita literalmente como en la ley.
const UVT_2025 = 49799;

// Art. 241 ET (Ley 2277 de 2022), en UVT. Escrita aparte de taxRules.js a propósito.
function impuestoNaivoUvt(b) {
  if (b <= 1090) return 0;
  if (b <= 1700) return (b - 1090) * 0.19;
  if (b <= 4100) return (b - 1700) * 0.28 + 116;
  if (b <= 8670) return (b - 4100) * 0.33 + 788;
  if (b <= 18970) return (b - 8670) * 0.35 + 2296;
  if (b <= 31000) return (b - 18970) * 0.37 + 5901;
  return (b - 31000) * 0.39 + 10352;
}
const impuestoNaivoPesos = (basePesos) => impuestoNaivoUvt(basePesos / UVT_2025) * UVT_2025;

module.exports = ({ prueba, grupo, A }, { api }) => {
  const nueva = (cambios) => {
    const d = api.plantillaDeclaracion();
    d.anioGravable = 2025;
    cambios(d);
    return d;
  };

  grupo("UVT oficiales");
  prueba("UVT 2023 a 2026", () => {
    A.igual([2023, 2024, 2025, 2026].map((a) => api.getUvt(a)), [42412, 47065, 49799, 52374]);
  });
  prueba("un año sin UVT devuelve null (no inventa un valor)", () => A.igual(api.getUvt(2031), null));

  grupo("Tabla del Art. 241");
  prueba("coincide con la tabla literal en 400 puntos entre 0 y 40.000 UVT", () => {
    for (let i = 0; i <= 400; i++) {
      const b = i * 100 + (i % 7) * 13.37;
      A.cerca(api.calcularImpuestoPorTabla241(b), impuestoNaivoUvt(b), 1e-9, `base ${b} UVT`);
    }
  });
  prueba("valores exactos en los límites de tramo", () => {
    A.igual(api.calcularImpuestoPorTabla241(1090), 0);
    A.cerca(api.calcularImpuestoPorTabla241(1700), 115.9, 1e-9);
    A.cerca(api.calcularImpuestoPorTabla241(4100), 788, 1e-9);
    A.cerca(api.calcularImpuestoPorTabla241(8670), 2296.1, 1e-9);
    A.cerca(api.calcularImpuestoPorTabla241(18970), 5901, 1e-9);
    A.cerca(api.calcularImpuestoPorTabla241(31000), 10352.1, 1e-9);
  });
  prueba("base cero o negativa no paga", () => {
    A.igual(api.calcularImpuestoPorTabla241(0), 0);
    A.igual(api.calcularImpuestoPorTabla241(-5), 0);
  });
  prueba("la tabla oficial tiene un salto de ~0,1 UVT en 1.700 UVT (constantes redondeadas a UVT enteras)", () => {
    const salto = api.calcularImpuestoPorTabla241(1700.000001) - api.calcularImpuestoPorTabla241(1700);
    A.cerca(salto, 0.1, 1e-4);
  });

  grupo("Motor de cálculo: casos calculados a mano (UVT 2025 = 49.799)");
  prueba("empleado simple: 100M de salario y 8M de aportes", () => {
    // renta líquida laboral 92M; exenta 25% = 23M (< 790 UVT = 39.341.210); límite 40% = 36,8M (no se alcanza);
    // base gravable = 69.000.000; impuesto = 0,19 × (69.000.000 − 1.090 × 49.799)
    const r = api.calcular(nueva((d) => { d.cedulaGeneral.laboral.ingresosBrutos = 100e6; d.cedulaGeneral.laboral.aportesObligatoriosSaludPension = 8e6; }));
    A.cerca(r.rentaLiquidaGravableCedulaGeneral, 69e6, 0.5);
    A.cerca(r.impuesto.impuestoTotal, 0.19 * (69e6 - 1090 * UVT_2025), 0.5);
    A.cerca(r.deducciones.rentaExentaLaboral25, 23e6, 0.5);
  });
  prueba("con 2 dependientes: deducción del 10% y beneficio adicional de 72 UVT cada uno", () => {
    // dependientes = min(10% × 100M, 384 UVT) = 10M; exenta 25% = 0,25 × (92M − 10M) = 20,5M;
    // renta líquida ordinaria = 92M − 10M − 20,5M = 61,5M; beneficio = 2 × 72 × 49.799 = 7.171.056
    const r = api.calcular(nueva((d) => {
      d.cedulaGeneral.laboral.ingresosBrutos = 100e6; d.cedulaGeneral.laboral.aportesObligatoriosSaludPension = 8e6;
      d.cedulaGeneral.deduccionesEspeciales.numeroDependientes = 2;
    }));
    A.cerca(r.deducciones.dependientes, 10e6, 0.5);
    A.cerca(r.deducciones.beneficioAdicionalPorDependientes, 2 * 72 * UVT_2025, 0.5);
    A.cerca(r.rentaLiquidaGravableCedulaGeneral, 61.5e6 - 2 * 72 * UVT_2025, 0.5);
    A.cerca(r.impuesto.impuestoTotal, impuestoNaivoPesos(61.5e6 - 2 * 72 * UVT_2025), 0.5);
  });
  prueba("más de 4 dependientes: el beneficio adicional se limita a 4", () => {
    const r = api.calcular(nueva((d) => { d.cedulaGeneral.laboral.ingresosBrutos = 200e6; d.cedulaGeneral.deduccionesEspeciales.numeroDependientes = 6; }));
    A.cerca(r.deducciones.beneficioAdicionalPorDependientes, 4 * 72 * UVT_2025, 0.5);
  });
  prueba("el límite global (40% o 1.340 UVT) recorta deducciones y exentas", () => {
    // salario 300M, aportes 24M, vivienda 50M, prepagada 30M (tope 192 UVT).
    // deducciones = 50M + 192 × 49.799 = 59.561.408; exenta 25% = min(0,25 × (276M − 59.561.408), 790 UVT) = 39.341.210;
    // suma = 98.902.618 > límite = min(40% × 276M, 1.340 UVT) = 66.730.660, así que se recorta a 66.730.660.
    const r = api.calcular(nueva((d) => {
      d.cedulaGeneral.laboral.ingresosBrutos = 300e6; d.cedulaGeneral.laboral.aportesObligatoriosSaludPension = 24e6;
      d.cedulaGeneral.deduccionesEspeciales.interesesVivienda = 50e6; d.cedulaGeneral.deduccionesEspeciales.saludPrepagada = 30e6;
    }));
    A.cerca(r.deducciones.limiteGlobal, 1340 * UVT_2025, 0.5);
    A.cerca(r.deducciones.totalDeduccionesEspeciales + r.deducciones.totalRentasExentas, 1340 * UVT_2025, 0.5);
    A.cerca(r.rentaLiquidaGravableCedulaGeneral, 276e6 - 1340 * UVT_2025, 0.5);
    A.cerca(r.impuesto.impuestoTotal, impuestoNaivoPesos(276e6 - 1340 * UVT_2025), 0.5);
  });
  prueba("pensión pequeña: toda exenta (mesada neta por debajo de 1.000 UVT)", () => {
    const r = api.calcular(nueva((d) => { d.pensiones.ingresoBrutoAnual = 90e6; d.pensiones.ingresosNoConstitutivos = 3e6; }));
    A.cerca(r.ingresos.pensionExentaAnual, 87e6, 0.5);
    A.igual(r.ingresos.pensionGravable, 0);
    A.igual(r.impuesto.impuestoTotal, 0);
  });
  prueba("pensión grande: solo las primeras 1.000 UVT mensuales son exentas", () => {
    const r = api.calcular(nueva((d) => { d.pensiones.ingresoBrutoAnual = 1200e6; }));
    const exenta = 1000 * UVT_2025 * 12; // 597.588.000
    A.cerca(r.ingresos.pensionExentaAnual, exenta, 0.5);
    A.cerca(r.ingresos.pensionGravable, 1200e6 - exenta, 0.5);
    A.cerca(r.impuesto.impuestoTotal, impuestoNaivoPesos(1200e6 - exenta), 0.5);
  });
  prueba("1% de compras con factura electrónica, con tope de 240 UVT", () => {
    const r1 = api.calcular(nueva((d) => { d.cedulaGeneral.comprasFacturaElectronica = 8e6; }));
    A.cerca(r1.deducciones.descuentoComprasFacturaElectronica, 80000, 0.5);
    const r2 = api.calcular(nueva((d) => { d.cedulaGeneral.comprasFacturaElectronica = 5e9; }));
    A.cerca(r2.deducciones.descuentoComprasFacturaElectronica, 240 * UVT_2025, 0.5);
  });
  prueba("el 1% de facturas se resta de la base y no entra al límite global", () => {
    const sin = api.calcular(nueva((d) => { d.cedulaGeneral.noLaboral.otrosNoLaborales = 80e6; }));
    const con = api.calcular(nueva((d) => { d.cedulaGeneral.noLaboral.otrosNoLaborales = 80e6; d.cedulaGeneral.comprasFacturaElectronica = 10e6; }));
    A.cerca(sin.rentaLiquidaGravableCedulaGeneral - con.rentaLiquidaGravableCedulaGeneral, 100000, 0.5);
  });
  prueba("rentas no laborales y de capital restan sus costos e ingresos no constitutivos", () => {
    const r = api.calcular(nueva((d) => {
      d.cedulaGeneral.noLaboral.otrosNoLaborales = 54e6; d.cedulaGeneral.noLaboral.costosYDeduccionesProcedentes = 4e6;
      d.cedulaGeneral.capital.intereses = 3e6; d.cedulaGeneral.capital.ingresosNoConstitutivos = 1e6;
    }));
    A.cerca(r.ingresos.rentaLiquidaNoLaboral, 50e6, 0.5);
    A.cerca(r.ingresos.rentaLiquidaCapital, 2e6, 0.5);
    A.cerca(r.rentaLiquidaGravableCedulaGeneral, 52e6, 0.5);
  });
  prueba("dividendos (Art. 242): el impuesto es la diferencia de la tabla con y sin el dividendo", () => {
    const base = 60e6, div = 30e6;
    const r = api.calcular(nueva((d) => { d.cedulaGeneral.noLaboral.otrosNoLaborales = base; d.dividendos.dividendosGravables = div; }));
    A.cerca(r.impuesto.impuestoDividendosPesos, impuestoNaivoPesos(base + div) - impuestoNaivoPesos(base), 0.5);
  });
  prueba("dividendos de 2016 o anteriores: tarifa que indica el usuario", () => {
    const r = api.calcular(nueva((d) => { d.dividendos.dividendosAnio2016yAnteriores = 5e6; d.dividendos.tarifaDividendosAntiguos = 0.33; }));
    A.cerca(r.impuesto.impuestoDividendosAntiguosPesos, 1.65e6, 0.5);
  });
  prueba("saldo = impuesto − retenciones − anticipo − saldo a favor anterior", () => {
    const r = api.calcular(nueva((d) => {
      d.cedulaGeneral.laboral.ingresosBrutos = 100e6; d.cedulaGeneral.laboral.aportesObligatoriosSaludPension = 8e6;
      d.retenciones.retencionFuentePracticada = 1.2e6; d.retenciones.autorretenciones = 300000;
      d.anticipos.anticipoRentaAnioAnterior = 300000; d.anticipos.saldoAFavorAnioAnterior = 200000;
    }));
    A.cerca(r.saldoNeto, r.impuesto.impuestoTotal - 2e6, 0.5);
    A.igual(r.saldoTipo, "a_pagar");
  });
  prueba("sin UVT configurada avisa y no inventa un cálculo", () => {
    const r = api.calcular(nueva((d) => { d.anioGravable = 2031; d.cedulaGeneral.laboral.ingresosBrutos = 100e6; }));
    A.cierto(r.avisos.length > 0 && r.valorUvt === 0, "debía avisar que falta la UVT");
  });
  prueba("cruce con el Tope 1 de la DIAN: coincide, faltan o sobran ingresos", () => {
    A.igual(api.compararConTope1(70e6, 70e6).estado, "coincide");
    // tolerancia = mayor entre $10.000 y 0,2% del Tope: para 70M son $140.000
    A.igual(api.compararConTope1(70e6, 70e6 - 200000).estado, "faltan_ingresos");
    A.igual(api.compararConTope1(70e6, 70e6 + 200000).estado, "ingresos_adicionales");
    A.igual(api.compararConTope1(70e6, 70e6 - 130000).estado, "coincide", "dentro de la tolerancia del 0,2%");
    A.igual(api.compararConTope1(1e6, 1e6 - 9000).estado, "coincide", "Tope pequeño: manda el mínimo de $10.000");
    A.igual(api.compararConTope1(1e6, 1e6 - 12000).estado, "faltan_ingresos");
    A.igual(api.compararConTope1(0, 5), null);
  });
};
