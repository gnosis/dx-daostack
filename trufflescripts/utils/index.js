module.exports = (web3) => {
    const { toBN } = web3.utils
    const mapToString = arr => arr.map(item => item.toString())

    const getTime = (blockNumber = 'latest') => web3.eth.getBlock(blockNumber).timestamp

    const mineCurrentBlock = () => web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        params: [],
        id: new Date().getSeconds(),
    }, (err, res) => {
        if (!err) {
            console.log(res)
        } else {
            console.error(err)
        }
    })

    const increaseTimeBy = (seconds, dontMine) => {
        if (seconds < 0) {
            throw new Error('Can\'t decrease time in testrpc')
        }

        if (seconds === 0) return

        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [seconds],
            id: new Date().getSeconds(),
        }, (err, res) => {
            if (!err) {
                console.log(res)
                if (!dontMine) {
                    mineCurrentBlock()
                }
            } else {
                console.error(err)
            }
        })
    }

    const setTime = (seconds, dontMine) => {
        const increaseBy = seconds - getTime()

        increaseTimeBy(increaseBy, dontMine)
    }

    const makeSnapshot = () => web3.currentProvider.send({ jsonrpc: '2.0', method: 'evm_snapshot' }).result

    const revertSnapshot = snapshotID => new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({ jsonrpc: '2.0', method: 'evm_revert', params: [snapshotID] }, (err) => {
        if (!err) {
            console.log('Revert Success')
            resolve(snapshotID)
        } else {
            reject(err)
        }
        })
    })

    return {
        toBN,
        mapToString,
        setTime,
        makeSnapshot,
        revertSnapshot,
    }
}
