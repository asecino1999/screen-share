let socket = io.connect("http://localhost:5000");

let answersFrom = {},
  offer;
let peerConnection =
  window.RTCPeerConnection ||
  window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection ||
  window.msRTCPeerConnection;

let sessionDescription =
  window.RTCSessionDescription ||
  window.mozRTCSessionDescription ||
  window.webkitRTCSessionDescription ||
  window.msRTCSessionDescription;

navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia;
let mediaRecorder;

let chunks = [];
let pc = new peerConnection({
  iceServers: [
    {
      url: "stun:stun.services.mozilla.com",
      username: "somename",
      credential: "somecredentials",
    },
  ],
});

let link;
let config1 = (data) => ({
  method: "post",
  url: "https://api.vimeo.com/me/videos",
  headers: {
    Authorization: "bearer 5ff7458255cbe0093af3f360014c1822",
    "Content-Type": "application/json",
    Accept: "application/vnd.vimeo.*+json;version=3.4",
  },
  data: data,
});
let getLinkStep1 = async (out) => {
  link = await out.data.upload.upload_link;
  console.log("getting link ", link);
  return link;
};
let config2 = async (file, link) => ({
  method: "patch",
  url: link,
  headers: {
    "Tus-Resumable": "1.0.0",
    "Upload-Offset": "0",
    "Content-Type": "application/offset+octet-stream",
    Accept: "application/vnd.vimeo.*+json;version=3.4",
  },
  data: file,
});
let config3 = (link) => ({
  method: "head",
  url: link,
  headers: {
    "Tus-Resumable": "1.0.0",
    Accept: "application/vnd.vimeo.*+json;version=3.4",
  },
});

let up = async (chunks) => {
  console.log(chunks)
  let blob = new Blob(chunks, { type: "video/mp4;" });
  //const obj = { hello: "world" };
  //const blob = new Blob([JSON.stringify(obj, null, 2)], {type: "application/json"});
  //let n = (await blob.arrayBuffer()).byteLength
  //console.log(n)
  //return
  let videobuffer = await blob.arrayBuffer();
  let size =await blob.size
  let data = await JSON.stringify({
    //upload: { approach: "tus", size: videobuffer.byteLength },
    upload: { approach: "tus", size: size },
  });
  

  let file = videobuffer
  console.log(data,file,size,videobuffer.byteLength)
  let conf = await config1(data)
  let out1 = await axios(conf);
  let link = await getLinkStep1(out1);
  console.log(link);
  //let out2 = await axios(config2(chunks, link));
  conf = await config2(file, link)
  console.log(conf)
  conf=conf
  let out2 = await axios(conf);
  console.log(out2);
  conf = await config3(link)
  let out3 = await axios(conf);
  console.log(out3);
  return 'fin'
};

pc.onaddstream = function (obj) {
  let vid = document.createElement("video");
  vid.setAttribute("class", "video-small");
  vid.setAttribute("autoplay", "autoplay");
  vid.setAttribute("id", "video-small");
  document.getElementById("users-container").appendChild(vid);
  vid.srcObject = obj.stream;
};

async function startCapture() {
  //logElem.innerHTML = '';
  let vid = document.querySelector("video");
  let vidSave = document.getElementById("vid2");
  let mediaDevices;
  try {
    mediaDevices = navigator.mediaDevices;
    vid.srcObject = await mediaDevices.getDisplayMedia();
    pc.addStream(vid.srcObject);
    mediaRecorder = new MediaRecorder(vid.srcObject);
    mediaRecorder.ondataavailable = function (ev) {
      chunks.push(ev.data);
    };
    mediaRecorder.onstop = (ev) => {
      //let blob = new Blob(chunks, { type: "video/mp4;" });
      let blob = new Blob(chunks, { type: "video/mp4;" });
      //chunks = [];
      let videoURL = window.URL.createObjectURL(blob);
      vidSave.src = videoURL;
      up(chunks)
      .then((out)=>console.log(out))
      .catch((err)=>console.log(err))
    };
    mediaRecorder.start();
    //    dumpOptionsInfo();
  } catch (err) {
    console.error("Error: " + err);
  }
}

function stop() {
  mediaRecorder.stop();
}

/*
navigator.getUserMedia({video: true, audio: true}, function (stream) {
    let video = document.querySelector('video');
    video.srcObject = stream;
    pc.addStream(stream);
}, error);
*/

socket.on("add-users", function (data) {
  for (let i = 0; i < data.users.length; i++) {
    let el = document.createElement("div"),
      id = data.users[i];

    el.setAttribute("id", id);
    el.innerHTML = id;
    el.addEventListener("click", function () {
      createOffer(id);
    });
    document.getElementById("users").appendChild(el);
  }
});

socket.on("remove-user", function (id) {
  let div = document.getElementById(id);
  document.getElementById("users").removeChild(div);
});

socket.on("offer-made", function (data) {
  offer = data.offer;

  pc.setRemoteDescription(
    new sessionDescription(data.offer),
    function () {
      pc.createAnswer(function (answer) {
        pc.setLocalDescription(
          new sessionDescription(answer),
          function () {
            socket.emit("make-answer", {
              answer: answer,
              to: data.socket,
            });
          },
          error
        );
      }, error);
    },
    error
  );
});

socket.on("answer-made", function (data) {
  pc.setRemoteDescription(
    new sessionDescription(data.answer),
    function () {
      document.getElementById(data.socket).setAttribute("class", "active");
      if (!answersFrom[data.socket]) {
        createOffer(data.socket);
        answersFrom[data.socket] = true;
      }
    },
    error
  );
});

function createOffer(id) {
  pc.createOffer(function (offer) {
    pc.setLocalDescription(
      new sessionDescription(offer),
      function () {
        socket.emit("make-offer", {
          offer: offer,
          to: id,
        });
      },
      error
    );
  }, error);
}

function error(err) {
  console.warn("Error", err);
}
