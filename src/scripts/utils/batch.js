// batchExecute(cb, {batchSize: 2}, [1,2,3,4,5,6,7]) will return
// [cb([1,2]), cb([3,4]), cb([5,6]), cb([7])]

// batchExecute(cb, {batchSize: 3}, [1,2,3,4,5,6,7], ['a','b','c','d','e','f','g']) will return
// [cb([1,2,3], ['a','b', 'c']), cb([4,5,6], ['d','e','f']), cb([7], ['g'])]

const batchExecute = async (cb, { batchSize = Infinity, maxConcurrent = 1, log } = {}, ...argsArrays) => {
  let results = []
  let promises = []

  for (let i = 0, len = Math.max(...argsArrays.map(a => a.length)); i < len; i += batchSize) {
    const args = argsArrays.map(a => a.slice(i, i + batchSize))
    try {
      if (log) {
        console.log(`Batch ${i + 1}-${Math.min(i + batchSize, len)} from ${len}`)
      }
      const maybePromise = cb(...args)
      promises.push(maybePromise)

      if (promises.length >= maxConcurrent) {
        if (log) console.log('Waiting on batches')
        try {
          results = results.concat(await Promise.all(promises))
        } finally {
          promises = []
        }
      }
    } catch (error) {
      console.log('error: ', error.message);
      results.push(error)
    }
  }

  if (promises.length) {
    try {
      if (log) {
        console.log('Waiting on batches')
      }
      results = results.concat(await Promise.all(promises))
    } catch (error) {
      results.push(error)
    }
  }
  return results
}

module.exports = batchExecute
