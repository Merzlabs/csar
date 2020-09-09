document.getElementById("username").value = "Private Key";

async function create() {
    const result = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256"
          },
          true,
          ["encrypt", "decrypt"]
    )

    console.debug(result);

    crypto.subtle.exportKey("pkcs8", result.privateKey).then((res) => display(document.getElementById("private"), "PRIVATE", res), err => console.error(err));
    crypto.subtle.exportKey("spki", result.publicKey).then((res) => display(document.getElementById("public"), "PUBLIC", res), err => console.error(err))
}

function convertBuffer(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function display(element, type, key) {
    const exportedAsString = convertBuffer(key);
    const exportedAsBase64 = window.btoa(exportedAsString);
    const pemExported = `-----BEGIN ${type} KEY-----\n${exportedAsBase64}\n-----END ${type} KEY-----`;
    element.textContent = pemExported;
}

function load() {
    document.getElementById("formfield").focus();
}
  