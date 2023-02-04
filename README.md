
# Tamali Router 

This runs a Rest API which will output the best known Uniswap Route for a given pair. 



## API Reference

#### Get top output route

```http
  GET /tokens/${chainid}/${inputContract}/${outputContract}/${amountOut}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `chainid`      | `string` | **Required**. ID of Chain to Search, Must be supported by Uniswap |
| `inputContract`      | `string` | **Required**. Input Token Contract |
| `outputContract`      | `string` | **Required**. Output Token Contract |
| `amountOut`      | `string` | **Required**. Amount of tokens you want from the outputContract|


## Run Locally

Clone the project

```bash
  git clone https://github.com/TossAyeCoin/Tamali_Router.git
```

Go to the project directory

```bash
  cd Tamali_Router
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm run start
```

If you haven't tried bun and are on a linux/MacOS platform. This works very well with Bun.  

## Usage/Examples

Example (Price of SHIB in USDT): /tokens/1/0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/1


## Features

- Pull best token quote and route on Uniswap
- Slippage Adjustments
- Multi-chain
Chains Supported (Adding more is simple enough to add the RPC and chain ID to the API_URL_map):


| ChainID | RPC Used     |
| :-------- | :------- |
| 1 | `https://eth.llamarpc.com` |
| 10 | `https://mainnet.optimism.io/` |
| 42161 | `https://arb1.arbitrum.io/rpc` |
| 137 | `https://rpc-mainnet.matic.network` |

