let signalingServer;
let peerConnection = null;

const localView = document.getElementById('localView');
const remoteView = document.getElementById('remoteView');
const callButton = document.getElementById('call');

const mediaConstraints = {
    audio : true,
    video : true
}

const configuration = {
    //iceServers: [{ urls: 'stun:stun.l.google.com:19302'}]
    iceServers: [
        {
            urls: 'turn:10.24.120.224:3478',
            username: 'topher',
            credential: '123456'
        }
    ]
};


    signalingServer = new WebSocket('ws://10.24.120.224:3000?serialnumber=user2')

    signalingServer.onopen = () => {
        console.log('>>> Connected to the signaling server')
    }

    signalingServer.onmessage = message => {
        console.log(`>>> Message recieved: ${message.data}`)   
        let msg = JSON.parse(message.data)

        switch(msg.type){
            case 'offer':
                handleOffer(msg)
                break;

            case 'answer' : 
                handleAnswer(msg);
                break;

            case 'ice-candidate':
                handleIceCandidate(msg)
                break;

            case 'drop-call' :
                handleDropCall(msg)
                break;
        }
    }



// ===============
// Signaling handlers
// ===============

function handleOffer(msg){
    
    initRTCPeerConnection()

    let decscription = new RTCSessionDescription(msg.sdp)

    peerConnection.setRemoteDescription(decscription).then(() => {
        return navigator.mediaDevices.getUserMedia(mediaConstraints)
    })
    .then(mediaStream => {
        localView.srcObject = mediaStream;
        return peerConnection.addStream(mediaStream)
    })
    .then(() => {
        return peerConnection.createAnswer();
    })
    .then(answer => {
        return peerConnection.setLocalDescription(answer)
    })
    .then(() => {
        sendToSignalingServer({
            to : 'user2',
            type : 'answer',
            message : {
                sdp : peerConnection.localDescription
            }
        });
    })
    .catch(handleMediaDevicesError);
}

function handleAnswer(msg){
    
}

function handleIceCandidate(msg){
    let candidate = new RTCIceCandidate(msg.candidate)

    peerConnection.addIceCandidate(candidate)
}

function handleDropCall(msg){
    
}

function sendToSignalingServer(message){
    signalingServer.send(JSON.stringify(message))
}

// =========================
// Initiate Peer Connection
// =========================

function initRTCPeerConnection() {
    console.log(">>> Initializing peer connection...")

    peerConnection = new RTCPeerConnection(configuration)

    peerConnection.onicecandidate = handleICECandidateEvent;
    peerConnection.onremovestream = handleRemoveStreamEvent;
    peerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
    peerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    peerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
    peerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
    peerConnection.ontrack = handleTrackEvent;

}

// =========================
// Peer Connection event handlers
// =========================

function handleICECandidateEvent(evt){
    if(evt.candidate){
        sendToSignalingServer({
            to : 'user2',
            type : 'ice-candidate',
            message : {
                candidate : evt.candidate
            }
        });
    }
}

function handleTrackEvent(evt){
    remoteView.srcObject = evt.stream
}

function handleRemoveStreamEvent(){
    closePeerConnection()
}

function handleICEConnectionStateChangeEvent(){}

function handleICEGatheringStateChangeEvent(){}

function handleSignalingStateChangeEvent(){}

function handleNegotiationNeededEvent(){
    peerConnection.createOffer().then(offer => {
        return peerConnection.setLocalDescription(offer)
    })
    .then(() => {
        sendToSignalingServer({
            to : 'user2',
            type : 'offer',
            message : {
                sdp : peerConnection.localDescription
            }
        })
    })
}



// ===========================
// Button event listener
// ===========================

callButton.addEventListener('click', evt => {
    console.log('>>> Calling another user')

    initRTCPeerConnection()

    console.log('>>> Opening webcam and microphone')

    navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then(mediaStream => {
        localView.srcObject = mediaStream
        peerConnection.addStream(mediaStream)
    })
    .catch(handleMediaDevicesError)
})


function handleMediaDevicesError(err){
    switch(err.name) {
        case 'NotFoundError':
            console.log('>>> No camera found in the device, please install one')
            break;

        default:
            console.log('>>> Error accessing the cammera')
            break;
    }
}

function closePeerConnection(){
    remoteView.srcObject = null;
    localView.srcObject = null;

    peerConnection.close()
    peerConnection = null;
}