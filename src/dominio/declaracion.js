// Modelo de la declaración. Cada "declaración" es el conjunto de datos de una persona/entidad para
// un año gravable. La app NO guarda nada de la declaración en el navegador ni en el equipo: lo que
// la persona conserva es el documento Excel que exporta (ver infraestructura/documento.js). La única excepción son
// los UVT que se agregan en Configuración (ver infraestructura/uvtGuardados.js).

function plantillaDeclaracion() {
  return {
    personaNombre: "",
    tipoDocumento: "CC",
    numeroDocumento: "",
    anioGravable: new Date().getFullYear() - 1,
    notas: "",
    patrimonio: {
      activos: 0,
      pasivos: 0,
    },
    cedulaGeneral: {
      laboral: {
        ingresosBrutos: 0, // salarios y demás pagos de una relación laboral (casilla 355)
        honorariosSinCostos: 0, // honorarios y servicios de independientes SIN costos, con renta exenta del 25% (casilla 356)
        aportesObligatoriosSaludPension: 0,
        cesantiasEIntereses: 0,
        ingresoLaboralPromedio6Meses: 0,
        rentaExentaManualActiva: false,
        rentaExentaManualValor: 0,
      },
      // Rentas de trabajo que no provienen de una relación laboral, CON costos y gastos en lugar de la renta
      // exenta del 25% (casillas 43 a 57).
      honorarios: {
        ingresosBrutos: 0,
        ingresosNoConstitutivos: 0,
        costosYGastos: 0,
      },
      capital: {
        intereses: 0,
        arriendos: 0,
        otrosCapital: 0,
        ingresosNoConstitutivos: 0,
        costosYDeduccionesProcedentes: 0,
      },
      noLaboral: {
        honorariosServicios: 0,
        otrosNoLaborales: 0,
        ingresosNoConstitutivos: 0,
        costosYDeduccionesProcedentes: 0,
      },
      deduccionesEspeciales: {
        interesesVivienda: 0,
        saludPrepagada: 0,
        numeroDependientes: 0,
        aportesVoluntariosPensionAFC: 0,
      },
      comprasFacturaElectronica: 0,
    },
    pensiones: {
      ingresoBrutoAnual: 0,
      ingresoBrutoMensualPromedio: 0,
      ingresosNoConstitutivos: 0,
    },
    dividendos: {
      dividendosGravables: 0,
      dividendosAnio2016yAnteriores: 0,
      tarifaDividendosAntiguos: 0,
    },
    retenciones: {
      retencionFuentePracticada: 0,
      autorretenciones: 0,
    },
    anticipos: {
      anticipoRentaAnioAnterior: 0,
      saldoAFavorAnioAnterior: 0,
    },
    // Topes de la información exógena de la DIAN, usados solo como referencia (no entran al cálculo):
    // el Tope 1 para cruzar ingresos y los cinco para saber si hay que declarar.
    referenciasDian: {
      tope1Ingresos: 0,
      tope2Patrimonio: 0,
      tope3ConsumosTarjeta: 0,
      tope4Movimientos: 0,
      tope5Compras: 0,
    },
  };
}

function redondearAMiles(n) {
  return Math.round(n / 1000) * 1000;
}

// Una declaración encadena con la del año anterior: el patrimonio de cierre de un año es el
// punto de partida del siguiente, y el saldo a favor se arrastra a la casilla 131. Esto crea
// la declaración del año siguiente copiando SOLO lo que persiste de un año a otro; los
// ingresos, retenciones y compras del año nunca se copian porque cada año es distinto.
function derivarDeclaracionAnioSiguiente(base) {
  const r = calcular(base);
  const nueva = plantillaDeclaracion();
  const anioBase = parseInt(base.anioGravable, 10) || new Date().getFullYear() - 1;
  nueva.personaNombre = base.personaNombre;
  nueva.tipoDocumento = base.tipoDocumento;
  nueva.numeroDocumento = base.numeroDocumento;
  nueva.anioGravable = anioBase + 1;
  nueva.patrimonio.activos = base.patrimonio.activos || 0;
  nueva.patrimonio.pasivos = base.patrimonio.pasivos || 0;
  nueva.cedulaGeneral.deduccionesEspeciales.numeroDependientes =
    base.cedulaGeneral.deduccionesEspeciales.numeroDependientes || 0;

  const revisar = [
    "Patrimonio: son los saldos del cierre del año anterior; actualízalos con los certificados a 31 de diciembre.",
    "Ingresos, retenciones y compras con factura electrónica: no se copian, ingrésalos del año nuevo.",
    "Si en la declaración anterior liquidaste anticipo para este año (casilla 133), ingrésalo en Retenciones/Anticipos.",
  ];
  let saldoAFavor = 0;
  if (!r.valorUvt) {
    revisar.unshift(
      `No se pudo calcular el saldo a favor porque falta la UVT del año ${anioBase}; ingrésalo a mano en Retenciones/Anticipos.`
    );
  } else if (r.saldoTipo === "a_favor") {
    // Las casillas del formulario se presentan redondeadas a miles; el arrastre debe ser igual.
    saldoAFavor = redondearAMiles(-r.saldoNeto);
    revisar.unshift(
      `Saldo a favor del año anterior: confirma que coincida con la casilla 137 de la declaración presentada (y ponlo en 0 si pediste su devolución).`
    );
  }
  nueva.anticipos.saldoAFavorAnioAnterior = saldoAFavor;
  if (!getUvt(nueva.anioGravable)) {
    revisar.push(
      `Falta configurar la UVT del año ${nueva.anioGravable} (botón Configuración) antes de confiar en el cálculo.`
    );
  }
  nueva.notas = `Creada a partir de la declaración del año gravable ${anioBase}.`;

  return { declaracion: nueva, saldoAFavorArrastrado: saldoAFavor, revisar };
}
