import express from "express";
import { Server } from "socket.io";
import { createServer } from "https";
import { createCA, createCert } from "mkcert";
import os from "os";

var ip = os.networkInterfaces()['Wi-Fi'].find(i => i.family === "IPv4").address;

const ca = await createCA({
  organization: "Yonatan Rozin", //feel free to change this, but it doesn't affect anything
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
app.use("/sender", express.static("sender"));
app.use("/receiver", express.static("receiver"));

const server = createServer({cert: cert.cert, key: cert.key}, app);
const io = new Server(server);
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
});

server.listen(443, () => console.log(
  `Open receiver client hosted at https://${ip}/receiver,
  THEN open sender client hosted at https://${ip}/sender.
  If accessing data stream through a TouchDesigner Web Render, use https://${ip}/receiver?td.
  If either sender or receiver device is hosting this server, use ip address 127.0.0.1 in the URL instead.`
));