window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();
var analyser = null;
var canvas = null;

var ampByteBuffer = new Uint8Array(2048);

//Draw the graphs
var drawGraph = function(array){
  canvas.beginPath();
  canvas.moveTo(0.5,127);
  for(i = 0;i<512;i++){
    var value = (array[4*i] + array[4*i + 1] + array[4*i + 2] + array[4*i + 3]) / 4.0;
    canvas.lineTo(i + 0.5,385 - value);
  }
  canvas.strokeStyle="#000";
  canvas.stroke();
}

window.onload = function(){
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  navigator.getUserMedia({audio:true}, gotStream, logError);

  canvas = document.getElementById("canvas").getContext("2d");
}

var gotStream = function(stream){
  var mediaStreamSource = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.2;
  mediaStreamSource.connect(analyser);
  updateLoop();
}

var logError = function(err){
  console.log(err);
}

var updateLoop = function(){
  canvas.clearRect(0,0,512, 512);
  analyser.getByteTimeDomainData(ampByteBuffer);

  drawGraph(ampByteBuffer);

  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;

  window.requestAnimationFrame(updateLoop);
}