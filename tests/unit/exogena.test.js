// Importación de la exógena (con un Excel INVENTADO, misma estructura que el real) y del informe de facturas.
const { filasExogena, libroExogena, casoEjemplo, partida } = require("../lib/exogenaSintetica.js");

module.exports = ({ prueba, grupo, A }, { api, XLSX }) => {
  grupo("Exógena de la DIAN (datos inventados)");
  const { opciones, esperado } = casoEjemplo();
  const info = api.analizarExogenaDian(filasExogena(opciones));
  const lineas = {};
  info.lineas.forEach((l) => { lineas[l.campoId] = l.valor; });

  prueba("reconoce el archivo y sus datos: año, documento y nombre", () => {
    A.cierto(info.encontrado, "no lo reconoció como exógena");
    A.igual(info.meta.anio, 2025);
    A.igual(info.meta.documento, "1000000000");
    A.igual(info.consultante.nombre, "NOMBRE DE EJEMPLO");
  });
  prueba("lee los cinco topes de la DIAN", () => {
    A.igual(info.topes.map((t) => t.valor), [70e6, 5e6, 4e6, 30e6, 9e6]);
  });
  Object.entries(esperado).forEach(([campo, valor]) => {
    prueba(`campo ${campo} = ${valor.toLocaleString("es-CO")}`, () => A.igual(lineas[campo], valor));
  });
  prueba("el cruce con el Tope 1 coincide (los ingresos propuestos suman 70.000.000)", () => {
    A.igual(info.cruceTope1.estado, "coincide");
  });
  prueba("las partidas de control (consumos, movimientos, compras) no se importan como campos", () => {
    A.cierto(info.controles.length >= 2, `controles: ${info.controles.length}`);
  });
  prueba("lee el Excel real escrito en disco (rangos mal declarados incluidos)", () => {
    const libro = XLSX.read(libroExogena(opciones), { type: "buffer" });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    hoja["!ref"] = "A1:H15"; // los Excel de la DIAN declaran mal su tamaño
    api.ampliarRangoALasCeldasReales(hoja);
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: "" });
    A.igual(filas.length, filasExogena(opciones).length);
  });
  prueba("un archivo vacío o ajeno no se toma por exógena", () => {
    A.igual(api.analizarExogenaDian([]).encontrado, false);
    A.igual(api.analizarExogenaDian([["a", "b"], [1, 2]]).encontrado, false);
  });
  prueba("columnas en otro orden: se ubican por el encabezado", () => {
    const base = filasExogena({ ...opciones, partidas: [partida("1", "X", "Pagos laborales", 1500000, "R32 Ingresos brutos por rentas de trabajo")] });
    const reordenado = base.map((f) => [f[4], f[5], f[6], f[7], f[0], f[1], f[2], f[3]]);
    const r = api.analizarExogenaDian(reordenado);
    A.cierto(r.encontrado);
    A.igual(r.lineas.find((l) => l.campoId === "i_lab_bruto").valor, 1500000);
  });

  grupo("Exógena: reglas de asignación");
  const con = (partidas, topes = {}) => api.analizarExogenaDian(filasExogena({ anio: 2025, topes, partidas }));
  const valorDe = (r, campo) => (r.lineas.find((l) => l.campoId === campo) || {}).valor;
  prueba("pensión (R99) va a pensiones, y sus aportes a salud a la cédula de pensiones", () => {
    const r = con([
      partida("900000010", "FONDO DE PENSIONES EJEMPLO", "Pension jubilación, vejez, invalidez (Concepto: 2276)", 18000000, "Tope 1: Ingresos brutos | R99 Ingresos brutos por rentas de pensiones del país y del exterior"),
      partida("900000010", "FONDO DE PENSIONES EJEMPLO", "Aportes obligatorios a salud a cargo Trabajador (Concepto: 2276)", 700000, "Ingresos no constitutivos de renta | Asignación según el tipo de renta: R33 (Trabajo) / R59 (Capital) / R100 (Pensiones)"),
    ]);
    A.igual(valorDe(r, "pen_anual"), 18000000);
    A.igual(valorDe(r, "pen_incrngo"), 700000);
    A.igual(valorDe(r, "i_lab_aportes"), undefined);
  });
  prueba("servicios (R43) van a honorarios con costos (casilla 43) y la nota explica la alternativa «sin costos»", () => {
    const r = con([partida("800000002", "COLEGIO DE EJEMPLO", "Servicios (Concepto: 5004)", 3000000, "Tope 1: Ingresos brutos | R43 Ingresos brutos por rentas por honorarios y compensación de servicios personales sujetos a costos y gastos y no a las rentas exentas num 10 art 206")]);
    A.igual(valorDe(r, "i_hon_bruto"), 3000000);
    A.igual(valorDe(r, "i_nolab_honorarios"), undefined);
    const linea = r.lineas.find((l) => l.campoId === "i_hon_bruto");
    A.cierto(/sin costos/.test(linea.notas.join(" ")), "la nota debía explicar la alternativa sin costos");
  });
  prueba("los servicios de la R43 cuentan para el cruce con el Tope 1", () => {
    const r = api.analizarExogenaDian(filasExogena({ anio: 2025, topes: { tope1: 3000000 }, partidas: [partida("800000002", "COLEGIO DE EJEMPLO", "Servicios (Concepto: 5004)", 3000000, "Tope 1: Ingresos brutos | R43 Ingresos brutos por honorarios")] }));
    A.igual(r.cruceTope1.estado, "coincide");
  });
  prueba("varias retenciones se suman en un solo campo", () => {
    const r = con([
      partida("1", "A", "Otras retenciones (Concepto: 5016)", 100000, "R132 Retenciones año gravable a declarar"),
      partida("2", "B", "Retención por servicios (Concepto: 5004)", 250000, "R132 Retenciones año gravable a declarar"),
    ]);
    A.igual(valorDe(r, "r_retencion"), 350000);
  });
  const R32 = "Tope 1: Ingresos brutos | R32 Ingresos brutos por rentas de trabajo";
  prueba("cesantías que reportan a la vez el empleador y el fondo se cuentan una sola vez (y también alimentan el campo de cesantías)", () => {
    const r = con([
      partida("800000001", "EMPRESA", "Cesantías consignadas al fondo (Concepto: 2276)", 5000000, R32),
      partida("800000009", "FONDO DE CESANTIAS", "Cesantías abonadas a la cuenta del trabajador (Concepto: 2276)", 5000000, R32),
    ]);
    A.igual(valorDe(r, "i_lab_bruto"), 5000000);
    A.igual(valorDe(r, "i_lab_cesantias"), 5000000);
  });
  prueba("si empleador y fondo reportan distinto, se toma el mayor de los dos", () => {
    const r = con([
      partida("800000001", "EMPRESA", "Cesantías consignadas al fondo (Concepto: 2276)", 5000000, R32),
      partida("800000009", "FONDO DE CESANTIAS", "Cesantías abonadas a la cuenta del trabajador (Concepto: 2276)", 4000000, R32),
    ]);
    A.igual(valorDe(r, "i_lab_bruto"), 5000000);
  });
  prueba("varios empleadores que reportan cesantías consignadas se suman", () => {
    const r = con([
      partida("800000001", "EMPRESA UNO", "Cesantías consignadas al fondo (Concepto: 2276)", 2000000, R32),
      partida("800000002", "EMPRESA DOS", "Cesantías consignadas al fondo (Concepto: 2276)", 3000000, R32),
    ]);
    A.igual(valorDe(r, "i_lab_cesantias"), 5000000);
  });
  prueba("el avalúo catastral entra a los activos con una nota", () => {
    const r = con([partida("890000000", "MUNICIPIO DE EJEMPLO", "Valor avalúo catastral (Concepto: 1476)", 100000000, "Tope 2: Patrimonio | R29 Patrimonio Bruto | Se toma el mayor valor informado entre el avalúo y la base del impuesto predial", "Porcentaje de Participación: 100.00 | Matricula: 1 | Número Propietarios: 1")]);
    A.igual(valorDe(r, "p_activos"), 100000000);
    A.cierto(r.lineas.find((l) => l.campoId === "p_activos").notas.length > 0);
  });
  prueba("una partida con casilla que la app no conoce se lista aparte, sin perderse", () => {
    const r = con([partida("1", "A", "Algo raro", 123456, "R999 Casilla inventada")]);
    A.igual(r.sinUbicar.length, 1);
  });
};
