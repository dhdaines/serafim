// Fake requires that will be removed by webpack
require("purecss");
require("./index.css");

import * as PDFObject from "pdfobject";

class App {
  constructor() {}
  initialize() {
    PDFObject.embed("/Rgl-1314-2021-L-Lotissement.pdf", "#document-view", {
      pdfOpenParams: { page: 6 },
    });
  }
}

window.addEventListener("load", () => {
  const app = new App();
  app.initialize();
});
