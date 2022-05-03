import React, { useEffect, useState } from 'react';

import { OBJECTS_CENSURE_TYPE } from '../../constants/objects';

import './ObjectsBlur.css';

interface ObjectsBlurProps {
  imageSource: HTMLCanvasElement | null;
  blurIntensity: number;
  isFrameHasBlurOutObjects: boolean;
  frameNumber: number;
  occurrences: any;
  censureType: OBJECTS_CENSURE_TYPE;
}

const PERIMETER_DOWNSIZE_MULTIPLIER = 50;

function ObjectsBlur({ imageSource, blurIntensity, isFrameHasBlurOutObjects, frameNumber, occurrences, censureType }: ObjectsBlurProps) {
  let displayCanvas: HTMLCanvasElement | null = null;
  let displayCanvasRef = React.createRef<HTMLCanvasElement>();
  let displayContext: any = null;
  let downsizeRatio: number = 0;
  let height: number = 0;
  let width: number = 0;
  let tmpCanvas: HTMLCanvasElement | null = null;
  let tmpCanvasRef = React.createRef<HTMLCanvasElement>();
  let tmpContext: any = null;
  

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    updateBlurLayer();
    updateObjects();
  }, [imageSource, blurIntensity, censureType, isFrameHasBlurOutObjects, occurrences, frameNumber]);

  function updateBlurLayer() {
    const blurIntensityMax = 100;
    const defaultBlurIntensity = 25;

    if (imageSource === null) return;

    tmpCanvas = tmpCanvasRef.current;

    if (tmpCanvas === null) return;

    width = imageSource.width;
    height = imageSource.height;

    tmpContext = tmpCanvas.getContext('2d', { alpha: false });
    tmpContext.clearRect(0, 0, width, height);
    tmpCanvas.width = 1; // hack for quick reset canvas
    tmpCanvas.width = width;
    tmpCanvas.height = height;
    tmpContext.msImageSmoothingEnabled = false;
    tmpContext.imageSmoothingEnabled = false;

    displayCanvas = displayCanvasRef.current;

    if (displayCanvas === null) return;

    displayCanvas.height = height;
    displayCanvas.width = width;
    displayContext = displayCanvas.getContext('2d');

    if (censureType === OBJECTS_CENSURE_TYPE.GAUSS) {
      displayContext.msImageSmoothingEnabled = true;
      displayContext.imageSmoothingEnabled = true;
    } else {
      displayContext.msImageSmoothingEnabled = false;
      displayContext.imageSmoothingEnabled = false;
    }

    if (censureType === OBJECTS_CENSURE_TYPE.PIXELATE || censureType === OBJECTS_CENSURE_TYPE.PIXELATE_CANVAS_FILTER) {
      const brightnessMax = blurIntensityMax + defaultBlurIntensity;

      if (censureType === OBJECTS_CENSURE_TYPE.PIXELATE_CANVAS_FILTER) {
        // this filter stuck applying pixelization
        tmpContext.filter = `brightness(${brightnessMax - blurIntensity}%)`;
      } else {
        // this is css analogue more faster
        tmpCanvas.style.filter = `brightness(${brightnessMax - blurIntensity}%)`;
      }

      if (isFrameHasBlurOutObjects) {
        const ctx = imageSource.getContext('2d');

        const imgData = ctx && ctx.getImageData(0, 0,  width, height).data;

        if (!imgData) return;

        const perimeter = ( width + height) * 2;
        let pixelSize = Math.floor((perimeter / PERIMETER_DOWNSIZE_MULTIPLIER)
          * (blurIntensity / blurIntensityMax));

        for (let row = 0; row < height; row += pixelSize) {
          for (let col = 0; col < width; col += pixelSize) {
            let pixel = (col + ( row * width )) * 4;

            tmpContext.fillStyle = `rgba(${imgData[pixel]},${imgData[pixel + 1]},${imgData[pixel + 2]},${imgData[pixel + 3]})`;
            tmpContext.fillRect(col, row, pixelSize, pixelSize);
          }
        }
      } else {
        const halfPerimeter = height + width;

        downsizeRatio = (halfPerimeter / PERIMETER_DOWNSIZE_MULTIPLIER)
          * (blurIntensity / 100);

        tmpContext.drawImage(
          imageSource,
          0, 0, width, height,
          0, 0, width / downsizeRatio, height / downsizeRatio,
        );
      }
    } else { // gauss blur
      const brightnessMax = blurIntensityMax + defaultBlurIntensity;
      tmpContext.filter = `blur(${blurIntensity}px) brightness(${brightnessMax - blurIntensity}%)`;

      tmpContext.drawImage(imageSource, 0, 0);
    }
  }

  function updateObjects() {
    // const { blurIntensity, censureType, imageSource, isFrameHasBlurOutObjects, occurrences, frameNumber } = this.props;

    if (tmpCanvas === null) return;
    if (displayCanvas === null) return;

    const occurrencesByFrame = occurrences[frameNumber] || {};

    Object.values(occurrencesByFrame).sort((a: any, b: any) => b.isBlurOut - a.isBlurOut).forEach((occurrence: any) => {
      try {
        let drawSourceRect;

        const displayRect = {
          x: occurrence.x,
          y: occurrence.y,
          w: occurrence.w,
          h: occurrence.h,
        };

        if (
          (censureType === OBJECTS_CENSURE_TYPE.GAUSS || blurIntensity > 97)
          || isFrameHasBlurOutObjects
        ) {
          drawSourceRect = displayRect;
        } else {
          drawSourceRect = {
            x: occurrence.x / downsizeRatio,
            y: occurrence.y / downsizeRatio,
            w: occurrence.w / downsizeRatio,
            h: occurrence.h / downsizeRatio,
          };
        }

        displayContext.save();

        // draw ellipse
        displayContext.beginPath();
        const radiusX = displayRect.w / 2;
        const radiusY = displayRect.h / 2;
        const centerX = displayRect.x + radiusX;
        const centerY = displayRect.y + radiusY;
        const rotation = Math.PI;
        const startAngle = 0;
        const endAngle = rotation * 2;

        displayContext.ellipse(
          centerX,
          centerY,
          radiusX,
          radiusY,
          rotation,
          startAngle,
          endAngle,
        );
        displayContext.closePath();
        displayContext.clip();

        displayContext.drawImage(
          occurrence.isBlurOut ? imageSource : tmpCanvas,
          drawSourceRect.x, drawSourceRect.y, drawSourceRect.w, drawSourceRect.h,
          displayRect.x, displayRect.y, displayRect.w, displayRect.h,
        );

        displayContext.restore();

      } catch (err) {
        console.log(err);
      }
    });

    setIsLoading(false);
  }

  return (
    <div className="container">
      <canvas
        ref={tmpCanvasRef}
        className={`canvas ${!isFrameHasBlurOutObjects ? 'hidden' : ''}`}
      />
      <canvas
        ref={displayCanvasRef}
        className={`canvas ${isLoading ? 'hidden' : ''}`}
      />
    </div>
  );

}

export default ObjectsBlur;
