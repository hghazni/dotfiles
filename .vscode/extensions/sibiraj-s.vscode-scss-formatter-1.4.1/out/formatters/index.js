"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const unibeautify_1 = require("unibeautify");
class Formatter {
    constructor() {
        this.format = (text, filePath, language) => {
            switch (true) {
                default:
                    // const prettier = new Prettier();
                    // const prettierOptions = {
                    //   parser: language,
                    //   ...options
                    // };
                    const beautifyData = {
                        fileExtension: language,
                        filePath,
                        languageName: language,
                        options: {},
                        text
                    };
                    return unibeautify_1.default.beautify(beautifyData);
            }
        };
    }
}
exports.default = Formatter;
//# sourceMappingURL=index.js.map