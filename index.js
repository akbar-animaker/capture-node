'use strict';
const os = require('os');
const fs = require('fs');
const util = require('util');
const path = require('path');
const execa = require('execa');
const { exec, spawn } = require('child_process');
const macosVersion = require('macos-version');
const fileUrl = require('file-url');
const electronUtil = require('electron-util/node');
const ffmpeg = require('ffmpeg-static')

const debuglog = util.debuglog('aperture');

// Workaround for https://github.com/electron/electron/issues/9459
const BIN = path.join(electronUtil.fixPathForAsarUnpack(__dirname), 'anim-capture');

class Aperture {

  constructor() {
    macosVersion.assertGreaterThanOrEqualTo('10.12');
  }

  startRecording({
    fps = 30,
    cropArea = undefined,
    showCursor = true,
    highlightClicks = false,
    screenId = 0,
    audioDeviceId = undefined
  } = {}) {
    return new Promise((resolve, reject) => {

      if (this.recorder !== undefined) {
        reject(new Error('Call `.stopRecording()` first'));
        return;
      }

      this.tmpPath = "./Files/"

      const recorderOpts = {
        outputPath: fileUrl(this.tmpPath),
        framesPerSecond: fps,
        showCursor,
        highlightClicks,
        screenId,
        audioDeviceId,
        cropArea
      };

      this.recorder = execa(BIN, [JSON.stringify(recorderOpts)]);

      this.recorder.catch(error => {
        delete this.recorder;
        reject(error);
      });
      this.recorder.stdout.setEncoding('utf8');
      this.recorder.stdout.on('data', data => {
        debuglog(data);
        console.log(data);
        if (data.trim() === 'R') {
          resolve(this.tmpPath);
        }
        else if (data.indexOf('URL') > -1) {
          const paths = data.split('\n').join('').split('/')
          const fileName = +paths[paths.length - 1].split('.mp4')[0];
          let command = `ffmpeg -y -i ./Files/${fileName}.mp4 -c copy -copyts -muxdelay 0 -muxpreload 0 ./Movies/${fileName}.ts`;
          exec(command, (mediaError, stdout) => {
            fs.unlink(`./Files/${fileName}.mp4`, (fileError) => {
              if (fileError) {
                console.log(`File Not Removed`)
              }
            });
          });
        }
      });
      resolve(this.tmpPath);
    });
  }

  async sendEvent(name, parse) {
    const { stdout } = await execa(
      BIN, [name]
    );
    if (parse) {
      return parse(stdout.trim());
    }
  }

  async stopRecording() {
    return this.sendEvent('stop');
  }

  async pauseRecording() {
    return this.sendEvent('pause');
  }

  async resumeRecording() {
    return this.sendEvent('resume');
  }

  async cancelRecording() {
    return this.sendEvent('cancel');
  }

  async muteRecording(isMute) {
    if (isMute) {
      return this.sendEvent('mute');
    }
    return this.sendEvent('unmute');
  }
}

module.exports = () => new Aperture();
