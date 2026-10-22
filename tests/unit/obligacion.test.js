// ¿Estoy obligado a declarar? Arts. 592 y 594-3 ET. UVT 2025 = 49.799: 4.500 UVT = 224.095.500; 1.400 UVT = 69.718.600.
const { filasExogena, casoEjemplo } = require("../lib/exogenaSintetica.js");

const UVT = 49799;
const T_PATRIMONIO = 4500 * UVT; // 224.095.500
const T_1400 = 1400 * UVT; // 69.718.600

module.exports = ({ prueba, grupo, A }, { api }) => {
  const evaluar = (datos) => api.evaluarObligacionDeclarar({ valorUvt: UVT, ...datos });
  const criterio = (o, id) => o.criterios.find((c) => c.id === id);

  grupo("¿Obligado a declarar?: cada tope en su límite exacto");
  prueba("los topes en pesos salen de la UVT: 4.500 UVT = $224.095.500 y 1.400 UVT = $69.718.600", () => {
    const o = evaluar({});
    A.igual(criterio(o, "patrimonio").topePesos, T_PATRIMONIO);
    A.igual(criterio(o, "ingresos").topePesos, T_1400);
  });
  prueba("patrimonio: exactamente 4.500 UVT NO obliga ('no exceda de'); un peso más sí", () => {
    A.igual(criterio(evaluar({ patrimonioApp: T_PATRIMONIO }), "patrimonio").supera, false);
    A.igual(criterio(evaluar({ patrimonioApp: T_PATRIMONIO + 1 }), "patrimonio").supera, true);
  });
  prueba("ingresos: exactamente 1.400 UVT SÍ obliga ('inferiores a 1.400 UVT' no obligan); un peso menos no", () => {
    A.igual(criterio(evaluar({ ingresosApp: T_1400 }), "ingresos").supera, true);
    A.igual(criterio(evaluar({ ingresosApp: T_1400 - 1 }), "ingresos").supera, false);
  });
  [["consumosTarjeta", "tope3ConsumosTarjeta"], ["compras", "tope5Compras"], ["consignaciones", "tope4Movimientos"]].forEach(([id, campo]) => {
    prueba(`${id}: exactamente 1.400 UVT NO obliga ('no excedan' / 'no superen'); un peso más sí`, () => {
      A.igual(criterio(evaluar({ referenciasDian: { [campo]: T_1400 } }), id).supera, false);
      A.igual(criterio(evaluar({ referenciasDian: { [campo]: T_1400 + 1 } }), id).supera, true);
    });
  });
  prueba("las reglas se muestran como las entiende una persona", () => {
    const o = evaluar({});
    A.igual(criterio(o, "patrimonio").regla, "más de 4.500 UVT");
    A.igual(criterio(o, "ingresos").regla, "1.400 UVT o más");
    A.igual(criterio(o, "compras").regla, "más de 1.400 UVT");
  });

  grupo("¿Obligado a declarar?: veredicto y fuentes");
  prueba("basta un tope superado para estar obligado, y se nombran los motivos", () => {
    const o = evaluar({ ingresosApp: 72871472, patrimonioApp: 1e6 });
    A.igual(o.estado, "obligado");
    A.igual(o.motivos, ["Ingresos brutos del año"]);
  });
  prueba("con las dos fuentes se usa la mayor (lo prudente): la app dice poco pero la DIAN dice más", () => {
    const o = evaluar({ ingresosApp: 10e6, referenciasDian: { tope1Ingresos: 80e6 } });
    const c = criterio(o, "ingresos");
    A.igual([c.valorApp, c.valorDian, c.valorUsado, c.supera], [10e6, 80e6, 80e6, true]);
  });
  prueba("sin ningún dato: «incompleto», con los cinco criterios pendientes (no inventa un «no»)", () => {
    const o = evaluar({});
    A.igual(o.estado, "incompleto");
    A.igual(o.pendientes.length, 5);
  });
  prueba("solo con patrimonio e ingresos bajos: «incompleto» porque faltan los tres topes que trae la exógena", () => {
    const o = evaluar({ ingresosApp: 20e6, patrimonioApp: 30e6 });
    A.igual(o.estado, "incompleto");
    A.igual(o.pendientes, ["Consumos con tarjeta de crédito", "Compras y consumos totales", "Consignaciones, depósitos o inversiones"]);
  });
  prueba("con los cinco datos y ninguno superado: «no_obligado»", () => {
    const o = evaluar({ ingresosApp: 20e6, patrimonioApp: 30e6, referenciasDian: { tope2Patrimonio: 31e6, tope1Ingresos: 21e6, tope3ConsumosTarjeta: 5e6, tope4Movimientos: 9e6, tope5Compras: 7e6 } });
    A.igual(o.estado, "no_obligado");
    A.igual(o.motivos, []);
  });
  prueba("sin UVT del año no se puede evaluar y lo dice", () => {
    const o = api.evaluarObligacionDeclarar({ valorUvt: 0, ingresosApp: 1e9 });
    A.igual([o.disponible, o.estado], [false, "sin_uvt"]);
  });
  prueba("siempre avisa de las condiciones que no revisa y de la declaración voluntaria", () => {
    const o = evaluar({});
    A.cierto(o.notas.some((n) => /IVA/.test(n)) && o.notas.some((n) => /voluntaria/.test(n)));
  });

  grupo("¿Obligado a declarar?: integrado con el cálculo y con la exógena");
  prueba("calcular() trae el veredicto con los ingresos totales (laborales + pensión + dividendos...)", () => {
    const d = api.plantillaDeclaracion();
    d.anioGravable = 2025;
    d.cedulaGeneral.laboral.ingresosBrutos = 40e6;
    d.pensiones.ingresoBrutoAnual = 20e6;
    d.dividendos.dividendosGravables = 10e6;
    const o = api.calcular(d).obligacion;
    A.igual(criterio(o, "ingresos").valorApp, 70e6);
    A.igual(o.estado, "obligado");
  });
  prueba("los cinco topes de la exógena se ubican por su número", () => {
    const refs = api.referenciasDianDesdeTopes([
      { detalle: "Tope 1 - Ingresos", valor: 1 }, { detalle: "Tope 2 - Patrimonio", valor: 2 }, { detalle: "Tope 3 - Consumo TC", valor: 3 },
      { detalle: "Tope 4 - Movimiento", valor: 4 }, { detalle: "Tope 5 - Compras", valor: 5 }, { detalle: "Tope 9 - Otro", valor: 9 },
    ]);
    A.igual(refs, { tope1Ingresos: 1, tope2Patrimonio: 2, tope3ConsumosTarjeta: 3, tope4Movimientos: 4, tope5Compras: 5 });
  });
  prueba("la exógena de ejemplo da un veredicto definitivo con sus propios topes", () => {
    const info = api.analizarExogenaDian(filasExogena(casoEjemplo().opciones));
    const o = api.evaluarObligacionDeclarar({ valorUvt: UVT, referenciasDian: api.referenciasDianDesdeTopes(info.topes) });
    // Tope 1 = 70.000.000 ≥ 1.400 UVT (69.718.600): obligado por ingresos; los otros no superan nada
    A.igual(o.estado, "obligado");
    A.igual(o.motivos, ["Ingresos brutos del año"]);
    A.igual(o.pendientes, []);
  });
};
