'use strict';
const delay = require('delay');
const aperture = require('.');

async function main() {
  const recorder = aperture({
    outputPath: './Movies',
    recordId: 'sample'
  });
  recorder.startRecording();
  console.log('Recording started');
  await delay(7000);
  recorder.pauseRecording();
  console.log('Recording Paused');
  await delay(10000);
  recorder.resumeRecording();
  console.log('Recording Resumed');
  await delay(10000);
  recorder.stopRecording();
  console.log('Video saved in the current directory');
}

main().catch(console.error);