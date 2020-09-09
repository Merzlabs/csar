import { CSARClient } from "@merzlabs/csar-client";

var client: CSARClient;

export function register() {
    client = new CSARClient("https://connect.pecuniator.com");
    const idField = document.getElementById('sessionId') as HTMLInputElement;

    let id = idField.value;
    if (!id) {
        id = client.randomId();
        idField.value = id;
        client.isSender = true;
    }
    client.register(id);

    client.onMessage().subscribe((data) => console.log('Subscription', data));
}

export function send() {
    const dataField = document.getElementById('data') as HTMLInputElement;
    const data = dataField.value;
    client.sendData(data);
}

window.addEventListener('load', (event) => {
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.onclick = register
    };

    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.onclick = send
    };
});