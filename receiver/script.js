const isTD = new URLSearchParams(window.location.search).has("td");
if (isTD) document.title = "{}";

let peerConfiguration = {
    iceServers: [ 
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}

// uncomment this line on local networks with no internet access. It may result in lower quality streaming!
// peerConfiguration.iceServers = [];

const video = document.querySelector('video');

const socket = io.connect();

const stream = new MediaStream();
video.srcObject = stream;

let peer = new RTCPeerConnection(peerConfiguration);
peer.onsignalingstatechange = (e) => console.log(e.target.signalingState);
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

socket.on("offer", async (offer) => {
    console.log("Offer received.");
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    console.log("Sending answer.");
    socket.emit("answer", answer)
});

const RTCData = {};

peer.ontrack = async ({track}) => {
    stream.addTrack(track);
    await video.play();
    setInterval(() => {
        RTCData.videoWidth = video.videoWidth;
        RTCData.videoHeight = video.videoHeight;
    }, 100);
}

peer.ondatachannel = ({ channel }) => {
    channel.addEventListener("message", onChannelDataReceived);
};

function onChannelDataReceived({data}) {
    try {
        Object.assign(RTCData, JSON.parse(data));
        document.title = JSON.stringify(RTCData);
        console.log(RTCData);
    } catch {document.title = "{}";}
}