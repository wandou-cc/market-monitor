const pLimit = require("p-limit").default;

function formatTime(input, format = "yyyy-MM-dd HH:mm:ss") {
  let date;

  // 处理不同格式的 input（字符串、数字）
  if (typeof input === "string" || typeof input === "number") {
    // 转换为数字
    const ts = Number(input);

    if (!isNaN(ts)) {
      // 判断是秒级还是毫秒级时间戳
      date = new Date(ts < 1e11 ? ts * 1000 : ts);
    } else {
      // 尝试解析为日期字符串
      date = new Date(input);
    }
  } else if (input instanceof Date) {
    date = input;
  } else {
    throw new Error("Invalid input");
  }

  const pad = (n) => (n < 10 ? "0" + n : n);

  const replacements = {
    yyyy: date.getFullYear(),
    MM: pad(date.getMonth() + 1),
    dd: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  };

  return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (match) => replacements[match]);
}

function getTimeDiff(targetTime, currentTime = Date.now()) {
  const diffMs = Number(targetTime) - Number(currentTime); // 毫秒差值
  const diffSec = Math.floor(diffMs / 1000); // 秒
  const diffMin = (diffSec / 60).toFixed(2); // 分钟
  const diffHour = (diffSec / 3600).toFixed(2); // 小时

  return {
    ms: diffMs,
    sec: diffSec,
    min: diffMin,
    hour: diffHour,
    label: `${diffHour}h ${diffMin}m ${diffSec}s`,
  };
}

function getNextFundingTimestamp(intervalStr) {
  const now = Date.now(); // 当前时间戳，单位：毫秒

  // 解析 interval 字符串为小时数
  try {
    const match = intervalStr.match(/^(\d+)([hm])$/);
    // if (!match) throw new Error('Invalid interval format (e.g., "8h", "30m")');

    let [_, amount, unit] = match;
    amount = parseInt(amount);
    const intervalMs =
      unit === "h" ? amount * 60 * 60 * 1000 : amount * 60 * 1000;

    // 取整到下一个周期点
    const nextTimestamp = Math.ceil(now / intervalMs) * intervalMs;
    return {
      timestamp: nextTimestamp,
      nextFundingTimeFormat: formatTime(nextTimestamp, "HH:mm:ss"),
      iso: new Date(nextTimestamp).toISOString(),
    };
  } catch (error) {
    console.error("Error calculating next funding timestamp:", error.message);
    return {
      timestamp: now,
      nextFundingTimeFormat: formatTime(now, "HH:mm:ss"),
      iso: new Date(now).toISOString(),
    };
  }
}

async function fetchFundingRatesIndividuallyWithLimit(
  exchange,
  symbols,
  concurrency = 10
) {
  const limit = pLimit(concurrency);
  const results = {};
  const batchSize = 10; // Process symbols in smaller batches for better fault tolerance
  const symbolBatches = [];
  const maxRetries = 3;

  // Create smaller batches of symbols
  for (let i = 0; i < symbols.length; i += batchSize) {
    symbolBatches.push(symbols.slice(i, i + batchSize));
  }

  // Process batches concurrently with limit
  const tasks = symbolBatches.map((batch) =>
    limit(async () => {
      const batchPromises = batch.map(async (symbol) => {
        let retries = 0;
        while (retries < maxRetries) {
          try {
            const rate = await exchange.fetchFundingRate(symbol);
            results[symbol] = rate;
            return;
          } catch (err) {
            retries++;
            if (retries >= maxRetries) {
              console.warn(
                `[${exchange.id}] 获取 ${symbol} fundingRate 失败 (重试 ${retries}/${maxRetries}): ${err.message}`
              );
            } else {
              // Wait exponentially longer between retries
              await new Promise((resolve) =>
                setTimeout(resolve, 500 * Math.pow(2, retries - 1))
              );
            }
          }
        }
      });

      await Promise.allSettled(batchPromises);
    })
  );

  await Promise.allSettled(tasks);
  return results;
}


module.exports = {
  formatTime,
  getTimeDiff,
  getNextFundingTimestamp,
  fetchFundingRatesIndividuallyWithLimit
};
