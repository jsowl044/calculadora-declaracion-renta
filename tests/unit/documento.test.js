// Documento Excel (exportar y reabrir), UVT recordados y año siguiente.
const canonico = (x) => JSON.stringify(x, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v));

module.exports = ({ prueba, grupo, A }, { api, XLSX, cargarNuevo }) => {
  const rica = () => {
    const d = api.plantillaDeclaracion();
    d.personaNombre = "PERSONA DE EJEMPLO"; d.numeroDocumento = "1000000000"; d.anioGravable = 2025; d.notas = "Una nota de ejemplo";
    d.patrimonio.activos = 135e6; d.patrimonio.pasivos = 22e6;
    const L = d.cedulaGeneral.laboral;
    L.ingresosBrutos = 96e6; L.aportesObligatoriosSaludPension = 7.68e6; L.cesantiasEIntereses = 8e6; L.ingresoLaboralPromedio6Meses = 8e6;
    d.cedulaGeneral.capital.intereses = 900000; d.cedulaGeneral.capital.ingresosNoConstitutivos = 300000;
    d.cedulaGeneral.noLaboral.otrosNoLaborales = 12e6; d.cedulaGeneral.noLaboral.costosYDeduccionesProcedentes = 2e6;
    d.cedulaGeneral.deduccionesEspeciales.interesesVivienda = 4.2e6; d.cedulaGeneral.deduccionesEspeciales.saludPrepagada = 2.4e6;
    d.cedulaGeneral.deduccionesEspeciales.numeroDependientes = 1; d.cedulaGeneral.comprasFacturaElectronica = 8e6;
    d.pensiones.ingresoBrutoAnual = 10e6; d.pensiones.ingresosNoConstitutivos = 400000;
    d.dividendos.dividendosGravables = 5e6;
    d.retenciones.retencionFuentePracticada = 6.8e6; d.anticipos.saldoAFavorAnioAnterior = 300000;
    Object.assign(d.referenciasDian, { tope1Ingresos: 130e6, tope2Patrimonio: 140e6, tope3ConsumosTarjeta: 12e6, tope4Movimientos: 80e6, tope5Compras: 9e6 });
    return d;
  };
  const exportar = (d) => {
    const r = api.calcular(d);
    const c = api.construirCasillas210(d, r);
    const libro = api.construirLibroDocumento(d, c, r.valorUvt, "2026-01-01T00:00:00.000Z");
    return { libro, c };
  };
  const reabrir = (libro) => api.leerLibroDocumento(XLSX.read(XLSX.write(libro, { type: "buffer", bookType: "xlsx" }), { type: "buffer" }));

  grupo("Documento Excel");
  prueba("exportar y reabrir devuelve exactamente la misma declaración", () => {
    const d = rica();
    const res = reabrir(exportar(d).libro);
    A.cierto(res.ok, res.error);
    A.igual(canonico(res.declaracion), canonico(d));
  });
  prueba("lo reabierto produce las mismas casillas", () => {
    const d = rica();
    const { libro, c } = exportar(d);
    const d2 = reabrir(libro).declaracion;
    A.igual(api.construirCasillas210(d2, api.calcular(d2)).valores, c.valores);
  });
  prueba("la hoja «Formulario 210» trae cada casilla con su valor", () => {
    const { libro, c } = exportar(rica());
    const filas = XLSX.utils.sheet_to_json(libro.Sheets["Formulario 210"], { header: 1, defval: "" });
    const enHoja = {};
    filas.forEach((f) => { if (typeof f[0] === "number" && typeof f[2] === "number") enHoja[f[0]] = f[2]; });
    const faltan = Object.entries(enHoja).filter(([n, valor]) => (c.valores[n] || 0) !== valor);
    A.igual(faltan, []);
    A.cierto(Object.keys(enHoja).length > 25, "pocas casillas en la hoja");
  });
  prueba("un Excel que no es de esta app se rechaza con un mensaje, sin romperse", () => {
    const ajeno = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(ajeno, XLSX.utils.aoa_to_sheet([["a", "b"], [1, 2]]), "Hoja1");
    const res = api.leerLibroDocumento(ajeno);
    A.igual(res.ok, false);
    A.cierto(typeof res.error === "string" && res.error.length > 0);
  });
  prueba("un documento sin algunos campos (versión anterior) se abre con valores por defecto", () => {
    const { libro } = exportar(rica());
    const datos = XLSX.utils.sheet_to_json(libro.Sheets["Datos"], { header: 1, defval: "" }).filter((f) => f[0] !== "pen_incrngo" && f[0] !== "tope1Ingresos");
    libro.Sheets["Datos"] = XLSX.utils.aoa_to_sheet(datos);
    const res = reabrir(libro);
    A.cierto(res.ok, res.error);
    A.igual(res.declaracion.pensiones.ingresosNoConstitutivos, 0);
  });
  prueba("el nombre del archivo no lleva caracteres peligrosos", () => {
    const d = rica();
    d.numeroDocumento = "12/3:4*?"; d.personaNombre = "A/B";
    const n = api.nombreArchivoDocumento(d);
    A.cierto(/^[\w.\-() ]+\.xlsx$/.test(n) && !/[\\/:*?"<>|]/.test(n), n);
    A.cierto(n.includes("2025"));
  });

  grupo("UVT recordados en el navegador");
  prueba("agregar un UVT lo recuerda y quitarlo lo borra", () => {
    const { api: a, almacen } = cargarNuevo();
    A.igual(a.getUvt(2027), null);
    A.igual(a.guardarUvtPersonalizado(2027, 55000), true);
    A.igual(a.getUvt(2027), 55000);
    A.igual(JSON.parse(almacen.declaracion_renta_co_uvt), { 2027: 55000 });
    A.igual(a.quitarUvtPersonalizado(2027), true);
    A.igual(a.getUvt(2027), null);
    A.igual(almacen.declaracion_renta_co_uvt, "{}");
  });
  prueba("cambiar un UVT oficial y quitarlo restablece el oficial", () => {
    const { api: a } = cargarNuevo();
    a.guardarUvtPersonalizado(2025, 50000);
    A.igual(a.getUvt(2025), 50000);
    a.quitarUvtPersonalizado(2025);
    A.igual(a.getUvt(2025), 49799);
  });
  prueba("el UVT de un documento abierto vale en la sesión pero no se guarda", () => {
    const { api: a, almacen } = cargarNuevo();
    a.usarUvtDelDocumento(2028, 60000);
    A.igual(a.getUvt(2028), 60000);
    A.igual(almacen.declaracion_renta_co_uvt, undefined);
  });
  prueba("al abrir la app: aplica los recordados, descarta los iguales al oficial y los inválidos", () => {
    const { api: a, almacen } = cargarNuevo();
    almacen.declaracion_renta_co_uvt = JSON.stringify({ 2025: 49799, 2027: 55000, 2026: "x", abc: 5, 2024: -1 });
    a.aplicarUvtGuardados();
    A.igual(a.getUvt(2027), 55000);
    A.igual(a.getUvt(2025), 49799);
    A.igual(JSON.parse(almacen.declaracion_renta_co_uvt), { 2027: 55000 });
  });
  prueba("un almacenamiento dañado no rompe la app", () => {
    const { api: a, almacen } = cargarNuevo();
    almacen.declaracion_renta_co_uvt = "esto no es json";
    a.aplicarUvtGuardados();
    A.igual(a.getUvt(2025), 49799);
  });

  grupo("Declaración del año siguiente");
  prueba("copia solo lo que persiste y arrastra el saldo a favor redondeado a miles", () => {
    const base = api.plantillaDeclaracion();
    base.personaNombre = "PERSONA"; base.numeroDocumento = "1"; base.anioGravable = 2025;
    base.patrimonio.activos = 100e6; base.patrimonio.pasivos = 10e6;
    base.cedulaGeneral.deduccionesEspeciales.numeroDependientes = 2;
    base.cedulaGeneral.laboral.ingresosBrutos = 50e6;
    base.retenciones.retencionFuentePracticada = 6e6;
    const r = api.derivarDeclaracionAnioSiguiente(base);
    A.igual(r.declaracion.anioGravable, 2026);
    A.igual(r.declaracion.personaNombre, "PERSONA");
    A.igual(r.declaracion.patrimonio.activos, 100e6);
    A.igual(r.declaracion.cedulaGeneral.deduccionesEspeciales.numeroDependientes, 2);
    A.igual(r.declaracion.cedulaGeneral.laboral.ingresosBrutos, 0, "los ingresos no se copian");
    A.igual(r.declaracion.retenciones.retencionFuentePracticada, 0, "las retenciones no se copian");
    A.cierto(r.declaracion.anticipos.saldoAFavorAnioAnterior > 0 && r.declaracion.anticipos.saldoAFavorAnioAnterior % 1000 === 0, "saldo a favor en miles");
    A.cierto(r.revisar.length > 0);
  });
  prueba("avisa cuando falta el UVT del año nuevo", () => {
    const { api: a } = cargarNuevo();
    const base = a.plantillaDeclaracion();
    base.anioGravable = 2026; // el siguiente es 2027, que no tiene UVT oficial
    const r = a.derivarDeclaracionAnioSiguiente(base);
    A.cierto(r.revisar.some((t) => /UVT/.test(t)), "debía avisar de la UVT");
  });
};
