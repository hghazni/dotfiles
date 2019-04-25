"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const css_class_definition_1 = require("../../common/css-class-definition");
class ScssClassExtractor {
    /**
     * @description Extracts class names from CSS AST
     */
    static extract(scss) {
        const classNameRegex = /[.|\#]([\w-]+)/g;
        const definitions = [];
        let item = classNameRegex.exec(scss);
        while (item) {
            definitions.push(new css_class_definition_1.default(item[1]));
            item = classNameRegex.exec(scss);
        }
        return definitions;
    }
}
exports.default = ScssClassExtractor;
//# sourceMappingURL=scss-class-extractor.js.map