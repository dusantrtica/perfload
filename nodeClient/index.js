// Node program that captures local performance data
// and sends it up to the socket.io
// CPU load, memory usage (free, total), OS type uptime
// CPU info (type,number of cores, clock speed)

const os = require('os');

const performanceData = () => {
  // cpus is all cores we need the average of all the cores which
  // will give us the cpu average
  const cpuAverage = () => {
    const cpus = os.cpus();
    // get ms in each mode but this number is since reboot
    // so get it now and get it in 100 ms an compare

    let idleMs = 0;
    let totalMs = 0;
    cpus.forEach((core) => {
      // loop through each property of the current core
      for (type in core.times) {
        totalMs += core.times[type];
      }

      idleMs += core.times.idle;
    });

    return {
      idle: idleMs / cpus.length,
      total: totalMs / cpus.length,
    };
  };

  const getCpuLoad = () => {
    return new Promise((resolve, reject) => {
      const start = cpuAverage();
      setTimeout(() => {
        const end = cpuAverage();
        const idleDifference = end.idle - start.idle;
        const totalDifference = end.total - start.total;

        const percentangeCpu =
          100 - Math.floor((100 * idleDifference) / totalDifference);
        resolve(percentangeCpu);
      }, 100);
    });
  };

  return new Promise(async (resolve, reject) => {
    const osType = os.type();
    const upTime = os.uptime();
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const usedMem = totalMem - freeMem;
    const memUsage = Math.floor((usedMem / totalMem) * 100) / 100;
    const cpus = os.cpus();
    const cpuModel = cpus[0].model;
    const numCores = cpus.length;
    const cpuSpeed = cpus[0].speed;

    const cpuLoad = await getCpuLoad();
    resolve({
      freeMem,
      totalMem,
      usedMem,
      memUsage,
      osType,
      upTime,
      cpuModel,
      numCores,
      cpuSpeed,
      cpuLoad,
    });
  });
};

performanceData().then(console.log);
