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
const vscode = require("vscode");
const os = require("os");
const fs = require("fs");
const http = require("http");
const https = require("https");
const url_1 = require("url");
const crypto = require("crypto");
const path = require("path");
class Fetcher {
    static findAllParseableDocuments() {
        return __awaiter(this, void 0, void 0, function* () {
            // There's a bug in the latest version of the API in which calling vscode.workspace.findFiles
            // when the extension is not being executed inside a workspace, causes a "Cannot read property
            // 'map' of undefined" error.
            // More info: https://github.com/zignd/HTML-CSS-Class-Completion/issues/114
            if (!vscode.workspace.name) {
                return [];
            }
            const configuration = vscode.workspace.getConfiguration();
            const includeGlobPattern = configuration.get("html-css-class-completion.includeGlobPattern");
            const excludeGlobPattern = configuration.get("html-css-class-completion.excludeGlobPattern");
            const remoteStyleSheets = configuration.get("html-css-class-completion.remoteStyleSheets");
            var paths;
            var localFiles = yield vscode.workspace.findFiles(`${includeGlobPattern}`, `${excludeGlobPattern}`);
            if (remoteStyleSheets.length > 0) {
                const folder = path.join(os.tmpdir(), "html_css_slim");
                if (!fs.existsSync(folder)) {
                    fs.mkdirSync(folder);
                }
                for (let remoteFile of remoteStyleSheets) {
                    const filename = this.getFilename(remoteFile);
                    const url = new url_1.URL(remoteFile);
                    if (url.protocol == 'https:') {
                        https.get({
                            host: url.host,
                            path: url.pathname,
                            method: 'GET',
                            port: 443
                        }, function (response) {
                            var file = fs.createWriteStream(path.join(folder, filename));
                            response.pipe(file);
                        });
                    }
                    else {
                        http.get(remoteFile, function (response) {
                            var file = fs.createWriteStream(path.join(folder, filename));
                            response.pipe(file);
                        });
                    }
                }
                const relativePattern = new vscode.RelativePattern(folder, '*.css');
                paths = yield vscode.workspace.findFiles(relativePattern);
                for (let parsedFile of paths) {
                    localFiles[localFiles.length] = parsedFile;
                }
            }
            return localFiles;
        });
    }
    // Parse Filename from URL if not found (such as ends with folder) then md5(url) returns
    static getFilename(url) {
        const filename = decodeURIComponent(new url_1.URL(url).pathname.split('/').pop());
        if (!filename) {
            return crypto.createHash('md5').update(url).digest("hex");
        }
        return filename;
    }
}
exports.default = Fetcher;
//# sourceMappingURL=fetcher.js.map