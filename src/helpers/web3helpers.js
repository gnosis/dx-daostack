module.exports = web3 => {
  function mineBlock() {
    return web3Send({
      method: 'evm_mine'
    })
  }

  function increaseTime(num) {
    if (num <= 0) {
      console.log('No need to increase time')
      return
    }
    return web3Send({
      method: 'evm_increaseTime', params: [num]
    })
  }

  async function increaseTimeAndMine(num) {
    if (num <= 0) {
      console.log('No need to increase time')
      return
    }
    return [
      await increaseTime(num),
      await mineBlock()
    ]
  }

  async function takeSnapshot() {
    return (await web3Send({
      method: 'evm_snapshot'
    })).result
  }

  function revertSnapshot(id) {
    return web3Send({
      method: 'evm_revert',
      params: [id]
    })
  }

  function web3Send(options) {
    return new Promise((resolve, reject) => web3.currentProvider.send(
      options, (err, res) => err ? reject(err) : resolve(res))
    )
  }

  async function getTimestamp(block = 'latest') {
    return (await web3.eth.getBlock(block)).timestamp
  }

  return {
    getTimestamp,
    web3Send,
    mineBlock,
    increaseTime,
    increaseTimeAndMine,
    takeSnapshot,
    revertSnapshot
  }
}
