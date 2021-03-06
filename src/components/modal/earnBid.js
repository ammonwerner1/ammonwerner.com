import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { useRouter } from 'next/router'
import get from 'lodash/get'
import isNil from 'lodash/isNil'
import upperFirst from 'lodash/upperFirst'
import numeral from 'numeral'
import BN from 'bignumber.js'
import { ethers, BigNumber } from 'ethers'
import { useWeb3React } from '@web3-react/core'
import moment from 'moment'
import accounting from 'accounting-js'
import log from 'ololog'
import isNumber from 'lodash/isNumber'

import { abiEvmEarn } from '../../helpers/abi/evmEarn'
import { abiErc20 } from '../../helpers/abi/erc20'

import { closeModal, openModal } from '../../redux/action/global'

import SelectWallet from './selectWallet'
import Loader from '../loader'

function EarnBid (props) {
  const router = useRouter()
  const {
    currentAccount,
    currentNetwork,
    network,
    page,
    earnContract,
    closeModal
  } = props
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState(false)
  const [amountWei, setAmountWei] = useState(0)
  const [approved, setApproved] = useState(false)
  const [transactionPending, setTransactionPending] = useState(false)
  const { connector, library, chainId, account, activate, deactivate, active, error } = useWeb3React()
  const openModalWallet = () => {
    openModal({
      title: get(page, 'selectWallet', 'Select Wallet'),
      size: 'md',
      component: <SelectWallet />
    })
  }
  const checkIfWalletIsApproved = async () => {
    try {
      if (active) {
        const signer = library.getSigner()
        const contractBase = new ethers.Contract(earnContract.token, abiErc20, signer)
        const allowance = await contractBase.allowance(account, currentNetwork.contracts.earn)
        if (allowance > 0) {
          setApproved(true)
        } else {
          setApproved(false)
        }
      }
    } catch (error) {
      log.red(error)
    }
  }
  const approve = async () => {
    try {
      if (active) {
        const signer = library.getSigner()
        const tokenContract = new ethers.Contract(earnContract.token, abiErc20, signer)
        const approve = await tokenContract.approve(currentNetwork.contracts.earn, BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'))
        setTransactionPending(true)
        await approve.wait()
        setTransactionPending(false)
        setApproved(true)
      } else {
        log.red('Connect Wallet!')
      }
    } catch (error) {
      log.red(error)
    }
  }
  const updateAmountWei = async () => {
    const amountWei = BN(amount * (10 ** 18))
    setAmountWei(amountWei)
  }
  const makeOffer = async () => {
    const earnContractId = get(router, 'query.earnContractId', null).substring(2)
    if (!isNumber(earnContractId)) {}
    if (isNil(amount) || amount <= 0) {
      setAmountError(true)
    } else {
      setAmountError(false)
      try {
        if (active) {
          const signer = library.getSigner()
          const contractEarn = new ethers.Contract(get(currentNetwork, 'contracts.earn', ''), abiEvmEarn, signer)
          const makeOffer = await contractEarn.makeOffer(earnContractId, amountWei.toString())
          setTransactionPending(true)
          await makeOffer.wait()
          setTransactionPending(false)
          closeModal()
        } else {
          log.green('connect wallet!')
        }
      } catch (error) {
        log.red(error)
        return null
      }
    }
  }
  useEffect(() => {
    checkIfWalletIsApproved()
  }, [])
  return (
    <div>
      <div className='w-100 py-3'>
        <div className='row'>
          <div className='col-12'>
            <div className='form-group mb-0'>
              <div className='input-outer input-outer-title'>
                <div className='form-control'>{get(page, 'earnContractDetails', 'Contract Details')}</div>
              </div>
              <div className='input-outer'>
                <table className='table table-sm text-size-sm rounded mb-0'>
                  <tbody>
                    <tr>
                      <td>{get(page, 'earnCloseDate', 'Close Date')}</td>
                      <td>{moment.unix(Number(earnContract.startTime) + Number(earnContract.contractLength)).format('MM-DD-YYYY')}</td>
                    </tr>
                    <tr>
                      <td>{get(page, 'earnNetwork', 'Network')}</td>
                      <td><img src={`/networks/${router.query.network}.png`} className='img-icon mr-2' />{upperFirst(router.query.network)}</td>
                    </tr>
                    <tr>
                      <td colSpan={2}><strong>{get(page, 'earnValue', 'Contract Value')}</strong></td>
                    </tr>
                    <tr>
                      <td><img src={`/tokens/${earnContract.token}.png`} className='img-icon mr-2' />{earnContract.tokenBase.ticker}</td>
                      <td>{numeral(earnContract.baseRedemption).format('0,0')}</td>
                    </tr>
                    <tr>
                      <td><img src='/tokens/alta.png' className='img-icon mr-2' />ALTA</td>
                      <td>{numeral(earnContract.altaRedemption).format('0,0')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className='form-group mt-3 mb-0'>
              <div className='input-outer input-outer-title'>
                <div className='form-control'>{earnContract.tokenBase.ticker} {get(page, 'earnAmount', '')}</div>
              </div>
              <div
                className={`input-outer ${amountError && 'is-invalid'}`}
              >
                <input
                  className={`form-control form-control-lg ${amountError && 'is-invalid'}`}
                  id='inputAmount'
                  placeholder={`0 ${earnContract.tokenBase.ticker}`}
                  type='text'
                  value={amount}
                  onBlur={e => updateAmountWei()}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className='d-flex w-100 justify-content-end mt-5'>
          {transactionPending && <Loader />}
          {!active && !transactionPending && <button className='btn btn-pill btn-outline-primary btn-animate' onClick={openModalWallet}>{get(page, 'connectToWallet', 'Connect to Wallet')}</button>}
          {!approved && active && !transactionPending && <button className='btn btn-pill btn-outline-primary btn-animate' onClick={approve}>{get(page, 'stakeApprove', 'Approve')} {earnContract.tokenBase.ticker}</button>}
          {approved && active && !transactionPending && <button className='btn btn-pill btn-outline-primary btn-animate' onClick={makeOffer}>{get(page, 'earnMakeBid', 'Make Bid')}</button>}
        </div>
      </div>
    </div>
  )
}

const mapStateToProps = state => ({
  currentAccount: state.global.currentAccount,
  currentNetwork: state.global.currentNetwork,
  network: state.global.network
})

const mapDispatchToProps = dispatch => ({
  openModal: (modal) => dispatch(openModal(modal)),
  closeModal: () => dispatch(closeModal())
})

export default connect(mapStateToProps, mapDispatchToProps)(EarnBid)
