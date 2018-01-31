const websocket = new WebSocket("ws://10.24.120.224:3000?serialnumber=user1")
const localView = document.getElementById('localView');
const remoteView = document.getElementById('remoteView');
let pc;
const configuration = {
    //iceServers: [{ urls: 'stun:stun.l.google.com:19302'}]
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        },
        {
            urls: 'turn:10.24.120.224:3478',
            username: 'topher',
            credential: '123456'
        }
    ]
};

websocket.onopen = () => {
    console.log("Connected to the signaling server")
    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
    })
    .then(mediaStream => {
        localView.srcObject = mediaStream;
        //pc.addStream(mediaStream)

        localView.onloadedmetadata = (data) => {
            localView.play()
        }
    })
}

websocket.onclose = (err) => {
    console.log(err);
}

websocket.onerror = (err) => {
    console.log(err);
}

websocket.onmessage = (message) => {
    console.log(message.data);
    if (!pc) {
        start(false)
    }

    let signal = JSON.parse(message.data)
    if (signal.sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
    }
    else {
        pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
    }
}


function sendMessage(message) {
    console.log(`Sending the message : ${message}`)
    websocket.send(message.data)
}


function start(isCaller) {
    pc = new RTCPeerConnection(configuration)

    pc.onicecandidate = evt => {
        sendMessage(JSON.stringify({ to: 'user2', message: { candidate: evt.candidate } }))
    }

    pc.ontrack = evt => {
        remoteView.srcObject = evt.stream;
    };

    navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
    })
    .then(mediaStream => {
        localView.srcObject = mediaStream;
        pc.addStream(mediaStream)

        localView.onloadedmetadata = (data) => {
            localView.play()
        }

        if (isCaller === true) {
            pc.createOffer(gotDescription)
        }
        else {
            pc.createAnswer()
                .then(answer => pc.setLocalDescription(answer))
                .then(() => {
                    sendMessage(JSON.stringify({ to: 'user2', message: { sdp: answer } }))
                })
                .catch(error => { console.log(error) })
        }
    })
    .catch(err => {
        console.log(err.name + " " + err.message)
    })
}

