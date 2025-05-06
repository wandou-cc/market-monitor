async function safeFetchTickers(exchange, symbols, type) {
  if (!symbols || symbols.length === 0) return {};

  try {
    const raw = {};
    const batchSize = 400;

    const symbolBatches = [];
    for (let i = 0; i < symbols.length; i += batchSize) {
      symbolBatches.push(symbols.slice(i, i + batchSize));
    }

    const results = await Promise.allSettled(
      symbolBatches.map((batch) => exchange.fetchTickers(batch))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        Object.assign(raw, result.value);
      } else {
        console.error("Batch failed:", result.reason);
      }
    }

    if (typeof raw !== "object" || raw === null) {
      throw new Error(`[${exchange.id}][${type}] fetchTickers 返回异常格式`);
    }

    const filtered = {};

    for (const [symbol, ticker] of Object.entries(raw)) {
      if (!ticker || typeof ticker !== "object") continue;
      if (ticker.last === undefined || ticker.last === 0) continue;
      // if (!symbol.endsWith('/USDT')) continue;  // 只要USDT交易对

      filtered[symbol] = ticker;
    }

    return filtered;
  } catch (err) {
    console.error(
      `[${exchange.id}][${type}] fetchTickers 出错: ${err.message}`
    );
    return {};
  }
}

module.exports = { safeFetchTickers };
