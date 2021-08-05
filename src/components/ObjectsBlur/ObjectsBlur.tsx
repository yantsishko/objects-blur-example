import React from 'react';

import { OBJECTS_CENSURE_TYPE } from '../../constants/objects';

import './ObjectsBlur.css';

interface ObjectsBlurProps {
  imageSource: HTMLCanvasElement | null;
  blurIntensity: number;
  isFrameHasBlurOutObjects: boolean;
  frameNumber: number;
  isPlaying: boolean;
  occurrences: any;
  censureType: OBJECTS_CENSURE_TYPE;
}

interface ObjectsBlurState {
  isLoading: boolean;
}

const PERIMETER_DOWNSIZE_MULTIPLIER = 50;

class ObjectsBlur extends React.PureComponent<ObjectsBlurProps, ObjectsBlurState> {
  private displayCanvas: HTMLCanvasElement | null;
  private readonly displayCanvasRef: React.RefObject<HTMLCanvasElement>;
  private displayContext: any;
  private downsizeRatio: number;
  private height: number;
  private startWidth: number | null;
  private tmpCanvas: HTMLCanvasElement | null;
  private readonly tmpCanvasRef: React.RefObject<HTMLCanvasElement>;
  private tmpContext: any;
  private width: number;

  constructor(props: any) {
    super(props);

    this.displayCanvas = null;
    this.displayCanvasRef = React.createRef<HTMLCanvasElement>();
    this.downsizeRatio = 0;
    this.height = 0;
    this.startWidth = 0;
    this.tmpCanvas = null;
    this.tmpCanvasRef = React.createRef<HTMLCanvasElement>();
    this.width = 0;

    this.state = {
      isLoading: true,
    };
  }

  componentDidMount() {
    this.startWidth = this.tmpCanvasRef.current && this.tmpCanvasRef.current.width;
    this.updateBlurLayer();
    this.updateObjects();
  }

  componentDidUpdate(prevProps: any) {
    this.updateBlurLayer();
    this.updateObjects();
  }

  updateBlurLayer() {
    const blurIntensityMax = 100;
    const defaultBlurIntensity = 25;

    const { imageSource, blurIntensity, censureType, isFrameHasBlurOutObjects } = this.props;

    if (imageSource === null) return;

    this.tmpCanvas = this.tmpCanvasRef.current;

    if (this.tmpCanvas === null) return;

    this.width = imageSource.width;
    this.height = imageSource.height;

    this.tmpContext = this.tmpCanvas.getContext('2d', { alpha: false });
    this.tmpContext.clearRect(0, 0, this.width, this.height);
    this.tmpCanvas.width = 1; // hack for quick reset canvas
    this.tmpCanvas.width = this.width;
    this.tmpCanvas.height = this.height;
    this.tmpContext.msImageSmoothingEnabled = false;
    this.tmpContext.imageSmoothingEnabled = false;

    this.displayCanvas = this.displayCanvasRef.current;

    if (this.displayCanvas === null) return;

    this.displayCanvas.height = this.height;
    this.displayCanvas.width = this.width;
    this.displayContext = this.displayCanvas.getContext('2d');

    if (censureType === OBJECTS_CENSURE_TYPE.GAUSS) {
      this.displayContext.msImageSmoothingEnabled = true;
      this.displayContext.imageSmoothingEnabled = true;
    } else {
      this.displayContext.msImageSmoothingEnabled = false;
      this.displayContext.imageSmoothingEnabled = false;
    }

    if (censureType === OBJECTS_CENSURE_TYPE.PIXELATE || censureType === OBJECTS_CENSURE_TYPE.PIXELATE_CANVAS_FILTER) {
      const brightnessMax = blurIntensityMax + defaultBlurIntensity;

      if (censureType === OBJECTS_CENSURE_TYPE.PIXELATE_CANVAS_FILTER) {
        // this filter stuck applying pixelization
        this.tmpContext.filter = `brightness(${brightnessMax - blurIntensity}%)`;
      } else {
        // this is css analogue more faster
        this.tmpCanvas.style.filter = `brightness(${brightnessMax - blurIntensity}%)`;
      }

      if (isFrameHasBlurOutObjects) {
        const ctx = imageSource.getContext('2d');

        const imgData = ctx && ctx.getImageData(0, 0,  this.width, this.height).data;

        if (!imgData) return;

        const perimeter = ( this.width + this.height) * 2;
        let pixelSize = Math.floor((perimeter / PERIMETER_DOWNSIZE_MULTIPLIER)
          * (blurIntensity / blurIntensityMax));

        for (let row = 0; row < this.height; row += pixelSize) {
          for (let col = 0; col < this.width; col += pixelSize) {
            let pixel = (col + ( row * this.width )) * 4;

            this.tmpContext.fillStyle = `rgba(${imgData[pixel]},${imgData[pixel + 1]},${imgData[pixel + 2]},${imgData[pixel + 3]})`;
            this.tmpContext.fillRect(col, row, pixelSize, pixelSize);
          }
        }
      } else {
        const halfPerimeter = this.height + this.width;

        this.downsizeRatio = (halfPerimeter / PERIMETER_DOWNSIZE_MULTIPLIER)
          * (blurIntensity / 100);

        this.tmpContext.drawImage(
          imageSource,
          0, 0, this.width, this.height,
          0, 0, this.width / this.downsizeRatio, this.height / this.downsizeRatio,
        );
      }
    } else { // gauss blur
      const brightnessMax = blurIntensityMax + defaultBlurIntensity;
      this.tmpContext.filter = `blur(${blurIntensity}px) brightness(${brightnessMax - blurIntensity}%)`;

      this.tmpContext.drawImage(imageSource, 0, 0);
    }
  }

  updateObjects() {
    const { blurIntensity, censureType, imageSource, isFrameHasBlurOutObjects, occurrences, frameNumber } = this.props;

    if (this.tmpCanvas === null) return;
    if (this.displayCanvas === null) return;

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
            x: occurrence.x / this.downsizeRatio,
            y: occurrence.y / this.downsizeRatio,
            w: occurrence.w / this.downsizeRatio,
            h: occurrence.h / this.downsizeRatio,
          };
        }

        this.displayContext.save();

        // draw ellipse
        this.displayContext.beginPath();
        const radiusX = displayRect.w / 2;
        const radiusY = displayRect.h / 2;
        const centerX = displayRect.x + radiusX;
        const centerY = displayRect.y + radiusY;
        const rotation = Math.PI;
        const startAngle = 0;
        const endAngle = rotation * 2;

        this.displayContext.ellipse(
          centerX,
          centerY,
          radiusX,
          radiusY,
          rotation,
          startAngle,
          endAngle,
        );
        this.displayContext.closePath();
        this.displayContext.clip();

        this.displayContext.drawImage(
          occurrence.isBlurOut ? imageSource : this.tmpCanvas,
          drawSourceRect.x, drawSourceRect.y, drawSourceRect.w, drawSourceRect.h,
          displayRect.x, displayRect.y, displayRect.w, displayRect.h,
        );

        this.displayContext.restore();

      } catch (err) {
        console.log(err);
      }
    });

    this.setState({ isLoading: false });
  }

  render() {
    const { isLoading } = this.state;
    const { isFrameHasBlurOutObjects } = this.props;

    return (
      <div className="container">
        <canvas
          ref={this.tmpCanvasRef}
          className={`canvas ${!isFrameHasBlurOutObjects ? 'hidden' : ''}`}
        />
        <canvas
          ref={this.displayCanvasRef}
          className={`canvas ${isLoading ? 'hidden' : ''}`}
        />
      </div>
    );
  }

}

export default ObjectsBlur;
