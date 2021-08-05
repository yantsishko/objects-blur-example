interface frameNumberArgInfo {
  framesCounts: number[],
  framesDurations: number[],
  timeScale: number,
}

/**
 * @param {Array} argInfo.framesCounts - list of frame counts grouped by duration
 * @param {Number} argInfo.framesCounts[0] - frames count for particular duration
 * @param {Number} argInfo.framesDurations[0] - frame duration, in time units
 * @param {Number} argInfo.timeScale - timebase for converting time units into seconds
 * @param {Number} timestampToFind - requested time whose index should be found, in seconds
 */
const getTimestampIndex = (argInfo: frameNumberArgInfo, timestampToFind: number) => {
  // Convert user time to time units
  const findTime = timestampToFind * argInfo.timeScale;
  let k = 0;
  let time = 0;

  for (let i = 0; i < argInfo.framesCounts.length; i += 1) {
    for (let j = 0; j < argInfo.framesCounts[i]; j += 1) {
      if (time >= findTime) {
        return Math.max(1, k - 1);
      }
      time += argInfo.framesDurations[i];
      k += 1;
    }
  }

  return (time >= findTime ? Math.max(0, k - 1) : k - 1);
}

export default {
  getTimestampIndex,
}
