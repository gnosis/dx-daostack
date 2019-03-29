module.exports = (web3) => {
    const { toBN } = web3.utils
    const mapToString = arr => arr.map(item => item.toString())

    const getTimestamp = async (block = 'latest') => {
        return (await web3.eth.getBlock(block)).timestamp
    }

    return {
        toBN,
        mapToString,
        getTimestamp
    }
}
