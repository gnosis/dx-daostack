// batchExecute(cb, {batchSize: 2}, [1,2,3,4,5,6,7]) will return
// [cb([1,2]), cb([3,4]), cb([5,6]), cb([7])]

// batchExecute(cb, {batchSize: 3}, [1,2,3,4,5,6,7], ['a','b','c','d','e','f','g']) will return
// [cb([1,2,3], ['a','b', 'c']), cb([4,5,6], ['d','e','f']), cb([7], ['g'])]

const batchExecute = async (cb, {batchSize = Infinity, maxConcurrent = 1} = {}, ...argsArrays) => {
  let results = []
  let promises = []

  for (let i = 0, len = Math.max(...argsArrays.map(a => a.length)); i< len; i+=batchSize) {
      const args = argsArrays.map(a => a.slice(i, i + batchSize))
      try {
          const maybePromise = cb(...args)
          promises.push(maybePromise)

          if (promises.length >= maxConcurrent) {
            results = results.concat(await Promise.all(promises))
            promises = []
          }
      } catch(error) {
          results.push(error)
      }
  }

  if (promises.length) results = results.concat(await Promise.all(promises))
  return results
}

module.exports = batchExecute
