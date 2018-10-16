// essentially facilitates the following process
// e.g. for DxToken.mint(acc, num)
// dxWeb3 = new web3.eth.Contract(DxToken.abi, DxToken.address, DxToken.defaults())
// promise = ...resolved in callback
// request = dxWeb3.methods.mint(acc, num).send.request(options, callback)
// batch = new web3.BatchRequest()
// batch.add(request)
// batch.execute()
// await promise

/**
 * @typedef {string} txHash - transaction hash
 */
/**
 * @typedef {Object} TruffleArtifact - truffle contract artifact
 */
/**
 * @typedef {Object} TruffleContract - deployed truffle contract instance
 */
/**
 * @typedef {Object} Web3Contract - web3 contract instance
 */

/**
 * @typedef {Object} Construct - declaratively specifies how to construct a web3 request
 * @prop {TruffleArtifact} artifact - truffle contract artifact
 * @prop {TruffleContract=} instance - deployed truffle contract instance
 * @prop {string} method - method to call on the instance
 * @prop {*[]=} args - arguments to supply to the method
 * @prop {TxOptions=} txOptions - transaction options
 */

/**
 * @typedef {Object} TxOptions - transaction options
 * @prop {string=} from
 * @prop {string=} to
 * @prop {string=} gas
 * @prop {string=} gasPrice
 * @prop {string=} value
 * @prop {string=} data
 */

/**
 * @typedef {Object} Request - modified request
 * @prop {Object} request - request made by web3
 * @prop {Promise<txHash>} mined - promise resolved when the request is mined
 */

/**
 * @typedef {Object} Batch - batch containing requests
 * @prop {Request => void} add - function that adds more Requests to the batch
 * @prop {() => Promise<txHash[]]>} execute - function that executes requests
 */

/**
 * @callback BatchConstructor - makes a batch from Request objects
 * @param {Request[]} requestObjects - request objects to add to the batch
 * @returns {Batch} batch - used to execute all the requests
 */

/**
* @callback RequestConstructor - makes a promise-enhanced request from tx object
* @param {Object} web3TxObject - object made with Contract.methods.method()
* @param {TxOptions=} txOptions - your standard tx options
* @returns {Request} request - modified request with promise resolving on mining
*/

/**
 * @callback Web3ContractConstructor - makes a web3 contract instance out of truffle contract
 * @param {TruffleArtifact} artifact - truffle contract artifact
 * @param {TruffleContract=} instance - deployed truffle contract instance
 * @returns {Promise<Web3Contract>} web3Contract - web3 contract instance
 */

/**
  * @callback TxBatcher - makes a ready-to-execute Batch from Constructs
  * @param {Construct[]} constructs - constructs to make requests out of
  * @returns {Promise<txHash[]>} hashes - transaction hashes after they are mined
  */

/**
 * @typedef {Object} BatcherHelperFunctions
 * @prop {Web3ContractConstructor} constructWeb3Contract
 * @prop {RequestConstructor} constructRequest
 * @prop {BatchConstructor} constructBatch
*/

/**
 * constructs a batcher using provided web3 instance
 * @param {Object} web3 - web3 instance
 * @returns {TxBatcher & BatcherHelperFunctions}
 */
module.exports = function (web3) {
  /** @type {TxBatcher} */
  async function batchTx (constructs) {
    const web3Instances = await Promise.all(
      constructs.map(({ artifact, instance }) => constructWeb3Contract(artifact, instance))
    )

    const requests = web3Instances.map((instance, i) => {
      const { method, args = [], txOptions } = constructs[i]
      const txObj = instance.methods[method](...args)
      const req = constructRequest(txObj, txOptions)

      return req
    })

    const batch = constructBatch(requests)

    return batch.execute()
  }

  /** @type {Web3ContractConstructor} */
  async function constructWeb3Contract (artifact, instance) {
    if (!instance) instance = await artifact.deployed()
    return new web3.eth.Contract(artifact.abi, instance.address, artifact.defaults())
  }

  /** @type {RequestConstructor} */
  function constructRequest (web3TxObject, txOptions = {}) {
    let request
    const mined = new Promise((resolve, reject) => {
      request = web3TxObject.send.request(
        txOptions, (err, txhash) => err ? reject(err) : resolve(txhash)
      )
    })

    return { request, mined }
  }

  /** @type {BatchConstructor} */
  function constructBatch (requestObjects) {
    const batch = new web3.BatchRequest()
    const minedProms = []
    for (const { request, mined } of requestObjects) {
      batch.add(request)
      minedProms.push(mined)
    }

    return {
      add: ({ request, mined }) => {
        minedProms.push(mined)
        batch.add(request)
      },
      execute: () => (batch.execute(), Promise.all(minedProms))
    }
  }

  return Object.assign(batchTx, {
    constructWeb3Contract,
    constructRequest,
    constructBatch
  })
}
