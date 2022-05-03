import React, { useEffect, useState, useRef, MutableRefObject } from 'react';

import videoExample from './assets/example.mp4';
import ObjectsBlur from './components/ObjectsBlur/ObjectsBlur';
import occurrences from './mockData/occurrences.json';

import { videoUtils } from './utils';

import { OBJECTS_CENSURE_TYPE, BLUR_INTENSITY } from './constants/objects';
import { VIDEO_METADATA_INFO } from './constants/video';

import './App.css';

function App() {
  const [time, setTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [frame, setFrame] = useState(1);
  const [censureType, setCensureType] = useState(OBJECTS_CENSURE_TYPE.GAUSS);
  const [isFrameHasBlurOutObjects, setIsFrameHasBlurOutObjects] = useState(false);

  let canvasRef: React.RefObject<HTMLCanvasElement> = useRef(null);
  let video: MutableRefObject<HTMLVideoElement> = useRef(document.createElement('video'));
  let videoContext: MutableRefObject<CanvasRenderingContext2D | null | undefined> = useRef(null);
  let timeUpdateRAFId: MutableRefObject<number> = useRef(0);
  let isDestroyed: MutableRefObject<boolean> = useRef(false);

  useEffect(() => {
    video.current.crossOrigin = 'anonymous';
    video.current.addEventListener('loadeddata', handleLoadedData);
    video.current.addEventListener('seeked', handleSeeked);

    video.current.src = videoExample;

    const canvas = canvasRef.current;
    videoContext.current = canvas?.getContext('2d');

    return () => {
      isDestroyed.current = true;

      video.current.removeEventListener('loadeddata', handleLoadedData);
      video.current.removeEventListener('seeked', handleSeeked);
    }
  }, []);

  useEffect(() => {
    setFrame(videoUtils.getTimestampIndex(VIDEO_METADATA_INFO, time));
    drawToCanvas();
  }, [time]);

  const handleSeeked = () => {
    setTime(video.current.currentTime);
  }

  const handleLoadedData = () => {
    if (!video.current.currentTime) {
      video.current.currentTime = 0.0001;
    }

    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) return;

    const { width, height } = getVideoSize();

    canvas.width = width;
    canvas.height = height;

    drawToCanvas();
  
    setTimeout(() => {
      setIsLoaded(true);
    }, 150);
  };

  useEffect(() => {
    setIsFrameHasBlurOutObjects(calcIsFrameHasBlurOutObjects());
  }, [frame])

  const play = () => {
    video.current.play();
    requestTimeUpdate();
  }

  const pause = () => {
    video.current.pause();
    stopTimeUpdateLoop();
  };

  const getVideoSize = () => {
    return {
      height: video.current.videoHeight,
      width: video.current.videoWidth,
    };
  }

  const stopTimeUpdateLoop = () => {
    window.cancelAnimationFrame(timeUpdateRAFId.current);
  }

  const requestTimeUpdate = () => {
    if (isDestroyed.current) {
      return;
    }

    setTime(video.current.currentTime);

    timeUpdateRAFId.current = window.requestAnimationFrame(requestTimeUpdate);
  };

  const drawToCanvas = () => {
    const canvas = canvasRef.current;

    if (!canvas || !canvas.getContext) return;

    const { width, height } = getVideoSize();
 
    videoContext?.current?.drawImage(video.current, 0, 0, width, height);
  }

  const changeCensureType = (censureType: OBJECTS_CENSURE_TYPE) => () => {
    setCensureType(censureType);
  }

  const calcIsFrameHasBlurOutObjects = () => {
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

  return (
    <div className="App">
      <div>
        <div>
          Playback:
          <button onClick={play}>Play</button>
          <button onClick={pause}>Pause</button>
        </div>
        <div>
          Censure:
          <button onClick={changeCensureType(OBJECTS_CENSURE_TYPE.GAUSS)}>Gauss</button>
          <button onClick={changeCensureType(OBJECTS_CENSURE_TYPE.PIXELATE)}>Pixelate with css filter</button>
          <button onClick={changeCensureType(OBJECTS_CENSURE_TYPE.PIXELATE_CANVAS_FILTER)}>Pixelate with canvas filter</button>
        </div>
      </div>
      <div className="canvasWrapper">
        <canvas ref={canvasRef} className="videoCanvas" />
        {
          isLoaded && (
            <ObjectsBlur
              blurIntensity={BLUR_INTENSITY}
              censureType={censureType}
              frameNumber={frame}
              imageSource={canvasRef.current}
              isFrameHasBlurOutObjects={isFrameHasBlurOutObjects}
              occurrences={occurrences}
            />
          )
        }
      </div>
    </div>
  );
}

export default App;
