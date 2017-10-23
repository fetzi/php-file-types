'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Namespace }from './namespace';

let ns = new Namespace();

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('"php-file-types" is now active!');

    context.subscriptions.push(vscode.commands.registerCommand('phpfiletypes.createFile', createFile));
    context.subscriptions.push(vscode.commands.registerCommand('phpfiletypes.createClass', createClass));
    context.subscriptions.push(vscode.commands.registerCommand('phpfiletypes.createInterface', createInterface));
    context.subscriptions.push(vscode.commands.registerCommand('phpfiletypes.createTrait', createTrait));
}

function createFile(args) {
    promptForFilename(args, 'file');
}

function createClass(args) {
    promptForFilename(args, 'class');
}

function createInterface(args) {
    promptForFilename(args, 'interface');
}

function createTrait(args) {
    promptForFilename(args, 'trait');
}

function promptForFilename(args, type: string) {
    let currentPath: string = vscode.workspace.rootPath;

    if (args && args._fsPath) {
        currentPath = args._fsPath;
    }

    if (!fs.lstatSync(currentPath).isDirectory()) {
        currentPath = path.dirname(currentPath);
    }

    currentPath += path.sep;

    vscode.window.showInputBox({
        ignoreFocusOut: true,
        prompt: 'Please enter the PHP ' + type + ' name',
        value: currentPath,
        valueSelection: [currentPath.length, currentPath.length]
    }).then((filePath) => {
        if (!filePath) {
            return;
        }

        if (!filePath.endsWith('.php')) {
            filePath += '.php';
        }

        if (fs.existsSync(filePath)) {
            vscode.window.showErrorMessage('The file "' + path.basename(filePath) + '" already exists');
        }

        path.dirname(filePath).split(path.sep).reduce((currentPath, folder) => {
            currentPath += folder + path.sep;
            if (!fs.existsSync(currentPath)){
                fs.mkdirSync(currentPath);
            }

            return currentPath;
        }, '');

        if (type !== 'file') {
            let name = path.basename(filePath).replace('.php', '');

            ns.getNamespace(filePath, type).then((namespace) => {
                createFileByType(type, filePath, namespace, name);
            });
        } else {
            createFileByType(type, filePath);
        }
    });
}

function createFileByType(type: string, filePath: string, namespace?: string, name?: string) {

    let templateFile = type === 'file' ? 'file.tmpl' : 'type.tmpl';
    let templateFilePath = vscode.extensions.getExtension('fetzi.php-file-types').extensionPath + path.sep + 'templates' + path.sep + templateFile;

    vscode.workspace.openTextDocument(templateFilePath).then((doc: vscode.TextDocument) => {
        let template = doc.getText();

        template = template.replace('${type}', type);
        template = template.replace('${namespace}', namespace);
        template = template.replace('${name}', name);

        let cursor = findCursor(template);
        template = template.replace('${cursor}', '');

        fs.writeFileSync(filePath, template);

        vscode.workspace.openTextDocument(filePath).then((doc: vscode.TextDocument) => {
            vscode.window.showTextDocument(doc).then((editor) => {
                editor.selection = new vscode.Selection(cursor, cursor);
            });
        });
    });
}

function findCursor(template: string) {
    let beforeCursor = template.substring(0, template.indexOf('${cursor}'));

    let line = beforeCursor.match(/\n/g).length;
    let char = beforeCursor.substr(beforeCursor.lastIndexOf('\n')).length;

    return new vscode.Position(line, char);
}

// this method is called when your extension is deactivated
export function deactivate() {
}