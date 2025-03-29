import express from "express";
import { Server } from "socket.io";
import https from "https";
import http from "http";
import { createCA, createCert } from "mkcert";
import os from "os";
import { Client, Bundle } from "node-osc";
const {argv, exit} = process;

const PORT = Number(argv[2]);

if (!PORT) {
    console.log("Run 'node index <PORT> and specify a port number.'");
    exit();
}

const ip = os.networkInterfaces()['Wi-Fi'].find(i => i.family === "IPv4").address;

const ca = await createCA({
    organization: "Your name here", //feel free to change these settings, but they don't affect anything
    countryCode: "US",
    state: "New York",
    locality: "New York",
    validity: 365 //certificate valid for 365 days (but gets re-created whenever this file is executed)
});

const cert = await createCert({
    ca: { key: ca.key, cert: ca.cert },
    domains: ["127.0.0.1", "localhost"],
    validity: 365
});

const app = express();

app.use(express.static("./clients"));

const httpsServer = https.createServer({ cert: cert.cert, key: cert.key }, app);
const httpServer = http.createServer(app);

const OSC = new Client("192.168.1.130", 10000); //use ip address 127.0.0.1 to send to software on this same device

function getOscAddresses(obj, prefix="") {
    const result = [];
    for (const key in obj) {
      const value = obj[key];
      const currentAddress = `${prefix}/${key}`;
      if (typeof value === "object" && value !== null) {
        result.push(...getOscAddresses(value, currentAddress));
      } else {
        result.push([currentAddress, value]);
      }
    }
    return result;
}

const io = new Server({
    cors: {
        origin: ["http://localhost*", "https://localhost*"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.attach(httpServer);
io.attach(httpsServer);

io.on("connection", (ws) => {
    ws.on("offer", offer => {
        ws.broadcast.emit("offer", offer);
    });
    ws.on("answer", answer => {
        ws.broadcast.emit("answer", answer);
    });
    ws.on('iceCandidate', ice => {
        ws.broadcast.emit("iceCandidate", ice);
    });
    ws.on("data", (data) => {
        const oscValues = getOscAddresses(data);
        // console.log(data);
        OSC.send(new Bundle(...oscValues));
    });
});

httpServer.listen(PORT+1);
httpsServer.listen(PORT, () => {
    console.log(`\nOpen browser-based receiver client hosted at https://${ip}/receiver`);
    console.log(`or use TouchDesigner-based receiver at TD/RTC_in.toe`);
    console.log(`or use Max-based receiver at Max/RTC_in.maxpat.`);
    console.log(`\nTHEN, open sender client hosted at https://${ip}/sender.`);
    console.log(`\n***Be sure to include 'https' in any URLs, NOT http!!!***`);
    console.log(`If either sender or receiver device is hosting this server, use ip address 127.0.0.1 in the URL instead.`);
    console.log("It's safe to ignore any browser security warnings.");
});