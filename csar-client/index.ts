
import * as io from 'socket.io-client';
import { fromEvent } from 'rxjs';

export class CSARClient {
    public isSender = false;
    private socket: SocketIOClient.Socket;
    private configuration = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] }
    private peerConnection = new RTCPeerConnection(this.configuration);
    private sendChannel = this.peerConnection.createDataChannel('sendDataChannel');
    private receiveChannel = this.peerConnection.createDataChannel('receiveChannel');

    constructor(url: string) {
        this.socket = io.connect(url);
        this.sendChannel.onopen = () => this.onSendChannelStateChange;
        this.sendChannel.onclose = ()=> this.onSendChannelStateChange;
        this.peerConnection.ondatachannel = (event: any) => this.receiveChannelCallback(event);

        //Signaling
        this.socket.on('registered', (id: string) => {
            console.log('joined', id);
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
                console.log('pair ice', message);
                try {
                    await this.peerConnection.addIceCandidate(message.iceCandidate);
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            }
        });

        // Listen for connectionstatechange on the local RTCPeerConnection
        this.peerConnection.addEventListener('connectionstatechange', event => {
            console.log(event);
            if (this.peerConnection.connectionState === 'connected') {
                // Peers connected!
                console.log(this.peerConnection);
            }
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
        if (message.answer && this.peerConnection.signalingState !== "have-local-offer") {
            console.debug('pair call', message);
            this.socket.removeListener('pair');
            const remoteDesc = new RTCSessionDescription(message.answer);
            await this.peerConnection.setRemoteDescription(remoteDesc);
        }
    }

    async setupRecieve(message: Message) {
        console.debug("r", message, this.isSender);
        if (message.offer && !this.isSender) {
            console.debug('pair recv', message);
            this.socket.removeListener('pair');
            this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.socket.emit('pair', { 'answer': answer });
        }
    }



    sendData(data: string) {
        this.sendChannel.send(data);
        console.log('Sent Data: ' + data);
    }

    closeDataChannels() {
        console.log('Closing data channels');
        this.sendChannel.close();
        console.log('Closed data channel with label: ' + this.sendChannel.label);
        this.receiveChannel.close();
        console.log('Closed data channel with label: ' + this.receiveChannel.label);
        this.peerConnection.close();
        console.log('Closed peer connections');
    }

    receiveChannelCallback(event: RTCDataChannelEvent) {
        console.log('Receive Channel Callback');
        this.receiveChannel = event.channel;
        this.receiveChannel.onmessage = (event: any) => this.onReceiveMessageCallback(event);
        this.receiveChannel.onopen = () => this.onReceiveChannelStateChange();
        this.receiveChannel.onclose = () => this.onReceiveChannelStateChange();
    }

    private onReceiveMessageCallback(event: any) {
        console.log('Received Message', event.data);
    }

    private onSendChannelStateChange() {
        const readyState = this.sendChannel.readyState;
        console.log('Send channel state is: ' + readyState);
    }

    private onReceiveChannelStateChange() {
        const readyState = this.receiveChannel.readyState;
        console.log(`Receive channel state is: ${readyState}`);
    }

    onMessage() {
        return fromEvent(this.receiveChannel, 'onmessage');
    }
}

export class Message {
    answer?: any;
    offer?: any;
    iceCandidate?: any;
}

