# 资金费率

## 结算周期

**Binance**: `nextFundingTimeFormat` 下一次结算周期

**Bitget**: [Bitget查询资金费单币不能批量](https://www.bitget.com/zh-CN/api-doc/contract/market/Get-Symbol-Next-Funding-Time)

**bybit**: `nextFundingTimeFormat` 下一次结算周期

**gate**: `interval` 需要根据进行计算下一次结算周期

## markets 一些字段说明

`fundingRate`: 当前的资金费率是多少  
`fundingRateFormat`: 当前的资金费率格式化%  
`nextFundingTime`: 下一次资金费率更新时间时间戳  
`nextFundingTimeFormat`: 下一次资金费率更新时间格式化  
`diffMs`: 当前时间距离下一次资金费率结算还有多久  
`timeFormat`: 当前时间格式化结果  
`currentTime`: 当前时间  

- `bybit`比较特殊下一次的结算时间需要单独查询 非常影响性能
  