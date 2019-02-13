module.exports = (web3) => {
    const { toBN } = web3.utils
    const mapToString = arr => arr.map(item => item.toString())

    return {
        toBN,
        mapToString,
    }
}
