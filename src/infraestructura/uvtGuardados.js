// Infraestructura: recordar en el navegador los UVT que el usuario agrega en Configuración (el valor
// oficial de cada año está en dominio/taxRules.js). Es lo único que la app guarda; usa localStorage y
// por eso vive aquí y no en el dominio.
// Única excepción a "la app no guarda nada": los UVT que el usuario agrega en Configuración se
// recuerdan en el navegador hasta que los cambie o los quite, para no tener que ponerlos de nuevo
// cada vez que abre la app. Es un dato público (nada personal). Si el navegador no deja guardar
// (modo privado, datos bloqueados), la app sigue funcionando y el valor vale solo en esa sesión.
// Además, el UVT usado siempre viaja dentro del documento Excel que se exporta.
const CLAVE_UVT_GUARDADOS = "declaracion_renta_co_uvt";
const UVT_OFICIALES = { ...UVT_BY_YEAR }; // copia de taxRules.js, para poder restablecerlos
let uvtGuardados = {}; // los personalizados que se recuerdan: { "2027": 55000 }

function leerUvtGuardados() {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_UVT_GUARDADOS) || "{}");
    const limpio = {};
    Object.entries(crudo && typeof crudo === "object" ? crudo : {}).forEach(([anio, valor]) => {
      if (/^\d{4}$/.test(anio) && typeof valor === "number" && Number.isFinite(valor) && valor > 0) {
        limpio[anio] = valor;
      }
    });
    return limpio;
  } catch (e) {
    return {};
  }
}

function persistirUvtGuardados() {
  try {
    localStorage.setItem(CLAVE_UVT_GUARDADOS, JSON.stringify(uvtGuardados));
    return true;
  } catch (e) {
    return false;
  }
}

// Se llama al abrir la app: aplica los UVT recordados encima de los oficiales. Uno recordado que ya
// coincide con el oficial se descarta, para que una actualización de taxRules.js nunca quede tapada.
function aplicarUvtGuardados() {
  uvtGuardados = leerUvtGuardados();
  let huboCambio = false;
  Object.entries(uvtGuardados).forEach(([anio, valor]) => {
    if (UVT_OFICIALES[anio] === valor) {
      delete uvtGuardados[anio];
      huboCambio = true;
    } else {
      UVT_BY_YEAR[anio] = valor;
    }
  });
  if (huboCambio) persistirUvtGuardados();
}

// Agrega o cambia un UVT y lo recuerda. Devuelve false si el navegador no dejó guardarlo.
function guardarUvtPersonalizado(anio, valor) {
  UVT_BY_YEAR[anio] = valor;
  uvtGuardados[anio] = valor;
  return persistirUvtGuardados();
}

// Quita un UVT recordado: vuelve al oficial de taxRules.js, o desaparece si ese año no estaba allí.
function quitarUvtPersonalizado(anio) {
  delete uvtGuardados[anio];
  if (UVT_OFICIALES[anio]) UVT_BY_YEAR[anio] = UVT_OFICIALES[anio];
  else delete UVT_BY_YEAR[anio];
  return persistirUvtGuardados();
}

// El UVT que trae un documento abierto vale en la sesión, pero no se recuerda.
function usarUvtDelDocumento(anio, valor) {
  UVT_BY_YEAR[anio] = valor;
}
