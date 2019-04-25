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
const Bluebird = require("bluebird");
const _ = require("lodash");
require("source-map-support/register");
const VError = require("verror");
const vscode_1 = require("vscode");
const vscode = require("vscode");
const fetcher_1 = require("./fetcher");
const notifier_1 = require("./notifier");
const parse_engine_gateway_1 = require("./parse-engine-gateway");
const notifier = new notifier_1.default("html-css-class-completion.cache");
let uniqueDefinitions = [];
const completionTriggerChars = ["#", '"', "'", " ", "."];
let caching = false;
const files = {};
let snapshot = {};
let selectors = {};
let definitions = [];
const emmetDisposables = [];
const searchForIn = [".latte", ".twig", ".html", ".slim", ".php", ".scss"];
// hack into it
function endsWithAny(suffixes, str) {
    return suffixes.some((suffix) => {
        return str.endsWith(suffix);
    });
}
function cache(uris, silent = false) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let rewamp = false;
            if (!silent) {
                notifier.notify("eye", "Looking for CSS classes in the workspace...");
            }
            console.log("Looking for parseable documents...");
            if (!uris || uris.length === 0) {
                uris = yield fetcher_1.default.findAllParseableDocuments();
                definitions = [];
                selectors = {};
            }
            else {
                rewamp = true;
            }
            if (!uris || uris.length === 0) {
                console.log("Found no documents");
                notifier.statusBarItem.hide();
                return;
            }
            console.log("Found all parseable documents.");
            let filesParsed = 0;
            let failedLogs = "";
            let failedLogsCount = 0;
            console.log("Parsing documents and looking for CSS class definitions...");
            let defs;
            try {
                yield Bluebird.map(uris, (uri) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        defs = yield parse_engine_gateway_1.default.callParser(uri);
                        const def = { uri, selectors: defs };
                        files[uri.fsPath] = def;
                    }
                    catch (error) {
                        failedLogs += `${uri.path}\n`;
                        failedLogsCount++;
                    }
                    filesParsed++;
                    const progress = ((filesParsed / uris.length) * 100).toFixed(2);
                    if (!silent) {
                        notifier.notify("eye", "Looking for CSS classes in the workspace... (" + progress + "%)", false);
                    }
                }), { concurrency: 30 });
                const isScssEnabled = vscode_1.workspace.getConfiguration()
                    .get("html-css-class-completion.enableScssFindUsage");
                if (!isScssEnabled && searchForIn.indexOf(".scss") >= 0) {
                    searchForIn.pop();
                }
                if (!rewamp) {
                    snapshot = Object.assign({}, files);
                    for (const path of Object.keys(files)) {
                        Array.prototype.push.apply(definitions, files[path].selectors);
                        if (endsWithAny(searchForIn, path)) {
                            files[path].selectors.map((definition) => {
                                const className = definition.className.replace("#", "").replace(".", "");
                                if (selectors[className] === undefined) {
                                    selectors[className] = [];
                                }
                                if (selectors[className].indexOf(files[path].uri) === -1) {
                                    selectors[className].push(files[path].uri);
                                }
                            });
                        }
                    }
                }
                else {
                    Array.prototype.push.apply(definitions, defs);
                    const current = uris[0];
                    if (endsWithAny(searchForIn, uris[0].path)) {
                        if (defs) {
                            if (snapshot[current.fsPath] !== undefined) {
                                snapshot[current.fsPath].selectors.map((element) => {
                                    const className = element.className.replace("#", "").replace(".", "");
                                    if (selectors[className] !== undefined &&
                                        selectors[className].length === 1) {
                                        const indexElem = definitions.indexOf(element);
                                        if (indexElem !== -1) {
                                            definitions.splice(indexElem, 1);
                                            selectors[className] = [];
                                        }
                                    }
                                });
                            }
                            defs.map((definition) => {
                                const className = definition.className.replace("#", "").replace(".", "");
                                if (selectors[className] === undefined) {
                                    selectors[className] = [];
                                }
                                if (selectors[className].indexOf(current) === -1) {
                                    selectors[className].push(current);
                                }
                                snapshot[current.fsPath] = files[current.fsPath];
                            });
                        }
                    }
                }
            }
            catch (err) {
                notifier.notify("alert", "Failed to cache the CSS classes in the workspace (click for another attempt)");
                throw new VError(err, "Failed to parse the documents");
            }
            uniqueDefinitions = _.uniqBy(definitions, (def) => def.className.replace(".", "").replace("#", ""));
            console.log("Summary:");
            console.log(uris.length, "parseable documents found");
            console.log(definitions.length, "CSS class definitions found");
            console.log(uniqueDefinitions.length, "unique CSS class definitions found");
            console.log(failedLogsCount, "failed attempts to parse. List of the documents:");
            console.log(failedLogs);
            if (!silent) {
                notifier.notify("zap", "CSS/SCSS classes cached (click to cache again)");
            }
        }
        catch (err) {
            notifier.notify("alert", "Failed to cache the CSS classes in the workspace (click for another attempt)");
            throw new VError(err, "Failed to cache the class definitions during the iterations over the documents that were found");
        }
    });
}
function provideCompletionItemsGenerator(languageSelector, classMatchRegex, classPrefix = "", splitChar = " ") {
    return vscode_1.languages.registerCompletionItemProvider(languageSelector, {
        provideCompletionItems(document, position) {
            const start = new vscode_1.Position(position.line, 0);
            const range = new vscode_1.Range(start, position);
            const text = document.getText(range);
            // Check if the cursor is on a class attribute and retrieve all the css rules in this class attribute
            const rawClasses = text.match(classMatchRegex);
            const excluded = text.match(/[\"\(\{]/);
            if (!rawClasses || rawClasses.length === 1 ||
                (languageSelector === "slim" && excluded != null && !text.endsWith("class=\""))) {
                return [];
            }
            // Will store the classes found on the class attribute
            const classesOnAttribute = rawClasses[1].split(splitChar);
            // Creates a collection of CompletionItem based on the classes already cached
            const completionItems = uniqueDefinitions.map((definition) => {
                const className = definition.className.replace(".", "").replace("#", "");
                const completionItem = new vscode_1.CompletionItem(className, vscode_1.CompletionItemKind.Variable);
                const completionClassName = `${classPrefix}${className}`;
                let loadFiles = selectors[className];
                let classPrefixOriginal = "#";
                if (definition.className.startsWith("#")) {
                    completionItem.kind = vscode_1.CompletionItemKind.Method;
                }
                else {
                    classPrefixOriginal = ".";
                }
                if (definition.className.startsWith("#") && classPrefix === "#") {
                    completionItem.filterText = completionClassName;
                    completionItem.insertText = completionClassName;
                }
                else if (!definition.className.startsWith("#") && classPrefix === ".") {
                    completionItem.filterText = completionClassName;
                    completionItem.insertText = completionClassName;
                }
                loadFiles = _.uniqBy(loadFiles, (file) => file.fsPath);
                if (loadFiles !== undefined && loadFiles.length > 0) {
                    const markdownDoc = new vscode_1.MarkdownString("`" + classPrefixOriginal + className + "`\r\n\r\n" +
                        loadFiles.length + " occurences in files:\r\n\r\n");
                    const basePath = vscode.workspace.rootPath;
                    loadFiles.forEach((value) => {
                        const path = value.fsPath.replace(basePath, "");
                        markdownDoc.appendMarkdown("\r\n\r\n[" + path + "](" + value.path + ")");
                    });
                    completionItem.documentation = markdownDoc;
                }
                return completionItem;
            });
            // Removes from the collection the classes already specified on the class attribute
            for (const classOnAttribute of classesOnAttribute) {
                for (let j = 0; j < completionItems.length; j++) {
                    if (completionItems[j].insertText === classOnAttribute) {
                        completionItems.splice(j, 1);
                    }
                }
            }
            return completionItems;
        },
    }, ...completionTriggerChars);
}
function enableEmmetSupport(disposables) {
    const emmetRegex = /(?=\.)([\w-\. ]*$)/;
    const languageModes = ["slim", "html", "razor", "php", "latte", "blade", "vue", "twig", "markdown", "erb",
        "handlebars", "ejs", "typescriptreact", "javascript", "javascriptreact", "scss", "sass", "css"];
    languageModes.forEach((language) => {
        emmetDisposables.push(provideCompletionItemsGenerator(language, emmetRegex, "", "."));
    });
}
function disableEmmetSupport(disposables) {
    for (const emmetDisposable of disposables) {
        emmetDisposable.dispose();
    }
}
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const disposables = [];
        const onSave = vscode.workspace.onDidSaveTextDocument((e) => {
            if (["twig", "html", "latte", "slim", "xhtml", "css", "scss"].indexOf(e.languageId) > -1) {
                cache([e.uri], true);
            }
        });
        context.subscriptions.push(onSave);
        vscode_1.workspace.onDidChangeConfiguration((e) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (e.affectsConfiguration("html-css-class-completion.includeGlobPattern") ||
                    e.affectsConfiguration("html-css-class-completion.excludeGlobPattern")) {
                    yield cache([]);
                }
                if (e.affectsConfiguration("html-css-class-completion.enableEmmetSupport")) {
                    const isEnabled = vscode_1.workspace.getConfiguration()
                        .get("html-css-class-completion.enableEmmetSupport");
                    isEnabled ? enableEmmetSupport(emmetDisposables) : disableEmmetSupport(emmetDisposables);
                }
            }
            catch (err) {
                err = new VError(err, "Failed to automatically reload the extension after the configuration change");
                console.error(err);
                vscode_1.window.showErrorMessage(err.message);
            }
        }), null, disposables);
        context.subscriptions.push(...disposables);
        context.subscriptions.push(vscode_1.commands.registerCommand("html-css-class-completion.cache", () => __awaiter(this, void 0, void 0, function* () {
            if (caching) {
                return;
            }
            caching = true;
            try {
                yield cache([]);
            }
            catch (err) {
                err = new VError(err, "Failed to cache the CSS classes in the workspace");
                console.error(err);
                vscode_1.window.showErrorMessage(err.message);
            }
            finally {
                caching = false;
            }
        })));
        // Javascript based extensions
        ["typescriptreact", "javascript", "javascriptreact"].forEach((extension) => {
            context.subscriptions.push(provideCompletionItemsGenerator(extension, /(class|id|className)=["|']([\w- ]*$)/));
        });
        // HTML based extensions
        // tslint:disable-next-line:max-line-length
        ["slim", "html", "latte", "razor", "php", "blade", "vue", "twig", "markdown", "erb", "handlebars", "ejs"].forEach((extension) => {
            context.subscriptions.push(provideCompletionItemsGenerator(extension, /(class|id|className)=["|']([^"^']*$)/i));
        });
        // SLIM based extensions
        ["slim"].forEach((extension) => {
            // tslint:disable-next-line:max-line-length
            context.subscriptions.push(provideCompletionItemsGenerator(extension, /(\#|\.)[^\s]*$/i, ""));
            context.subscriptions.push(provideCompletionItemsGenerator(extension, /(\B#\S+)[^\s]*$/i, "#"));
        });
        // CSS/SCSS based vice-versa extensions
        ["css", "sass", "scss"].forEach((extension) => {
            // tslint:disable-next-line:max-line-length
            context.subscriptions.push(provideCompletionItemsGenerator(extension, /(\.)[^\s]*$/i, "."));
            context.subscriptions.push(provideCompletionItemsGenerator(extension, /(\#)[^\s]*$/i, "#"));
            context.subscriptions.push(provideCompletionItemsGenerator(extension, /@apply ([\.\w- ]*$)/, "."));
        });
        caching = true;
        try {
            yield cache([]);
        }
        catch (err) {
            err = new VError(err, "Failed to cache the CSS classes in the workspace for the first time");
            console.error(err);
            vscode_1.window.showErrorMessage(err.message);
        }
        finally {
            caching = false;
        }
    });
}
exports.activate = activate;
function deactivate() {
    emmetDisposables.forEach((disposable) => disposable.dispose());
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map