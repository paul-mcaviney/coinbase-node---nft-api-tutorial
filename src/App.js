import React, { useEffect, useState } from 'react';
import './App.css';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk'
import Web3 from 'web3';

const APP_NAME = 'coinbase-wallet-example';
const APP_LOGO_URL = './coinbase-logo.png';
const DEFAULT_ETH_JSONRPC_URL = 'https://ropsten.infura.io/v3/56f ... d69'; // Replace with your own Infura.io project
const DEFAULT_CHAIN_ID = 1; // 1=Ethereum (mainnet), 3=Ropsten, 5=Gorli
const DEFAULT_ETHEREUM_CHAIN_ID = '0x1'; // Should match DEFAULT_CHAIN_ID above, but with leading 0x

// Coinbase Credentials
const COINBASE_URL = {YOUR_API_ENDPOINT};
const USERNAME = {YOUR_USERNAME};
const PASSWORD = {YOUR_PASSWORD};


// Create the headers
const STRING = `${USERNAME}:${PASSWORD}`;
const BASE64STRING = Buffer.from(STRING).toString('base64');
const HEADERS = new Headers ({
  'Content-Type':'application/json',
  'Authorization':`Basic ${BASE64STRING}`
});

const App = () => {
  
  // React State Variables 
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [account, setAccount] = useState();
  const [walletSDKProvider, setWalletSDKProvider] = useState();
  const [web3, setWeb3] = useState();
  const [nftAddress, setNftAddress] = useState();
  const [ownedNFTs, setOwnedNFTs] = useState(0);
  const [nftContractName, setNftContractName] = useState();
  const [imageSource, setImageSource] = useState([]);
  const [displayNFTs, setDisplayNFTs] = useState(false);

  useEffect(() => {
    const coinbaseWallet = new CoinbaseWalletSDK({
      appName: APP_NAME,
      appLogoUrl: APP_LOGO_URL,
    });

    const walletSDKProvider = coinbaseWallet.makeWeb3Provider(
        DEFAULT_ETH_JSONRPC_URL,
        DEFAULT_CHAIN_ID
    );

    setWalletSDKProvider(walletSDKProvider);

    const web3 = new Web3(walletSDKProvider);
    setWeb3(web3);
  }, []);

  const checkIfWalletIsConnected = () => {
    if (!window.ethereum) {
      console.log(
          'No ethereum object found. Please install Coinbase Wallet extension or similar.'
      );

      web3.setProvider(walletSDKProvider.enable());

      return;
    }

    console.log('Found the ethereum object:', window.ethereum);

    connectWallet();
  };

  const connectWallet = async () => {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts.length) {
      console.log('No authorized account found');
      return;
    }

    if (accounts.length) {
      const account = accounts[0];
      console.log('Found an authorized account:', account);
      setAccount(account);

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: DEFAULT_ETHEREUM_CHAIN_ID }],
        });
        console.log('Successfully switched to Ropsten Network');
      } catch (error) {
        console.error(error);
      }
    }

    setIsWalletConnected(true);
  };

  // Function for getting the NFT Contract and NFT balance in connected account
  const getNftContract = async () => {
    setDisplayNFTs(false);

    const NFT_ADDRESS = document.querySelector('#nftContract').value;

    setNftAddress(NFT_ADDRESS);

    try {
      // Get NFT Contract Metadata
      let response = await fetch(COINBASE_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          'id':1,
          'jsonrpc':'2.0',
          'method':'coinbaseCloud_getTokenMetadata',
          'params': {
            'contract': NFT_ADDRESS,
            'blockchain':'Ethereum',
            'network':'Mainnet'
          }
        })     
      })

      let data = await response.json();

      setNftContractName(data.result.tokenMetadata.name);

      // Get NFT balance in account
      response = await fetch(COINBASE_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          'id':2,
          'jsonrpc':'2.0',
          'method':'coinbaseCloud_getBalances',
          'params': {
            'addressAndContractList': [
              {
                'address':account,
                'contract':NFT_ADDRESS
              }
            ],
            'blockchain':'Ethereum',
            'network':'Mainnet'
          }
        })
      })

      data = await response.json();

      let value = data.result.balances[0].tokenBalances[0].amount;
      value = web3.utils.hexToNumber(value);

      setOwnedNFTs(value);

    } catch (error) {
      console.error(error);
    }
    
  }

  // Add input fields based on how many NFTs the account owns
  const addFields = () => {

    return Array.from(
      { length: ownedNFTs },
      (_, i) => (
        <div key={`input-${i}`}>
          <input
            type='text'
            id={`input-${i}`}
          />
        </div>
      )
    );

  }

  
  const getImages = async () => {
    // Function for getting NFT image
    const nftIDs = [];
    const imageUrls = [];

    const newURLs = [];

    // Add users NFT IDs to the array from input fields
    for (let i = 0; i < ownedNFTs; i++) {
      nftIDs.push(document.querySelector(`#input-${i}`).value);
      imageUrls.push('https://mainnet.ethereum.coinbasecloud.net/api/nft/v2/contracts/' + nftAddress + '/tokens/' + (`${nftIDs[i]}`) + '?networkName=ethereum-mainnet');

      try {
        let response = await fetch(imageUrls[i], {
          method: 'GET',
          headers: HEADERS
        })

        let data = await response.json();
        let url = data.token.imageUrl.cachedPathSmall;

        newURLs.push(url);
        
      } catch (error) {
        console.log(error);
      }
    }

    setImageSource(newURLs);
    setDisplayNFTs(true);

}


return (
  <div className="App">
    <header className="App-header">
      <img src={APP_LOGO_URL} className="App-logo" alt="logo" />
      {isWalletConnected ? (
          <>
            <h4>Show your NFTs!</h4>
            <p>Connected Account: {account}</p>
            <p>Please enter an NFT contract</p>
            <div>
              <input 
                type='string'
                id='nftContract'
                defaultValue={'0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'}
              />
            </div>
            <br></br>
            <div>
              <button onClick={getNftContract}  id="getNfts" type="button">
                Check Contract
              </button>
              <br></br>
              {nftContractName &&
                <p>You have {ownedNFTs} NFTs in the {nftContractName} collection</p>
              }
              {!displayNFTs && ownedNFTs > 0 &&
                <div id='imageDiv'>
                  <p>Please enter your NFT IDs</p>
                  {addFields()}
                  <br></br>
                  <button onClick={getImages} id='getImages' type='button'>
                    Get NFTs  
                  </button> 
                  <br></br>           
                </div>
              }
              {displayNFTs && imageSource.map((image) => (
                <img key={image} src={image}/>
              ))}
            </div>
          </>
      ) : (
          <button onClick={checkIfWalletIsConnected} id="connect" type="button">
            Connect Wallet
          </button>
      )}
    </header>
  </div>
);
}


export default App;
