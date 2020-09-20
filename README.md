# **C**lient**S**ide **A**pplication **R**eplication

A new stack to build apps without a tradtional backend for improved privacy

## Components

* csar-server - Signaling Server
* csar-client - Client side Typescript library
  * CSARSyncClient - WebRTC client **(basics implemented)**
  * CSARFileClient [Native File System API](https://wicg.github.io/native-file-system/) **(basics implemented)**
  * CSARStorageClient - IndexedDB Storage **(basics implemented)**
  * CSARWorker - [Web Background Synchronization](https://wicg.github.io/background-sync/spec/) **(planned)**