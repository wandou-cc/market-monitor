const ccxt = require('ccxt');

function createExchange(id,cexOptions) {
  const options = {
    enableRateLimit: true,
    ...cexOptions
  };

  if (process.env.USE_PROXY === 'true') {
    options.httpsProxy = process.env.PROXY_URL;
    console.log(`[代理已启用][${id}] 所有请求将通过 ${process.env.PROXY_URL}`);
  }

  const exchangeClass = ccxt[id];
  if (!exchangeClass) {
    throw new Error(`Exchange ${id} not supported by CCXT`);
  }

  return new exchangeClass(options);
}

module.exports = { createExchange };
