window.AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();
var analyser = null;
var canvas = null;

var listening = false;
var preparing = false;
var prepFramesLeft = 0;

//Min Values during first 30 frames
var min_E = Number.POSITIVE_INFINITY;
var min_SFM = Number.POSITIVE_INFINITY;
var min_F = Number.POSITIVE_INFINITY;

//Primary threshold values
var thresh_E = 40;
var thresh_SFM = 5;
var thresh_F = 185;

var ampByteBuffer = new Uint8Array(2048);
var ampFloatBuffer = new Float32Array(2048);
var freqBuffer = new Uint8Array(1024);

var containerElement = null;

var inSilentFrame = null;

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
  return Math.abs(10 * (Math.log(gMean / aMean) / Math.LN10));

}

window.onload = function(){
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  navigator.getUserMedia({audio:true}, gotStream, logError);

  canvas = document.getElementById("canvas").getContext("2d");
  containerElement = document.getElementById("canvas-container");
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

var setGlobalSlience = function(isSilent){
  if(isSilent != inSilentFrame){
    inSilentFrame = isSilent;
    if(isSilent){
      containerElement.classList.add('silence');
      containerElement.classList.remove('speech');
    }else{
      containerElement.classList.remove('silence');
      containerElement.classList.add('speech');
    }
  }
}

var updateLoop = function(){
  canvas.clearRect(0,0,512, 512);
  analyser.getByteTimeDomainData(ampByteBuffer);
  analyser.getFloatTimeDomainData(ampFloatBuffer);
  analyser.getByteFrequencyData(freqBuffer);

  drawGraph(ampByteBuffer);

  if(listening){
    var E = calculateEnergy(ampFloatBuffer);
    var SFM = spectralFlatness(freqBuffer);
    var F = highestFreqency(freqBuffer);

    canvas.fillStyle = "#000";
    canvas.fillText(E + "," + SFM + "," + F,128,128);
    canvas.fillText(min_E + "," + min_SFM + "," + min_F,128,150);

    if(preparing = true){
      if(prepFramesLeft > 0){
        min_E = Math.min(E,min_E);
        min_F = Math.min(F,min_F);
        min_SFM = Math.min(SFM,min_SFM);
        prepFramesLeft--;
      }else{
        preparing = false;
      }
      
    }

    silent = true;
    if((E - min_E) >= thresh_E )//* (Math.log(min_E) / Math.LN10))
      silent = false;
    else if((F - min_F) >= thresh_F)
      silent = false;
    else if((SFM - min_SFM) >= thresh_SFM)
      silent = true;

    setGlobalSlience(silent);
  }


  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;

  window.requestAnimationFrame(updateLoop);
}

var toggle = function(){
  listening = !listening;
  if(listening = true){
    preparing = true;
    prepFramesLeft = 30;
  }
}