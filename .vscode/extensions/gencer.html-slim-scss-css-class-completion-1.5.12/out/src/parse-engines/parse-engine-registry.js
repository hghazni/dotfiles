"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const css_parse_engine_1 = require("./types/css-parse-engine");
const html_parse_engine_1 = require("./types/html-parse-engine");
const latte_parse_engine_1 = require("./types/latte-parse-engine");
const php_parse_engine_1 = require("./types/php-parse-engine");
const scss_parse_engine_1 = require("./types/scss-parse-engine");
const slim_parse_engine_1 = require("./types/slim-parse-engine");
class ParseEngineRegistry {
    static getParseEngine(languageId) {
        const foundParseEngine = ParseEngineRegistry.registry.find((value) => value.languageId === languageId);
        if (!foundParseEngine) {
            throw new Error(`Could not find a parse engine for the provided language id ("${languageId}").`);
        }
        return foundParseEngine;
    }
    static get supportedLanguagesIds() {
        if (!ParseEngineRegistry.languagesIds) {
            ParseEngineRegistry.languagesIds = ParseEngineRegistry.registry.map((parseEngine) => parseEngine.languageId);
        }
        return ParseEngineRegistry.languagesIds;
    }
}
ParseEngineRegistry.registry = [
    new css_parse_engine_1.default(),
    new latte_parse_engine_1.default(),
    new scss_parse_engine_1.default(),
    new html_parse_engine_1.default(),
    new slim_parse_engine_1.default(),
    new php_parse_engine_1.default(),
];
exports.default = ParseEngineRegistry;
//# sourceMappingURL=parse-engine-registry.js.map