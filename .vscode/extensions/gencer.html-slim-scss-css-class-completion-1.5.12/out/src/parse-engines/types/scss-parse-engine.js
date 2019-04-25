"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const scss_class_extractor_1 = require("../common/scss-class-extractor");
class ScssParseEngine {
    constructor() {
        this.languageId = "scss";
        this.extension = "scss";
    }
    parse(textDocument) {
        return __awaiter(this, void 0, void 0, function* () {
            const code = textDocument.getText().replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, "");
            return scss_class_extractor_1.default.extract(code);
        });
    }
}
exports.default = ScssParseEngine;
//# sourceMappingURL=scss-parse-engine.js.map