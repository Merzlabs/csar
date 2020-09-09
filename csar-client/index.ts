
import * as io from 'socket.io-client';
import { fromEvent, Observable, Subscriber } from 'rxjs';

export class CSARClient {
    public isSender = false;
    private socket: SocketIOClient.Socket;
    private configuration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
    private peerConnection = new RTCPeerConnection(this.configuration);
    private sendChannel = this.peerConnection.createDataChannel('sendDataChannel');
    private receiveChannel = this.peerConnection.createDataChannel('receiveChannel');

    private messageObserver!: Subscriber<string>;
    private messageObservable: Observable<string>;
    private closeObserver!: Subscriber<void>;
    private closeObservable: Observable<void>;
    private readyObserver!: Subscriber<void>;
    private readyObservable: Observable<void>;


    constructor(url: string) {
        this.socket = io.connect(url);
        this.sendChannel.onopen = () => this.onSendChannelStateChange;
        this.sendChannel.onclose = () => this.onSendChannelStateChange;
        this.peerConnection.ondatachannel = (event: any) => this.receiveChannelCallback(event);

        //Signaling
        this.socket.on('registered', (id: string) => {
            console.debug('joined', id);
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
                console.debug('pair ice', message);
                try {
                    await this.peerConnection.addIceCandidate(message.iceCandidate);
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            }
        });

        // Listen for connectionstatechange on the local RTCPeerConnection
        this.peerConnection.addEventListener('connectionstatechange', event => {
            console.debug(event);
            if (this.peerConnection.connectionState === 'connected') {
                // Peers connected!
                console.debug(this.peerConnection);
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
            console.debug('pair call', message);
            const remoteDesc = new RTCSessionDescription(message.answer);
            await this.peerConnection.setRemoteDescription(remoteDesc);
        }
    }

    async setupRecieve(message: Message) {
        console.debug("r", message, this.isSender);
        if (message.offer && !this.isSender) {
            console.debug('pair recv', message);
            this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.socket.emit('pair', { 'answer': answer });
        }
    }



    sendData(data: string) {
        this.sendChannel.send(data);
        console.debug('Sent Data: ' + data);
    }

    closeDataChannels() {
        console.debug('Closing data channels');
        this.sendChannel.close();
        console.debug('Closed data channel with label: ' + this.sendChannel.label);
        this.receiveChannel.close();
        console.debug('Closed data channel with label: ' + this.receiveChannel.label);
        this.peerConnection.close();
        console.debug('Closed peer connections');
        this.closeObserver.complete();
    }

    receiveChannelCallback(event: RTCDataChannelEvent) {
        console.debug('Receive Channel Callback');
        this.receiveChannel = event.channel;
        this.receiveChannel.onmessage = (event: any) => this.onReceiveMessageCallback(event);
        this.receiveChannel.onopen = () => this.onReceiveChannelStateChange();
        this.receiveChannel.onclose = () => this.onReceiveChannelStateChange();

        //Ready?
        this.readyObserver.next();
    }

    private onReceiveMessageCallback(event: any) {
        console.debug('Received Message', event.data);
        this.messageObserver.next(event.data);
    }

    private onSendChannelStateChange() {
        const readyState = this.sendChannel.readyState;
        console.debug('Send channel state is: ' + readyState);
    }

    private onReceiveChannelStateChange() {
        const readyState = this.receiveChannel.readyState;
        console.debug(`Receive channel state is: ${readyState}`);
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
}

export class Message {
    answer?: any;
    offer?: any;
    iceCandidate?: any;
}

