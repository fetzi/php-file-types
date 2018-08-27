'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class Namespace
{
    private namespaces: object = {};
    private resolvedComposerFiles: object = {};

    public async getNamespace(filePath: string, type: string)
    {
        let composerFile = this.resolveComposerFileForPath(filePath);

        if (!composerFile) {
            composerFile = this.findClosestComposerFile(filePath);

            if (composerFile) {
                this.registerComposerFile(composerFile);
            }
        }

        if (composerFile) {
            let composerConfig = this.namespaces[composerFile];

            let relativePath = path.relative(composerConfig.basePath, filePath);
            let folder = path.dirname(relativePath);

            for (let candidate of composerConfig.namespaces) {
                if (folder.startsWith(candidate['folder'])) {
                    let subNamespace = this.getSubNamespace(folder, candidate['folder']);
                    let namespace = candidate['namespace'] + subNamespace;
                    namespace = namespace.replace(/[\\\/]/g, '\\');

                    if (namespace.endsWith('\\')) {
                        namespace = namespace.substring(0, namespace.length -1);
                    }

                    return namespace;
                }
            }
        }

        return await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: 'Please enter the ' + type + ' namespace',
            value: ''
        });
    }

    private getSubNamespace(relativeFolder: string, namespaceFolder: string)
    {
        let subNamespace: string = relativeFolder.substring(relativeFolder.indexOf(namespaceFolder) + namespaceFolder.length);

        if (subNamespace.startsWith('/')) {
            subNamespace = subNamespace.substring(1);
        }

        return subNamespace;
    }

    private findClosestComposerFile(filePath: string)
    {
        let folders = filePath.split('/');
        folders.pop();

        let currentFolder = folders.join('/');

        if (!currentFolder) {
            return;
        }

        let composerCandidate = currentFolder + '/composer.json';

        if (fs.existsSync(composerCandidate)) {
            return composerCandidate;
        }

        return this.findClosestComposerFile(currentFolder);
    }

    private resolveComposerFileForPath(filePath: string)
    {
        for (let key in this.resolvedComposerFiles) {
            if (filePath.startsWith(key)) {
                return this.resolvedComposerFiles[key];
            }
        }
    }

    private registerComposerFile(composerFile: string)
    {
        this.resolvedComposerFiles[path.dirname(composerFile)] = composerFile;

        fs.watchFile(composerFile, () => {
            this.indexComposerFile(composerFile);
        });

        this.indexComposerFile(composerFile);
    }

    private indexComposerFile(composerFile: string)
    {
        let buffer: Buffer = fs.readFileSync(composerFile);
        let data = JSON.parse(buffer.toString());
        let namespaces = [];

        if (data.hasOwnProperty('autoload') && data.autoload.hasOwnProperty('psr-4')) {
            namespaces.push(...this.getNamespaces(data.autoload['psr-4']));
        }

        if (data.hasOwnProperty('autoload-dev') && data['autoload-dev'].hasOwnProperty('psr-4')) {
            namespaces.push(...this.getNamespaces(data['autoload-dev']['psr-4']));
        }

        this.namespaces[composerFile] = {
            basePath: path.dirname(composerFile),
            namespaces: namespaces
        };
    }

    private getNamespaces(list)
    {
        let namespaces = [];

        for (let key in list) {
            namespaces.push({
                'folder': list[key],
                'namespace': key,
            });
        }

        return namespaces;
    }
}