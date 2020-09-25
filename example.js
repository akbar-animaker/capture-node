'use strict';
const delay = require('delay');
const aperture = require('.');

async function main() {
  const recorder = aperture();
  recorder.startRecording();
  console.log('Recording started');
  await delay(17000);
  recorder.stopRecording();
  console.log('Video saved in the current directory');
}

main().catch(console.error);