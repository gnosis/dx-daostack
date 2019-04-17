// bashExecute(cb, 2, [1,2,3,4,5,6,7]) will return
// [cb([1,2]), cb([3,4]), cb([5,6]), cb([7])]

// bashExecute(cb, 2, [1,2,3,4,5,6,7], ['a','b','c','d','e','f','g']) will return
// [cb([1,2], ['a','b']), cb([3,4], ['c','d']), cb([5,6], ['e','f']), cb([7], ['g'])]

const batchExecute = (cb, batchSize = Infinity, ...argsArrays) => {
  let results = []

  for (let i = 0, len = Math.max(...argsArrays.map(a => a.length)); i< len; i+=batchSize) {
      const args = argsArrays.map(a => a.slice(i, i + batchSize))
      try {
          const resultSlice = cb(...args)
          results.push(resultSlice)
      } catch(error) {
          results.push(error)
      }
  }
  return results
}

module.exports = batchExecute
