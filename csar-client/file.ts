declare var window: any;

export class CSARFile {
    constructor(public name: string, public content: string) {} 
}

/**
 * Implements the Native File System API.
 */
export class CSARFileClient {

    static async openDirectory() {
        const handle = await window.showDirectoryPicker();
        this.verifyPermission(handle);
        const files: File[] = [];
        for await (const entry of handle.values()) {
          const file = await entry.getFile();
          files.push(file);
        }
        return files;
      }
    
      static async exportToFiles(all: CSARFile[]) {
        const directoryHandle = await window.showDirectoryPicker();
        this.verifyPermission(directoryHandle, true);
    
        for (const file of all) {
          const fileHandle = await directoryHandle.getFile(file.name, {create: true});
          const writable = await fileHandle.createWritable();
          // Write the contents of the file to the stream.
          await writable.write(file.content);
          // Close the file and write the contents to disk.
          await writable.close();
        }
      }
    
      static async verifyPermission(fileHandle: any, withWrite = false) {
        const opts: any = {};
        if (withWrite) {
          opts.writable = true;
        }
        // Check if permission was already granted. If so, return true.
        if (await fileHandle.queryPermission(opts) === 'granted') {
          return true;
        }
        // Request permission. If the user grants permission, return true.
        if (await fileHandle.requestPermission(opts) === 'granted') {
          return true;
        }
        // The user didn't grant permission, so return false.
        return false;
      }
}