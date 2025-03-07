const peerConfiguration = {
    iceServers: [ { urls: [ 'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302' ] } ]
}
// peerConfiguration.iceServers = []; //Uncomment this line on local networks with no internet access

const socket = io.connect();
const peer = new RTCPeerConnection(peerConfiguration);
peer.addEventListener("connectionstatechange", () => console.log(peer.connectionState));
peer.addEventListener("icecandidate", ({ candidate }) => {
    if (candidate) {
        console.log("Local ICE candidate fetched.");
        socket.emit("iceCandidate", candidate);
    }
});

peer.addEventListener("connectionstatechange", () => {
    if (peer.connectionState === "connected") {
        setInterval(() => channel.send(JSON.stringify(data)), 100/30); 
    }
});

socket.on("answer", async (answer) => {
    console.log("Answer received.");
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
});


async function RTCConnect() {
    console.log("Sending offer.");
    peer.restartIce();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(new RTCSessionDescription(offer));
    socket.emit("offer", offer);
    socket.on("answer", async (answer) => {
        console.log("Answer received.");
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
    });
}

const data = {};
const channel = peer.createDataChannel("data");
channel.addEventListener("message", ({data}) => alert(`new message: ${data}`));

function setDatapoint(label, value, decimals=3) {
    data[label] = Number(value.toFixed(decimals));
}

async function startMediaStream() {
    const constraints = {
        video: { 
            width: { ideal: 4096 }, // reduce ideal video resolution values to potentially improve performance 
            height: { ideal: 2160 },
            facingMode: "user" // "user" for front-facing camera or "environment" for rear camera
        }, 
        // audio: { 
        //     //Audio stream may cause autoplay issues when received on a mobile browser.
        //     //experiment with setting these to true to potentially improve audio quality + prevent feedback
        //     echoCancellation: false,
        //     noiseSuppression: false,
        //     autoGainControl: false
        // } 
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    stream.getTracks().forEach(t => peer.addTrack(t, stream));
}

async function startOrientationStream() {
    if (!window.DeviceOrientationEvent || !window.DeviceOrientationEvent.requestPermission) return;
    if (await window.DeviceOrientationEvent.requestPermission() !== "granted") return;
    
    window.addEventListener("deviceorientation", function({alpha, beta, gamma}) {
        try {
            setDatapoint("yaw", alpha);
            setDatapoint("pitch", beta);
            setDatapoint("roll", gamma);
        } catch (e) {}
    });
}

/*
Device motion stream
Device motion values are relative to the device's orientation, NOT absolute!
    Ex: d_y always represents vertical motion parallel to the orientation of the screen, not up and down relative to the ground
*/
async function startMotionStream() {
    if (!window.DeviceMotionEvent || !window.DeviceMotionEvent.requestPermission) return;
    if (await window.DeviceMotionEvent.requestPermission() !== "granted") return;
    
    window.addEventListener("devicemotion", function({rotationRate, acceleration}) {
        const {alpha, beta, gamma} = rotationRate;
        setDatapoint("d_pitch", alpha); 
        setDatapoint("d_roll", beta);
        setDatapoint("d_yaw", gamma);

        const {x, y, z} = acceleration;
        setDatapoint("d_x", x);
        setDatapoint("d_y", y);
        setDatapoint("d_z", z);
    });
}

//Geolocation seems to work only on safari on iOS
async function startGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(({coords}) => {
            const {latitude, longitude, altitude} = coords;
            setDatapoint("lat", latitude, 5);
            setDatapoint("lon", longitude, 5);
            setDatapoint("alt", altitude, 5);
        });
    }
}

async function wakeLock() {
    await navigator.wakeLock.request();
};

document.querySelector("button").addEventListener("click", async () => {
    try {
        //uncomment streams as needed
        await startMediaStream();
        // await startGPS();
        // await startOrientationStream();
        // await startMotionStream();

        await wakeLock(); 
        await RTCConnect();
        document.querySelector("button").remove();
    } catch (e) {alert(e)}
});
