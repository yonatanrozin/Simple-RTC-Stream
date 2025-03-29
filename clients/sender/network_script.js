const mediaConstraints = {
    video: { 
        width: { ideal: 4096 }, // reduce ideal video resolution values to potentially improve performance 
        height: { ideal: 2160 },
        facingMode: "user" // "user" for front-facing camera or "environment" for rear camera
    }, 
    audio: { //uncomment to enable microphone stream. Watch out for feedback!!!
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
    } 
    //Audio stream may cause autoplay issues when received on a mobile browser.
    //experiment with setting these to true to potentially improve audio quality + prevent feedback
}

const useRTCForData = true; //set to true to transmit data over WebRTC instead of OSC

const dataFrequency = 60; //Number of data transmissions per second. Decrease as needed on weaker connections.

const data = {}; //data to be transmitted

async function startStreams(e) {
    document.querySelector("#start-streams").disabled = true;
    try {
        //uncomment streams as needed
        await startTouchStream();
        // await startOrientationStream();
        // await startMotionStream();
        await startMediaStream(mediaConstraints);
        // await startHandposeStream([0,4,8,12,16,20]); //pass handpose an array of keypoint numbers for the hand keypoints to send (see https://docs.ml5js.org/assets/handpose-keypoints-map.png)
        // await startGPS();

        await onStreamsStarted(); //don't remove
    } catch (e) {alert(e)}
}

function setDatapoint(label, value, decimals=3) {
    if (typeof value === "object") data[label] = value;
    else data[label] = Number(value.toFixed(decimals));
}

let stream;

async function startMediaStream(mediaConstraints) {
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    stream.getTracks().forEach(t => {console.log(t), peer.addTrack(t, stream)});
}

async function startHandposeStream(usedkeypoints=[0,4,8,12,16,20]) {
    
    if (!stream) { alert("Start a video stream first with startMediaStream()!"); return }
    const handPose = ml5.handPose({
        maxHands: 2,
        flipped: true, //use true on a front-facing camera
        runtime: "mediapipe",
        modelType: "lite",
    });
    await handPose.ready;

    // const video = document.createElement("video");
    const video = document.querySelector("video");

    video.srcObject = stream;
    video.width = 640;
    video.height = 480;

    function handPoseDetect() {
        handPose.detect(video, (hands) => {
            const handsData = [];
            hands.forEach(({keypoints, handedness}, i) => {
                const handData = {handedness};
                usedkeypoints.forEach(k => {
                    const {x, y, name} = keypoints[k];
                    handData[name] = {x,y};
                });
                handsData[i] = handData;

            });
            setDatapoint("hands", handsData);
        });
    }
    setInterval(handPoseDetect, 30);
}

async function startTouchStream() {

    function onXYTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const label = `touch_${e.target.id}`;
        const {width, height, x, y} = touch.target.getBoundingClientRect();
        setDatapoint(label, {
            x: Math.min(Math.max(0, touch.clientX - x), width),
            y: Math.min(Math.max(0, touch.clientY - y), height),
        });
    }
    function onXYRelease(e) {
        e.preventDefault();
        const label = `touch_${e.target.id}`;
        setDatapoint(label, {x: -1, y: -1});
    }

    function onPress(e) { 
        setDatapoint(`touch_${e.target.id}`, 1); 
    }
    function onRelease(e) { setDatapoint(`touch_${e.target.id}`, 0) }


    Array.from(document.querySelectorAll("#interface .xy-pad")).forEach(el => {
        if (!el.id) {alert("There is an xy-pad element with no id!"); return}
        el.addEventListener("touchstart", onXYTouch);
        el.addEventListener("touchmove", onXYTouch);
        el.addEventListener("touchend", onXYRelease)
    });

    Array.from(document.querySelectorAll("#interface button")).forEach(el => {
        if (!el.id) {alert("There is a button element with no id!"); return}
        el.addEventListener("touchstart", onPress);
        el.addEventListener("touchend", onRelease);

    });
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

const socket = io.connect();
const peerConfiguration = {
    iceServers: [ { urls: [ 'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302' ] } ]
}
// peerConfiguration.iceServers = []; //Uncomment this line on local networks with no internet access
const peer = new RTCPeerConnection(peerConfiguration);

// const channel = peer.createDataChannel("data");

peer.addEventListener("connectionstatechange", () => console.log(peer.connectionState));
peer.addEventListener("icecandidate", ({ candidate }) => {
    if (candidate) {
        console.log("Local ICE candidate fetched.");
        socket.emit("iceCandidate", candidate);
    }
});

socket.on("iceCandidate", async (ice) => {
    console.log("Remote ICE Candidate received.");
    await peer.addIceCandidate(ice);
});

socket.on("answer", async (answer) => {
    console.log("Answer received.");
    await peer.setRemoteDescription(new RTCSessionDescription(answer));
});

async function RTCConnect() {
    console.log("Sending offer.");
    // peer.restartIce();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(new RTCSessionDescription(offer));
    socket.emit("offer", offer);
    socket.on("answer", async (answer) => {
        console.log("Answer received.");
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
    });
}

async function onStreamsStarted() {
    await wakeLock(); 
    document.querySelector("#button-overlay")?.remove();
    await RTCConnect();
    // setInterval(() => channel.send(JSON.stringify(data)), 100/30); 
    setInterval(() => {
        socket.emit("data", data);
    }, 1000/dataFrequency);
}