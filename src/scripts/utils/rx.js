const rxjs = require('rxjs')
const rxjsOps = require('rxjs/operators')

const { from, defer, of, forkJoin, pipe } = rxjs

const { map, bufferCount, tap, concatMap, scan, reduce, pluck, retry, timeout, concatAll, catchError } = rxjsOps

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

async function getBalances(web3, accs, options) {
  // TODO: batch and flat-map
  // const balArrs = await batchExecute(accsSlice => {
  //   return Promise.all(accsSlice.map(acc => web3.eth.getBalance(acc)))
  // }, { ...options, log: options && options.batchSize < accs.length }, accs)

  // const balances = [].concat(...balArrs)

  // const balances = await Promise.all(accs.map(acc => web3.eth.getBalance(acc)))
  // console.log('balances: ', balances);

  const getBalanceReq = acc => web3.eth.getBalance.request(acc, () => { })
  const makeBatch = accs => {
    const batch = new web3.BatchRequest()
    accs.forEach(acc => batch.add(getBalanceReq(acc)))
    return batch
  }

  const { from, defer, of, forkJoin } = rxjs

  const { map, bufferCount, tap, concatMap, scan, reduce, pluck, retry, timeout, concatAll } = rxjsOps

  const tapIndex = cb => source => defer(() => {
    let index = 0
    let from = 0
    let to = 0


    return source.pipe(tap(arr => {
      from = to + 1
      to = from + arr.length - 1
      cb({ from, to, ind: index++, value: arr })
    }))
  })
  const tapIndexTotal = (cb) => {
    let index = 0
    let from = 0
    let to = 0
    let total = 0


    return tap(arr => {
      from = to + 1
      to = from + arr.length - 1
      total += arr.length
      cb({ from, to, ind: index++, value: arr, total })
    })

  }

  const trackBatches = tapIndexTotal(
    ({ from, to }) => console.log(`batch ${from}--${to} from ${accs.length}`),
  )

  const indexBatch = () => scan((accum, accs, ind) => {
    const from = accum.to + 1
    const to = from + accs.length - 1
    return { from, to, accs, ind }
  }, { from: 0, to: 0, accs: [] })

  const processSlice = slice => {
    console.log('Start OW');
    return of(slice).pipe(
      trackBatches,
      map(makeBatch),
      concatMap(batch => {
        console.log('Start bo');
        // const prom = batch.execute()
        // console.log('prom: ', prom, Object.getOwnPropertyNames(prom), Object.getOwnPropertyNames(Object.getPrototypeOf(prom)));
        return defer(() => batch.execute()).pipe(
          // stop waiting and retry if past * ms
          timeout(10000),
          tap(
            () => console.log('Batch resolved'),
            e => console.log('Batch errored', e.message)
          ),
          retry(15)
        )
      }),

    )
    // console.log('slice: ', slice);
    // const batch = makeBatch(slice)
    // // console.log('batch: ', batch);
    // const prom = batch.execute()
    // console.log('prom: ', prom, Object.getOwnPropertyNames(prom), Object.getOwnPropertyNames(Object.getPrototypeOf(prom)));
    // return from(prom).pipe(
    //   tap(() => console.log('Batch resolved'), e => console.log('Batch errored', e.message)),
    // )
  }

  console.log('options.maxConcurrent: ', options.maxConcurrent);
  const acc2bal = await rxjs.from(accs).pipe(
    bufferCount(options.batchSize),
    bufferCount(options.maxConcurrent),
    // starts #maxConcurrent at a time
    concatMap(arrOfSlices => forkJoin(arrOfSlices.map(processSlice))),
    concatAll(),
    // tap(console.log),
    // concatMap(processSlice),
    pluck('response'),
    // tap(v => console.log('Balances', v)),
    reduce((accum, curr) => accum.concat(curr), []),
    tap(balances => console.log('total accs processed', balances.length)),
    map(bals => bals.reduce((accum, bal, i) => {
      const { withBalance, withoutBalance } = accum
      if (bal > 0) withBalance[accs[i]] = bal
      else withoutBalance.push(accs[i])
      return accum
    }, { withBalance: {}, withoutBalance: [] }))
  ).toPromise()

  console.log('withBalance: ', Object.keys(acc2bal.withBalance).length);
  console.log('withoutBalance: ', acc2bal.withoutBalance.length);

  return acc2bal

  // return accs.reduce((accum, acc, i) => {
  //   const bal = balances[i]
  //   if (bal > 0) accum[acc] = bal
  //   return accum
  // }, {})
}
