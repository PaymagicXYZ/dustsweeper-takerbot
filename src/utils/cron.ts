const asyncIntervals: boolean[] = []

const runAsyncInterval = async (cb: () => Promise<any>, interval: number, intervalIndex: number) => {
  await cb();
  if (asyncIntervals[intervalIndex]) {
    setTimeout(() => runAsyncInterval(cb, interval, intervalIndex), interval);
  }
};

const setAsyncInterval = (cb: () => Promise<any>, interval: number) => {
  const intervalIndex = asyncIntervals.length;
  asyncIntervals.push(true);
  runAsyncInterval(cb, interval, intervalIndex);
  return intervalIndex;
};

export const cron = (refreshIntervalSeconds: number, cronName: string, cronScript: Function) => new Promise((resolve: (value: void) => void, reject) => {
  setAsyncInterval(async () => {
    console.log(`Starting cronjob ${cronName}`)
    try {
      
      await cronScript()

      console.log(`Cronjob ${cronName} is ended successfully`)
      resolve()
    } catch (e) {
      console.error(`Error in cronjob ${cronName}`)
      console.error(e.message)
      // reject(e)
    }
  }, refreshIntervalSeconds * 1000);
})
