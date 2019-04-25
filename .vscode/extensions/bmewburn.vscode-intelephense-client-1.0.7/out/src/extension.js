/* Copyright (c) Ben Robert Mewburn
 * Licensed under the MIT Licence.
 */
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const semver = require("semver");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const middleware_1 = require("./middleware");
const fs = require("fs-extra");
const PHP_LANGUAGE_ID = 'php';
const VERSION = '1.0.7';
const INDEXING_STARTED_NOTIFICATION = new vscode_languageclient_1.NotificationType('indexingStarted');
const INDEXING_ENDED_NOTIFICATION = new vscode_languageclient_1.NotificationType('indexingEnded');
const INDEX_WORKSPACE_REQUEST = new vscode_languageclient_1.RequestType('indexWorkspace');
const CANCEL_INDEXING_REQUEST = new vscode_languageclient_1.RequestType('cancelIndexing');
let languageClient;
let extensionContext;
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        extensionContext = context;
        let versionMemento = context.workspaceState.get('version');
        let clearCache = false;
        context.workspaceState.update('version', VERSION);
        if (!versionMemento || (semver.lt(versionMemento, VERSION))) {
            try {
                yield fs.remove(context.storagePath);
            }
            catch (e) {
                //ignore
            }
            clearCache = true;
        }
        //clearCache = true;
        // The server is implemented in node
        let serverModule;
        if (process.env.mode === 'debug') {
            serverModule = context.asAbsolutePath(path.join('node_modules', 'intelephense', 'out', 'server.js'));
        }
        else {
            serverModule = context.asAbsolutePath(path.join('node_modules', 'intelephense', 'lib', 'intelephense.js'));
        }
        // The debug options for the server
        let debugOptions = {
            execArgv: ["--nolazy", "--inspect=6039", "--trace-warnings", "--preserve-symlinks"],
            detached: true
        };
        // If the extension is launched in debug mode then the debug server options are used
        // Otherwise the run options are used
        let serverOptions = {
            run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
            debug: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc, options: debugOptions }
        };
        let middleware = middleware_1.createMiddleware(() => {
            return languageClient;
        });
        // Options to control the language client
        let clientOptions = {
            documentSelector: [
                { language: PHP_LANGUAGE_ID, scheme: 'file' },
                { language: PHP_LANGUAGE_ID, scheme: 'untitled' }
            ],
            synchronize: {
                // Notify the server about file changes to php in the workspace
                fileEvents: vscode_1.workspace.createFileSystemWatcher(workspaceFilesIncludeGlob()),
            },
            initializationOptions: {
                storagePath: context.storagePath,
                clearCache: clearCache
            },
            middleware: middleware
        };
        // Create the language client and start the client.
        languageClient = new vscode_languageclient_1.LanguageClient('intelephense', 'intelephense', serverOptions, clientOptions);
        let ready = languageClient.onReady();
        ready.then(() => {
            languageClient.info('Intelephense ' + VERSION);
            let resolveIndexingPromise;
            languageClient.onNotification(INDEXING_STARTED_NOTIFICATION.method, () => {
                vscode_1.window.setStatusBarMessage('$(sync~spin) intelephense indexing ...', new Promise((resolve, reject) => {
                    resolveIndexingPromise = () => {
                        resolve();
                    };
                }));
            });
            languageClient.onNotification(INDEXING_ENDED_NOTIFICATION.method, () => {
                if (resolveIndexingPromise) {
                    resolveIndexingPromise();
                }
                resolveIndexingPromise = undefined;
            });
        });
        let indexWorkspaceDisposable = vscode_1.commands.registerCommand('intelephense.index.workspace', indexWorkspace);
        let cancelIndexingDisposable = vscode_1.commands.registerCommand('intelephense.cancel.indexing', cancelIndexing);
        //push disposables
        context.subscriptions.push(indexWorkspaceDisposable, cancelIndexingDisposable, middleware);
        languageClient.start();
    });
}
exports.activate = activate;
function deactivate() {
    if (!languageClient) {
        return undefined;
    }
    return languageClient.stop();
}
exports.deactivate = deactivate;
function indexWorkspace() {
    languageClient.sendRequest(INDEX_WORKSPACE_REQUEST.method);
}
function cancelIndexing() {
    languageClient.sendRequest(CANCEL_INDEXING_REQUEST.method);
}
function workspaceFilesIncludeGlob() {
    let settings = vscode_1.workspace.getConfiguration('files').get('associations');
    let associations = Object.keys(settings).filter((x) => {
        return settings[x] === PHP_LANGUAGE_ID;
    });
    associations.push('*.php');
    associations = associations.map((v, i, a) => {
        if (v.indexOf('/') < 0 && v.indexOf('\\') < 0) {
            return '**/' + v;
        }
        else {
            return v;
        }
    });
    return '{' + Array.from(new Set(associations)).join(',') + '}';
}
//# sourceMappingURL=extension.js.map