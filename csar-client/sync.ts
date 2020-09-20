
import * as io from 'socket.io-client';
import { Observable, Subscriber } from 'rxjs';

/**
 * Implements WebRTC with the csar-server for signaling
 */
export class CSARSyncClient {
    public isSender = false;
    private socket: SocketIOClient.Socket;
    private configuration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
    private peerConnection = new RTCPeerConnection(this.configuration);
    private sendChannel = this.peerConnection.createDataChannel('sendDataChannel');
    private receiveChannel = this.peerConnection.createDataChannel('receiveChannel');
    private logingEnabled: boolean = false;

    private messageObserver!: Subscriber<string>;
    private messageObservable: Observable<string>;
    private closeObserver!: Subscriber<void>;
    private closeObservable: Observable<void>;
    private readyObserver!: Subscriber<void>;
    private readyObservable: Observable<void>;
    private channelObserver!: Subscriber<ChannelState>;
    private channelObservable: Observable<ChannelState>;


    constructor(url: string) {
        this.socket = io.connect(url);
        this.sendChannel.onopen = () => this.onSendChannelStateChange;
        this.sendChannel.onclose = () => this.onSendChannelStateChange;
        this.peerConnection.ondatachannel = (event: any) => this.receiveChannelCallback(event);

        //Signaling
        this.socket.on('registered', (id: string) => {
            this.log('joined', id);
            this.setup();
        });

        this.peerConnection.addEventListener('icecandidate', event => {
            if (event.candidate) {
                this.socket.emit('pair', { 'iceCandidate': event.candidate });
            }
        });

        // Listen for remote ICE candidates and add them to the local RTCPeerConnection
        this.socket.on('pair', async (message: Message) => {
            if (message.iceCandidate && this.peerConnection.remoteDescription) {
                this.log('pair ice', message);
                try {
                    await this.peerConnection.addIceCandidate(message.iceCandidate);
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            }
        });

        // Listen for connectionstatechange on the local RTCPeerConnection
        this.peerConnection.addEventListener('connectionstatechange', event => {
            this.log(event);
            if (this.peerConnection.connectionState === 'connected') {
                // Peers connected!
                this.log(this.peerConnection);
            }
        });

        // Observables
        this.messageObservable = new Observable(subscriber => {
            this.messageObserver = subscriber;
        });
        this.closeObservable = new Observable(subscriber => {
            this.closeObserver = subscriber;
        });
        this.readyObservable = new Observable(subscriber => {
            this.readyObserver = subscriber;
        });
        this.channelObservable = new Observable(subscriber => {
            this.channelObserver = subscriber;
        });
    }

    register(id: string) {
        this.setup();
        this.socket.emit('register', id);
    }

    randomId() {
        const uint32 = window.crypto.getRandomValues(new Uint32Array(1))[0];
        return uint32.toString(16);
    }

    //Setup WebRTC
    async setup() {
        this.socket.on('pair', (msg: Message) => this.setupCall(msg));

        //hack needed?
        const offer = await this.peerConnection.createOffer({ offerToReceiveAudio: true });
        await this.peerConnection.setLocalDescription(offer);
        this.socket.emit('pair', { 'offer': offer });
        this.socket.on('pair', (msg: Message) => this.setupRecieve(msg));
    }


    async setupCall(message: Message) {
        if (message.answer) {
            this.log('pair call', message);
            const remoteDesc = new RTCSessionDescription(message.answer);
            await this.peerConnection.setRemoteDescription(remoteDesc);
        }
    }

    async setupRecieve(message: Message) {
        this.log("receive", message, this.isSender);
        if (message.offer && !this.isSender) {
            this.log('pair recv', message);
            this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.socket.emit('pair', { 'answer': answer });
        }
    }

    sendData(data: string) {
        this.sendChannel.send(data);
        this.log('Sent Data: ' + data);
    }

    closeDataChannels() {
        this.log('Closing data channels');
        this.sendChannel.close();
        this.log('Closed data channel with label: ' + this.sendChannel.label);
        this.receiveChannel.close();
        this.log('Closed data channel with label: ' + this.receiveChannel.label);
        this.peerConnection.close();
        this.log('Closed peer connections');
        this.closeObserver.complete();
    }

    receiveChannelCallback(event: RTCDataChannelEvent) {
        this.log('Receive Channel Callback');
        this.receiveChannel = event.channel;
        this.receiveChannel.onmessage = (event: any) => this.onReceiveMessageCallback(event);
        this.receiveChannel.onopen = () => this.onReceiveChannelStateChange();
        this.receiveChannel.onclose = () => this.onReceiveChannelStateChange();

        //Ready?
        this.readyObserver.next();
    }

    //States TODO to observables?
    get connectionState() {
        return this.peerConnection?.connectionState;
    }

    get siganlingState() {
        return this.peerConnection.signalingState;
    }

    get iceConnectionState() {
        return this.peerConnection.iceConnectionState;
    }

    //Logging
    enableLogging() {
        this.logingEnabled = true;
    }

    disableLogging() {
        this.logingEnabled = false;
    }

    private log(...args: any[]) {
        if (this.logingEnabled) {
            console.log(...args);
        }
    }

    // Events
    private onReceiveMessageCallback(event: any) {
        this.messageObserver.next(event.data);
    }

    private onSendChannelStateChange() {
        const readyState = this.sendChannel.readyState;
        this.channelObserver.next({channel: 'send', readyState});
    }

    private onReceiveChannelStateChange() {
        const readyState = this.receiveChannel.readyState;
        this.channelObserver.next({channel: 'receive', readyState});
    }
    
    onMessage() {
        return this.messageObservable;
    }

    onClose() {
        return this.closeObservable;
    }

    onReady() {
        return this.readyObservable;
    }

    onChannelStateChange() {
        return this.channelObservable;
    }
}

export interface Message {
    answer?: any;
    offer?: any;
    iceCandidate?: any;
}

export interface ChannelState {
    channel: string;
    readyState: string;
}

