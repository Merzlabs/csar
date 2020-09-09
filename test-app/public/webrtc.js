"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var csar_client_1 = require("@merzlabs/csar-client");
var client = new csar_client_1.CSARClient("https://connect.pecuniator.com");
function register() {
    var idField = document.getElementById('sessionId');
    var id = idField.value;
    if (!id) {
        id = client.randomId();
        idField.value = id;
        client.isSender = false;
    }
    client.register(id);
    client.onMessage().subscribe(function (data) { return console.debug('Subscription', data); });
}
function sendBtn() {
    var dataField = document.getElementById('data');
    var data = dataField.value;
    client.sendData(data);
}