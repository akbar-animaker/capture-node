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
const ffmpeg = require('ffmpeg-static');

const debuglog = util.debuglog('aperture');

// Workaround for https://github.com/electron/electron/issues/9459
const BIN = path.join(electronUtil.fixPathForAsarUnpack(__dirname), 'anim-capture');

class Aperture {

  constructor(props) {
    macosVersion.assertGreaterThanOrEqualTo('10.12');
    const {
      fps = 30,
      cropRect = undefined,
      height = null,
      width = null,
      showCursor = true,
      highlightClicks = false,
      screenId = null,
      cameraId = null,
      audioDeviceId = null,
      chunkDuration = 5,
      noiseCancellation = true,
      recordAudioInMono = false,
      recordId = null,
      outputPath = null
    } = props;
    this.fps = fps;
    this.cropRect = cropRect;
    this.height = height;
    this.width = width;
    this.showCursor = showCursor;
    this.highlightClicks = highlightClicks;
    this.screenId = screenId;
    this.cameraId = cameraId;
    this.audioDeviceId = audioDeviceId;
    this.chunkDuration = chunkDuration;
    this.noiseCancellation = noiseCancellation;
    this.recordAudioInMono = recordAudioInMono;
    this.recordId = recordId;
    this.outputPath = outputPath;
    this.tmpPath = os.tmpdir();
  }

  startRecording = () => {
    return new Promise((resolve, reject) => {
      if (this.recorder !== undefined) {
        reject(new Error('Call `.stopRecording()` first'));
        return;
      }      
      const recorderOpts = {
        outputPath: fileUrl(this.tmpPath),
        fps: this.fps,
        showCursor: this.showCursor,
        highlightClicks: this.highlightClicks,
        displayId: this.screenId,
        audioDevice: this.audioDeviceId,
        videoDevice: this.cameraId,
        width: this.width,
        height: this.height,
        cropRect: this.cropRect,
        duration: this.chunkDuration
      };

      this.recorder = execa(BIN, [JSON.stringify(recorderOpts)]);

      this.recorder.catch(error => {
        delete this.recorder;
        reject(error);
      });
      this.recorder.stdout.setEncoding('utf8');
      this.recorder.stdout.on('data', data => {
        let response = {};
        console.log(data);
        try {
          response = JSON.parse(data);
        } catch (err) {
          response = {};
        };
        if (data.trim() === 'R') {
          resolve(this.tmpPath);
        } else if (response.status === "PROGRESS") {
          const chunkNumber = +response.chunkNumber;
          let command = `ffmpeg -y -i ${response.location} -c copy -copyts -muxdelay 0 -muxpreload 0 ${this.outputPath}/${this.recordId}-${chunkNumber}.ts`;
          exec(command, (mediaError, stdout) => {
            fs.unlink(response.location, (fileError) => {
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

module.exports = (props) => new Aperture(props);
