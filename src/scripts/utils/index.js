const rxjs = require('rxjs')
const rxjsOps = require('rxjs/operators')

const { from, defer, of, forkJoin, pipe, throwError, concat } = rxjs

const { map, toArray, bufferCount, tap, concatMap, scan, reduce, pluck, retry, timeout, concatAll, catchError } = rxjsOps

module.exports = (web3) => {
  const { toBN } = web3.utils
  const mapToString = arr => arr.map(item => item.toString())

  const getTimestamp = async (block = 'latest') => {
    return (await web3.eth.getBlock(block)).timestamp
  }

  const getBlockNumber = () => {
    return web3.eth.getBlockNumber()
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

  function parseEventLog({ returnValues }) {
    return Object.entries(returnValues).reduce((accum, [k, v]) => {
      if (Number.isNaN(+k)) accum[k] = v
      return accum
    }, {})
  }


  async function getPastEventsRx(contract, eventName, { log = true, fromBlock, toBlock, ...rest }) {
    log && console.group(`Fetching event ${eventName} from contract ${contract.constructor.contractName}`);
    const fetchEvents = ({ fromBlock, toBlock }) => {
      log && console.log(`Blocks ${fromBlock}--${toBlock}`)
      return contract.getPastEvents(eventName, {
        ...rest,
        fromBlock,
        toBlock
      })
    }

    const observe = ({ fromBlock, toBlock }) => {
      console.log('Observe');
      return defer(() => fetchEvents({ fromBlock, toBlock })).pipe(
        catchError(err => {
          if (!err.message.includes('query returned more than 1000 results')) {
            throwError(err)
          }

          log && console.warn(err.message)
          const middle = Math.round((fromBlock + toBlock) / 2)
          const nextStart = middle + 1

          // log && console.group(`Blocks ${fromBlock}--${middle}`)

          const firstHalfEvents = observe({ fromBlock, toBlock: middle })
          // log && console.groupEnd()

          let secondHalfEvents = []
          if (nextStart <= toBlock) {
            // log && console.group(`Blocks ${nextStart}--${toBlock}`)
            secondHalfEvents = observe({ fromBlock: nextStart, toBlock })
            // log && console.groupEnd()
          }

          return concat(firstHalfEvents, secondHalfEvents)
        })
      )
    }

    const result = await observe({fromBlock, toBlock}).pipe(
      reduce((accum, curr) => accum.concat(curr), []),
    ).toPromise()

    log && console.groupEnd()
    return result
  }

  async function getPastEventsBinary(contract, eventName, { log = true, fromBlock, toBlock, ...rest }) {
    log && console.log(`Fetching event ${eventName} from contract ${contract.constructor.contractName}`);
    let events
    try {
      events = await contract.getPastEvents(eventName, {
        ...rest,
        fromBlock,
        toBlock
      })
      log && console.log(`blocks ${fromBlock}--${toBlock} batch: `, events.map(parseEventLog));
    } catch (e) {
      if (e.message.includes('query returned more than 1000 results')) {
        log && console.warn(e.message)
        const middle = Math.round((fromBlock + toBlock) / 2)
        const nextStart = middle + 1

        log && console.group(`Blocks ${fromBlock}--${middle}`)

        const firstHalfEvents = await getPastEventsBinary(
          contract,
          eventName,
          {
            fromBlock,
            toBlock: middle,
            ...rest
          })
        log && console.groupEnd()

        let secondHalfEvents = []
        if (nextStart <= toBlock) {
          log && console.group(`Blocks ${nextStart}--${toBlock}`)
          secondHalfEvents = await getPastEventsBinary(
            contract,
            eventName,
            {
              fromBlock: nextStart,
              toBlock,
              options: rest
            })
          log && console.groupEnd()
        }


        events = [...firstHalfEvents, ...secondHalfEvents]
      } else {
        throw new Error(e)
      }
    }
    return events
  }

  async function getPastEvents(contract, eventName, { log = true, fromBlock = 0, toBlock, blockBatchSize = 30, ...rest } = {}) {
    if (!toBlock || toBlock === 'latest') ({ number: toBlock } = await web3.eth.getBlock('latest'));

    try {
      log && console.log(`Fetching event ${eventName} from contract ${contract.constructor.contractName}`);
      const results = await contract.getPastEvents(eventName, { fromBlock, toBlock, ...rest })
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
            return contract.getPastEvents(eventName, { fromBlock: i, toBlock: toBlockBatch, ...rest })
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
                return contract.getPastEvents(eventName, { fromBlock: i + blockBatchSize, toBlock, ...rest })
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
    getBlockNumber,
    parseEventLog,
    retry,
    getPastEvents,
    getPastEventsBinary,
    getPastEventsRx,
  }
}
