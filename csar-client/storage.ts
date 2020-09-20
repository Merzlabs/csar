import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CSARFile } from './file';

export interface CSARStorageDB extends DBSchema {
    files: {
        value: {
            name: string;
            content: string;
        };
        key: string;
    };
}

export class CSARStorageClient {
    db: IDBPDatabase<CSARStorageDB> | undefined;

    constructor(private dbName: string) {
        this.open(dbName);
    }

    private async initDB() {
        if (!this.db) {
            await this.open(this.dbName);
        }
    }

    private async open(dbName: string) {
        this.db = await openDB<CSARStorageDB>(dbName, 1, {
            upgrade(db) {
                db.createObjectStore('files', {
                    keyPath: 'hash',
                });
            },
        });
    }

    /**
   * Check if file exists and add if not.
   * @return true if file has been added to db and is not duplicate
   */
    public async store(file: CSARFile): Promise<boolean> {
        await this.initDB();

        try {
            const key = await this.digest(file.content);

            const exists = await this.getByKey(key);
            if (!exists) {
                await this.db?.put('files', file, key);
                return true;
            }
        } catch (e) {
            console.error('Error storing', file, e);
        }

        return false;
    }

    async load() {
        await this.initDB();
        
        try {
            const all = await this.db?.getAll('files') as CSARFile[];
            return all;
        } catch (e) {
            console.error('Load error', e);
        }
    }

    public async getByKey(key: string) {
        await this.initDB();
        return this.db?.get('files', key);
    }

    public async clear() {
        await this.initDB();
        this.db?.clear('files');
    }

    /**
   * Hash data
   * See https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
   */
    private async digest(message: string) {
        const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
        const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
        return hashHex;
    }
}