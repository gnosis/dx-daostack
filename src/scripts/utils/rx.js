const rxjs = require('rxjs')
const rxjsOps = require('rxjs/operators')

const { from, defer, of, forkJoin, pipe } = rxjs

const { map, bufferCount, tap, concatMap, reduce, pluck, retry, timeout, concatAll, catchError } = rxjsOps

const passThrough = o => o;

function streamline(array, {
  batchSize = 1,
  maxConcurrent = 1,
  processSlice,
  preprocess = passThrough,
  postprocess = passThrough,
} = {}) {
  return from(array).pipe(
    preprocess,
    bufferCount(batchSize),
    bufferCount(maxConcurrent),
    // starts #maxConcurrent at a time
    concatMap(arrOfSlices => forkJoin(arrOfSlices.map(processSlice))),
    concatAll(),
    // tap(console.log),
    // pluck('response'),
    // tap(v => console.log('Balances', v)),
    // reduce((accum, curr) => accum.concat(curr), []),
    // tap(balances => console.log('total accs processed', balances.length)),
    postprocess,
    // map(bals => bals.reduce((accum, bal, i) => {
    //   const { withBalance, withoutBalance } = accum
    //   if (bal > 0) withBalance[array[i]] = bal
    //   else withoutBalance.push(array[i])
    //   return accum
    // }, { withBalance: {}, withoutBalance: [] }))
  ).toPromise()
}

// streamline([], { processSlice, postprocess: postprocessBatchRequest })

const flattenArray = reduce((accum, curr) => accum.concat(curr), [])

const postprocessBatchRequest = pipe(
  pluck('response'),
  // tap(v => console.log('Balances', v)),
  flattenArray,
)


function makeProcessSlice({
  makeBatch,
  // max int32
  timeout: to = 2**31-1,
  retry: rt = 0,
  preprocess = passThrough,
  postprocess = passThrough,
  log = true,
}) {
  return slice => of(slice).pipe(
    preprocess,
    map(makeBatch),
    concatMap(batch => {
      // console.log('Start ba');
      // const prom = batch.execute()
      // console.log('prom: ', prom, Object.getOwnPropertyNames(prom), Object.getOwnPropertyNames(Object.getPrototypeOf(prom)));
      return defer(() => {
        log && console.log(`Batch ${batch.name || ''} started`)
        const prom = batch.execute()
        // prom.then(r => console.log('Resolved', r), e => console.log('Error', e.message))
        return prom
      }).pipe(
        // stop waiting and retry if past * ms
        timeout(to),
        tap(
          () => log && console.log(`Batch ${batch.name || ''} resolved`),
          e => console.warn(`Batch ${batch.name || ''} errored, ${e.message}`)
        ),
        retry(rt)
      )
    }),
    postprocess,
    catchError(err => of({
      response: slice.map(() => err.message)
    })),
  )
}

function makeBatchNumberTracker() {
  let index = 0
  let from = 0
  let to = 0
  let total = 0


  return arr => {
    const length = Array.isArray(arr) ? arr.length : 1
    from = to + 1
    to = from + length - 1
    total += length
    return { from, to, index: index++, value: arr, total }
  }
}

module.exports = {
  streamline,
  postprocessBatchRequest,
  makeProcessSlice,
  makeBatchNumberTracker,
  flattenArray,
}
