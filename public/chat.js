let socket = io.connect("http://localhost:4000");
let divVideoChatLobby = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat-room");
let joinButton = document.getElementById("join");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");
let roomInput = document.getElementById("roomName");
let roomName;
let creator = false;
let rtcPeerConnection;
let userStream;

// Contains the stun server URL we will be using.
let iceServers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

joinButton.addEventListener("click", function () {
  if (roomInput.value == "") {
    alert("Please enter a room name");
  } else {
    roomName = roomInput.value;
    socket.emit("join", roomName);
  }
});

// Triggered when a room is succesfully created.

socket.on("created", function () {
  creator = true;

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      //video: { width: 1280, height: 720 },
      video: true,
    })
    .then(function (stream) {
      /* use the stream */
      userStream = stream;
      divVideoChatLobby.style = "display:none";
      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
    })
    .catch(function (err) {
      /* handle the error */
      alert("Couldn't Access User Media");
    });
});

// Triggered when a room is succesfully joined.

socket.on("joined", function () {
  console.log('## socket.on("joined"');
  creator = false;

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      //video: { width: 1280, height: 720 },
      video: true,
    })
    .then(function (stream) {
      /* use the stream */
      userStream = stream;
      divVideoChatLobby.style = "display:none";
      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
      socket.emit("ready", roomName);
      console.log('## socket.emit("ready"');
    })
    .catch(function (err) {
      /* handle the error */
      alert("Couldn't Access User Media");
    });
});

// Triggered when a room is full (meaning has 2 people).

socket.on("full", function () {
  alert("Room is Full, Can't Join");
});

// Triggered when a peer has joined the room and ready to communicate.

socket.on("ready", function () {
  console.log('## socket.on("ready"), setup rtc');
  if (creator) {
    // create peer connection interface
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    // auto trigger when  everytime when u get ice candidate from sturn server. Need to implement logic
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    // auto triggered when media stream comes from remote client
    rtcPeerConnection.ontrack = OnTrackFunction;
    // for sensing local media stream to remote
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream); // audio stream
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream); // video stream

    // SDP. Information about media. local side is offer
    console.log('## socket.on("ready"), rtcPeerConnection.createOffer()');
    rtcPeerConnection
      .createOffer()
      .then((offer) => {
        rtcPeerConnection.setLocalDescription(offer);
        socket.emit("offer", offer, roomName);
        console.log('## socket.emit("offer")');
      })

      .catch((error) => {
        console.log(error);
      });
  }
});

// Triggered on receiving an ice candidate from the peer.
// ice candidate is public ip address
socket.on("candidate", function (candidate) {
  console.log('## socket.on("candidate"), addIceCandidate');
  let icecandidate = new RTCIceCandidate(candidate);
  rtcPeerConnection.addIceCandidate(icecandidate);
});

// Triggered on receiving an offer from the person who created the room.

socket.on("offer", function (offer) {
  console.log('## socket.on("offer"), setup rtc');
  if (!creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
    rtcPeerConnection.setRemoteDescription(offer);

    // remote side is answer
    console.log('## socket.on("offer"), rtcPeerConnection.createAnswer()');
    rtcPeerConnection
      .createAnswer()
      .then((answer) => {
        rtcPeerConnection.setLocalDescription(answer);
        socket.emit("answer", answer, roomName);
        console.log('## socket.emit("answer")');
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

// Triggered on receiving an answer from the person who joined the room.

socket.on("answer", function (answer) {
  console.log(
    '## socket.on("answer"), rtcPeerConnection.setRemoteDescription(answer)'
  );
  rtcPeerConnection.setRemoteDescription(answer);
});

// Implementing the OnIceCandidateFunction which is part of the RTCPeerConnection Interface.

function OnIceCandidateFunction(event) {
  console.log('## OnIceCandidateFunction, socket.emit("candidate")');
  if (event.candidate) {
    socket.emit("candidate", event.candidate, roomName);
  }
}

// Implementing the OnTrackFunction which is part of the RTCPeerConnection Interface.

function OnTrackFunction(event) {
  console.log("## OnTrackFunction");
  // event.streams contains all the called streams. this is 1:1 video chat, so there's only 1 called stream which is index 0
  peerVideo.srcObject = event.streams[0];
  peerVideo.onloadedmetadata = function (e) {
    peerVideo.play();
  };
}
