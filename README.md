# Simple-RTC-Stream
A bare-minimum example of streaming data between 2 devices over WebRTC. This example is geared towards using a mobile device as a hand-held controller or embedded sensor, but it can be adapted for many other uses.

## About

This repo provides a relatively simple bare-minimum setup for streaming a video, audio and text channel between 2 devices over WebRTC. WebRTC is currently the only UDP-based protocol accessible from a web browser, making this the fastest option for multimedia streaming available on a mobile device without custom app development.

__This repo is in very early development and is subject to frequent updates and changes.__

## Software Dependencies
- Node.js & NPM
- TouchDesigner (optional)

## Hardware Dependencies
- Sender & receiver devices with web browsers (currently tested with Chrome on Windows 11, Chrome & Safari on iOS)
    - Any device with a compatible web browser will work. Individual features and performance will depend on device hardware capabilities and browser compatibility
    - Limit 1 each of sender + receiver
- Server device with Node.js installed. 
    - If either the sender or receiver device is a computer, you can use it as the server device as well. This is recommended.
- Local Area Network (WiFi or Ethernet)
    - Internet access not required, but may result in higher quality streams.

## Server Device Installation
- ```git clone``` this repo into a desired folder, or download the .zip file
- In command line, from repo folder:
    - ```npm install```

## Run
- Ensure all devices (server, sender, receiver) are connected to the same WiFI/ethernet network
- Launch server
- Open receiver page
- Open sender page

See below for detailed instructions:

### Server Device
- In server device command line, from repo folder:
    - ```node index.js``` - several URLs containing the server's local IP address will be printed to the console for use in the following steps:

### Receiver Device

Open the receiver device BEFORE connecting the sender!

#### Browser-based receiver

- Open ```https://<server.ip.address>/receiver``` on receiver device FIRST
    - If the receiver device is also hosting this server, use ```https://127.0.0.1/receiver``` instead.

#### TouchDesigner receiver
- Open ```RTC_in.toe``` in TouchDesigner
    - TD will use localhost for the Web Render by default. If the server is hosted on a different device, replace "localhost" with the server IP address in the ```webrender1``` "URL or File" parameter inside the ```RTCWrapper``` COMP

### Sender Device

- Open ```https://<server.ip.address>/sender``` on the sender device. 
    - If the sender device is also hosting this server, use ```https://127.0.0.1/sender``` instead.
    - Tap anywhere on screen to enable the streams. Be sure to grant any camera, microphone or sensor permissions when requested.
 
### Note
Server uses self-signed certificates to serve interfaces over https, which is required for camera, microphone and sensor access. This will cause most browsers to display certificate security warnings when attempting to open the sender or receiver pages for the first time after launching the server. These warnings can be ignored, since our own server is generating the certificates. Steps to proceed differ between browsers, but the process is usually similar to:
- View "advanced" or "more details"
- Select "accept risk" or "continue to website"

## Sender/Receiver Configuration

### Disable internet dependency (currently untested!)
- In both the sender and receiver scripts, you may uncomment ```peerConfiguration.iceServers = []``` to allow this entire network to run on a private LAN with no internet access. This may result in lower quality streams, so test carefully before using.

### Media stream options
In ```sender/script.js```:
- Inside ```document.querySelector("button").addEventListener("click" ...```
    - Comment/uncomment ```await startMediaStream()``` to enable or disable the media stream
- Inside ```function startMediaStream()```:
    - Comment/uncomment audio and video objects inside ```constraints``` to enable/disable audio and video streams as desired.
        - If you want to disable BOTH video and audio streams, you should comment out ```await startMediaStream()``` instead.
    - Width and height ideal values are set to grab the highest possible resolution video from the video source. Set them to lower values if needed, which may improve performance or reduce LAN bandwith usage. You can also set a custom resolution, but the media source is not guaranteed to follow it
    - Set ```facingMode: "environment"``` to use rear camera on mobile device. Default value "user" will use the front-facing webcam.
    - Experiment with the audio constraint settings ```echoCancellation```, ```noiseSuppression``` and ```autoGainControl```
        - Setting these to true or false may improve audio quality and prevent feedback.
     
Be aware of potential feedback if playing an audio stream through a speaker!

Receiving an audio stream on a mobile device may cause autoplay issues. You may have to mute the video by default with ```video.muted = true``` and then unmute manually AFTER receiving the video stream with ```video.muted = true```. This solution hasn't been tested yet.
     
### Data source options
- Inside ```document.querySelector("button").addEventListener("click" ...```
    - Comment/uncomment start stream functions to enable or disable data sources as needed.
- To increase or decrease float precision of a datapoint, adjust the 3rd argument to the corresponding call to ```setDatapoint(label, value, decimalPlaces)```
    - default is 3 decimal places, set to 0 for int precision

#### Adding more data sources
To add additional data sources, such as from external APIs or interactive HTML elements (buttons, sliders, etc):
- Call ```setDatapoint(label, value, decimalPlaces)``` from anywhere in the script, i.e. an event listener callback, HTTP response, etc.
- It's up to you to handle these additional data sources as needed.
    
## Notes
- Refreshing and re-connecting the sender after connecting to the receiver will cause the receiver to crash. (fix hopefully coming soon)
    - If you need to refresh the sender, refresh the receiver before reconnecting the sender.
        - On a TouchDesigner receiver, use the "reload source" button of ```webrender1``` inside the ```RTCWrapper``` COMP.
- It's strongly recommended to enable your device's orientation lock, especially if using the gyroscope
