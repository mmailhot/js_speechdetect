window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();
var analyser = null;
var canvas = null;

var listening = false;
var preparing = false;
var prepFramesLeft = 0;

var ampByteBuffer = new Uint8Array(2048);
var ampFloatBuffer = new Float32Array(2048);
var freqBuffer = new Uint8Array(1024);

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

//Get spectral energy data
var calculateEnergy = function(array){
  var energy = 0;
  for(var i = 0; i < array.length; i++){
    energy += (array[i]) * (array[i]);
  }
  return energy;
}

//Get the index of he highest element in an array
var maxIndex = function(array){
  var max_val = Number.NEGATIVE_INFINITY;
  var max_index = 0;
  for(i = 0; i<array.length ;i++){
    if(array[i] > max_val){
      max_val = array[i];
      max_index = i;
    }
  }
  return max_index;
}

//Get the corresponding freq (in Hz) for an index in the fft array
var freqFromIndex = function(i){
  var nyquist = audioContext.sampleRate/2;
  var size = analyser.fftSize;

  var step = (nyquist * 1.0)/size;
  return i * step;
}

//Get highest frequency
var  highestFreqency = function(array){
  return freqFromIndex(maxIndex(array));
}

//Get the spectral flatness measurement
var spectralFlatness = function(array){
  var aMean = 0;
  var gMean = 0;

  for(var i = 0;i < array.length;i++){
    aMean += array[i] * array[i];
    gMean += Math.log(array[i] * array[i] + 1);
  }

  aMean = aMean / (array.length * 1.0);
  gMean = Math.exp(gMean / (array.length * 1.0));
  console.log(aMean + "/" + gMean)
  return Math.abs(10 * (Math.log(gMean / aMean) / Math.LN10));

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
  analyser.getFloatTimeDomainData(ampFloatBuffer);
  analyser.getByteFrequencyData(freqBuffer);

  drawGraph(ampByteBuffer);

  if(listening)
    console.log(calculateEnergy(ampFloatBuffer) + " - " + spectralFlatness(freqBuffer));

  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;

  window.requestAnimationFrame(updateLoop);
}

var toggle = function(){
  listening = !listening;
}