import React from 'react';

import videoExample from './assets/example.mp4';
import ObjectsBlur from './components/ObjectsBlur/ObjectsBlur';
import occurrences from './mockData/occurrences.json';

import { videoUtils } from './utils';

import { OBJECTS_CENSURE_TYPE, BLUR_INTENSITY } from './constants/objects';
import { VIDEO_METADATA_INFO } from './constants/video';

import './App.css';

interface AppState {
  time: number;
  isLoaded: boolean;
  frame: number;
  isPlaying: boolean;
  censureType: OBJECTS_CENSURE_TYPE,
}

class App extends React.PureComponent<any, AppState> {
  private readonly canvasRef: React.RefObject<HTMLCanvasElement>;
  private readonly video: HTMLVideoElement;
  private timeUpdateRAFId: number;
  private isDestroyed: boolean;
  private videoContext: CanvasRenderingContext2D | null | undefined;

  constructor(props: any) {
    super(props);

    this.state = {
      time: 0,
      isLoaded: false,
      frame: 1,
      isPlaying: false,
      censureType: OBJECTS_CENSURE_TYPE.GAUSS,
    };

    this.canvasRef = React.createRef<HTMLCanvasElement>();
    this.video = document.createElement('video');
    this.videoContext = null;
    this.timeUpdateRAFId = 0;
    this.isDestroyed = false;
  }

  componentDidMount() {
    this.video.crossOrigin = 'anonymous';
    this.video.addEventListener('loadeddata', this.handleLoadedData);
    this.video.addEventListener('seeked', this.handleSeeked);

    this.video.src = videoExample;

    const canvas = this.canvasRef.current;
    this.videoContext = canvas?.getContext('2d');
  }

  componentWillUnmount() {
    this.isDestroyed = true;

    this.video.removeEventListener('loadeddata', this.handleLoadedData);
    this.video.removeEventListener('seeked', this.handleSeeked);
  }

  handleSeeked = () => {
    this.processFrame();
  }

  handleLoadedData = () => {
    if (!this.video.currentTime) {
      this.video.currentTime = 0.0001;
    }

    const canvas = this.canvasRef.current;
    if (!canvas || !canvas.getContext) return;

    const { width, height } = this.getVideoSize();

    canvas.width = width;
    canvas.height = height;

    this.drawToCanvas();

    setTimeout(() => {
      this.setState({
        isLoaded: true,
      });
    }, 150);
  };

  play = () => {
    this.video.play();

    this.setState({
      isPlaying: true,
    });

    this.requestTimeUpdate();
  }

  pause = () => {
    this.video.pause();

    this.setState({
      isPlaying: false,
    });

    this.stopTimeUpdateLoop();
    this.processFrame();
  };

  getVideoSize() {
    return {
      height: this.video.videoHeight,
      width: this.video.videoWidth,
    };
  }

  stopTimeUpdateLoop() {
    window.cancelAnimationFrame(this.timeUpdateRAFId);
  }

  requestTimeUpdate = () => {
    if (this.isDestroyed) {
      return;
    }

    this.processFrame();
    this.timeUpdateRAFId = window.requestAnimationFrame(this.requestTimeUpdate);
  };

  processFrame() {
    const { time } = this.state;

    if (!time) {
      this.drawToCanvas();
    }

    this.setState({ time: this.video.currentTime });

    this.setState({
      frame: videoUtils.getTimestampIndex(VIDEO_METADATA_INFO, time),
    });

    this.drawToCanvas();
  }

  drawToCanvas() {
    const canvas = this.canvasRef.current;
    if (!canvas || !canvas.getContext) return;

    const { width, height } = this.getVideoSize();
    this.videoContext?.drawImage(this.video, 0, 0, width, height);
  }

  changeCensureType = (censureType: OBJECTS_CENSURE_TYPE) => () => {
    this.setState({
      censureType,
    });
  }

  isFrameHasBlurOutObjects = () => {
    const { frame } = this.state;

    // @ts-ignore
    const occurrencesByFrame = occurrences[frame] || {};

    let isFrameHasBlurOutObjects = false;

    Object.values(occurrencesByFrame).forEach((occurrence: any) => {
      if (occurrence.isBlurOut) {
        isFrameHasBlurOutObjects = true;
      }
    });

    return isFrameHasBlurOutObjects;
  }

  render() {
    const { isLoaded, frame, isPlaying, censureType } = this.state;

    return (
      <div className="App">
        <div>
          <div>
            Playback:
            <button onClick={this.play}>Play</button>
            <button onClick={this.pause}>Pause</button>
          </div>
          <div>
            Censure:
            <button onClick={this.changeCensureType(OBJECTS_CENSURE_TYPE.GAUSS)}>Gauss</button>
            <button onClick={this.changeCensureType(OBJECTS_CENSURE_TYPE.PIXELATE)}>Pixelate with css filter</button>
            <button onClick={this.changeCensureType(OBJECTS_CENSURE_TYPE.PIXELATE_CANVAS_FILTER)}>Pixelate with canvas filter</button>
          </div>
        </div>
        <div className="canvasWrapper">
          <canvas ref={this.canvasRef} className="videoCanvas" />
          {
            isLoaded && (
              <ObjectsBlur
                blurIntensity={BLUR_INTENSITY}
                censureType={censureType}
                frameNumber={frame}
                imageSource={this.canvasRef.current}
                isFrameHasBlurOutObjects={this.isFrameHasBlurOutObjects()}
                isPlaying={isPlaying}
                occurrences={occurrences}
              />
            )
          }
        </div>
      </div>
    );
  }
}

export default App;
