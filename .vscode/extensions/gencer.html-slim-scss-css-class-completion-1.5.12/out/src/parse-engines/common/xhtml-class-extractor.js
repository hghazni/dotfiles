"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const css_class_definition_1 = require("../../common/css-class-definition");
class XhtmlClassExtractor {
    /**
     * @description Extracts class names from CSS AST
     */
    static extract(html) {
        const classNameRegex = /(class|className)=["']([^"']+)["']/ig;
        const idRegex = /(id)=["']([^"']+)["']/ig;
        let item = classNameRegex.exec(html);
        let itemIds = idRegex.exec(html);
        const classes = [];
        const ids = [];
        while (item) {
            classes.push(item[2]);
            item = classNameRegex.exec(html);
        }
        while (itemIds) {
            ids.push(itemIds[2]);
            itemIds = idRegex.exec(html);
        }
        let referencedDefs = [];
        referencedDefs = referencedDefs.concat(this.process(false, classes));
        referencedDefs = referencedDefs.concat(this.process(true, ids));
        return referencedDefs;
    }
    static process(id, items) {
        const referencedDefs = [];
        items.forEach((elem) => {
            const words = elem.split(" ");
            words.forEach((e) => {
                // we will extract kind from first char
                e = (id) ? `#${e}` : `.${e}`;
                referencedDefs.push(new css_class_definition_1.default(e));
            });
        });
        return referencedDefs;
    }
}
exports.default = XhtmlClassExtractor;
//# sourceMappingURL=xhtml-class-extractor.js.map