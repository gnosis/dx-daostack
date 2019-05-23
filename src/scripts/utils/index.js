module.exports = (web3) => {
    const { toBN } = web3.utils
    const mapToString = arr => arr.map(item => item.toString())

    const getTimestamp = async (block = 'latest') => {
        return (await web3.eth.getBlock(block)).timestamp
    }

    async function retry(cb, attempt = 1, maxAttempts = 10) {
        try {
          return await cb()
        } catch (e) {
          // const waitTime = attempt * attempt * WAIT_TIME
          // console.error(`\nError claiming MGN. Retrying in ${waitTime / 1000} seconds. ${maxAttempts - attempt} remaining attempts\n`)
          console.error(`\nError encountered. Retrying. ${maxAttempts - attempt} remaining attempts\n`)
      
          if (attempt >= maxAttempts) {
            console.log('Out of attempts')
            throw e
          } else {
            // await wait(waitTime)
            console.warn(e.message)
            return await retry(cb, attempt + 1, maxAttempts)
          }
        }
      }

    function parseEventLog({returnValues}) {
        return Object.entries(returnValues).reduce((accum, [k,v]) => {
          if(Number.isNaN(+k))accum[k]=v
          return accum
          },{})
      }

    async function getPastEvents(contract, eventName, { log = true, fromBlock = 0, toBlock, blockBatchSize = 30, ...rest} = {}) {
        if (!toBlock || toBlock === 'latest') ({number: toBlock} = await web3.eth.getBlock('latest'));
  
        try {
          log && console.log(`Fetching event ${eventName} from contract ${contract.constructor.contractName}`);
          const results = await contract.getPastEvents(eventName, { fromBlock, toBlock, ...rest})
          log && console.log('single batch: ', results.map(parseEventLog));
          return results
        } catch (error) {
          if (error.message.includes('query returned more than 1000 results')) {
            log && console.warn(error.message)
            log && console.log(`Will try getting events from ${blockBatchSize} blocks at a time`)
  
            const results = []
  
            let gotEvents = 0
  
            for (let i = fromBlock; i <= toBlock; i += blockBatchSize) {
              const toBlockBatch = Math.min(i + blockBatchSize - 1, toBlock)
              log && console.log(`\n  [Fetch event ${eventName} from block ${i} to ${toBlockBatch} from contract ${contract.constructor.contractName}]`)
              const batch = await retry(() => {
                return contract.getPastEvents(eventName, { fromBlock: i, toBlock: toBlockBatch, ...rest})
              })
              log && console.log('batch: ', batch.map(parseEventLog));
  
              results.push(...batch)
              gotEvents += batch.length
              if (gotEvents > 1000) {
                gotEvents = 0
                log && console.log('Got more than 1000 events. Trying fetching the rest in one bunch.');
                log && console.log(`\n  [Fetch event ${eventName} from block ${i + blockBatchSize} to ${toBlock} from contract ${contract.constructor.contractName}]`)
                try {
                  const batch = await retry(() => {
                    return contract.getPastEvents(eventName, { fromBlock: i + blockBatchSize, toBlock, ...rest})
                  })
                  log && console.log('batch: ', batch.map(parseEventLog));
      
                  results.push(...batch)
                  return results
                } catch (error) {
                  if (error.message.includes('query returned more than 1000 results')) {
                    log && console.warn(error.message)
                    log && console.log(`Continuing getting events from ${blockBatchSize} blocks at a time`)
                  }
                }
              }
              // await wait(WAIT_TIME)
            }
  
            return results
          }
  
          throw error
        }
      }

    return {
        toBN,
        mapToString,
        getTimestamp,
        parseEventLog,
        retry,
        getPastEvents
    }
}
