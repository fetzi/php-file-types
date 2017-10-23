'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class Namespace
{
    private composerFile: string;
    private namespaces: Array<Object> = new Array<Object>();
    private namespaceCache: object = {};

    constructor() {
        this.composerFile = vscode.workspace.rootPath + path.sep + 'composer.json';

        fs.watchFile(this.composerFile, () => {
            console.log('composer.json change detected');
            this.loadNamespaces();
        });

        this.loadNamespaces();
    }

    private loadNamespaces()
    {
        this.namespaces = new Array<Object>();
        this.namespaceCache = {};

        if (fs.existsSync(this.composerFile)) {
            let buffer: Buffer = fs.readFileSync(this.composerFile);
            let data = JSON.parse(buffer.toString());

            if (data.hasOwnProperty('autoload') && data.autoload.hasOwnProperty('psr-4')) {
                this.addNamespaces(data.autoload['psr-4']);
            }
            
            if (data.hasOwnProperty('autoload-dev') && data['autoload-dev'].hasOwnProperty('psr-4')) {
                this.addNamespaces(data['autoload-dev']['psr-4']);
            }
        }
    }

    public async getNamespace(filePath: string, type: string)
    {
        let relativePath = path.relative(vscode.workspace.rootPath, filePath);
        let folder = path.dirname(relativePath);

        let cachedNs = this.getFromCache(folder);

        if (cachedNs) {
            return cachedNs;
        }

        for (let candidate of this.namespaces) {
            if (folder.indexOf(candidate['folder']) > -1) {
                let namespace = candidate['namespace'] + folder.substring(folder.indexOf(candidate['folder']) + candidate['folder'].length)
                namespace = namespace.replace('/', '\\');
                this.addToCache(folder, namespace);

                return namespace;
            }
        }

        return await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: 'Please enter the ' + type + ' namespace',
            value: ''
        });
    }
    
    private addToCache(relativeFolder: string, namespace: string)
    {
        this.namespaceCache[relativeFolder] = namespace;
    }

    private getFromCache(relativeFolder: string)
    {
        if (this.namespaceCache.hasOwnProperty(relativeFolder)) {
            return this.namespaceCache[relativeFolder];
        }

        return null;
    }

    private addNamespaces(list)
    {
        for (let key in list) {
            this.namespaces.push({
                'folder': list[key],
                'namespace': key,
            });
        }
    }
}