// Mini marco de pruebas, sin dependencias.
const estado = { total: 0, fallos: 0 };

function grupo(titulo) {
  console.log(`\n== ${titulo} ==`);
}

function prueba(nombre, fn) {
  estado.total++;
  try {
    fn();
    console.log(`  OK    ${nombre}`);
  } catch (e) {
    estado.fallos++;
    console.log(`  FALLA ${nombre}\n        ${String(e.message).split("\n").join("\n        ")}`);
  }
}

async function pruebaAsync(nombre, fn) {
  estado.total++;
  try {
    await fn();
    console.log(`  OK    ${nombre}`);
  } catch (e) {
    estado.fallos++;
    console.log(`  FALLA ${nombre}\n        ${String(e.message).split("\n").join("\n        ")}`);
  }
}

const A = {
  igual(obtenido, esperado, msg) {
    if (obtenido !== esperado && JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
      throw new Error(`${msg ? msg + ": " : ""}obtenido ${JSON.stringify(obtenido)}, esperado ${JSON.stringify(esperado)}`);
    }
  },
  cerca(obtenido, esperado, tolerancia, msg) {
    if (!(Math.abs(obtenido - esperado) <= tolerancia)) {
      throw new Error(`${msg ? msg + ": " : ""}obtenido ${obtenido}, esperado ${esperado} ± ${tolerancia}`);
    }
  },
  cierto(condicion, msg) {
    if (!condicion) throw new Error(msg || "se esperaba verdadero");
  },
};

function resumen() {
  const ok = estado.total - estado.fallos;
  console.log(`\n${ok}/${estado.total} pruebas OK${estado.fallos ? ` — ${estado.fallos} FALLA(N)` : ""}`);
  return estado.fallos;
}

module.exports = { prueba, pruebaAsync, grupo, A, resumen, estado };
