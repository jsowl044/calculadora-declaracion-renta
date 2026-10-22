# Librerías de terceros (sin CDN)

La app funciona 100% sin internet: estas librerías se sirven desde esta carpeta en vez de
descargarse de un CDN. Son las mismas versiones y los mismos archivos que se usaban antes
desde cdnjs; se verificó que son idénticos byte a byte a los del paquete publicado en npm.

| Archivo | Librería | Versión | Licencia | Para qué se usa |
|---|---|---|---|---|
| `xlsx.full.min.js` | [SheetJS Community Edition](https://sheetjs.com) (`xlsx`) | 0.18.5 | Apache-2.0 (`LICENSE-sheetjs.txt`) | Leer Excel/CSV al importar |
| `pdf.min.js` | [pdf.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`) | 3.11.174 | Apache-2.0 (`LICENSE-pdfjs.txt`) | Leer PDF al importar |
| `pdf.worker.min.js` | pdf.js (hilo de trabajo) | 3.11.174 | Apache-2.0 | Lo carga `pdf.min.js` |

SHA-256:

```
c9506197caf809a075b6dee1da0d36fb19da7158ffe8a88e7b0c96c5d8623c99  xlsx.full.min.js
5b5799e6f8c680663207ac5b42ee14eed2a406fa7af48f50c154f0c0b1566946  pdf.min.js
feabdf309770ed24bba31a5467836cdc8cf639c705af27d52b585b041bb8527b  pdf.worker.min.js
```

Para actualizarlas: `npm pack xlsx@<versión> pdfjs-dist@<versión>`, copia `dist/xlsx.full.min.js`
y `build/pdf.min.js` + `build/pdf.worker.min.js` aquí, y actualiza esta tabla.
