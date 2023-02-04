import { Request, Response, NextFunction } from "express";
import "dotenv/config";
// Uniswap and Web3 modules
import { ethers } from "ethers";
import { FeeAmount, Pool, Route, Trade } from "@uniswap/v3-sdk/";
import { Pair } from "@uniswap/v2-sdk/";
import { TradeType, Token, CurrencyAmount, Percent } from "@uniswap/sdk-core";
import {
  AlphaRouter,
  LegacyRouter,
  SwapRoute,
} from "@uniswap/smart-order-router";
import { Protocol } from "@uniswap/router-sdk";

const ERC20_ABI = [
  "function approve(address _spender, uint256 _value) public returns (bool success)",
  "function balanceOf(address _owner) public view returns (uint256 balance)",
  "function allowance(address _owner, address _spender) public view returns (uint256 remaining)",
  "function name() public view returns (string)",
  "function symbol() public view returns(string)",
  "function decimals() public view returns(uint8)",
  "function totalSupply() public view returns(uint256)",
  "function transfer(address _to, uint256 _value) public returns(bool success)",
  "function transferFrom(address _from, address _to, uint256 _value) public returns(bool success)",
];

function getPathStr(tokens: Token[]): string {
  return tokens.map((el) => el.symbol).join(",");
}

async function get_tokenroutes(
  tokenInAddr: string,
  tokenOutAddr: string,
  amount: string,
  chainId: number
) {
  let route_list = [];
  const walletAddress = "0xa0a17E374191e7342726f3a702732F68A56af3Ab"; // WETH addr
  // const { API_URL, PRIVATE_KEY } = process.env;
  var API_URL_map = new Map();
  API_URL_map.set(1, "https://eth.llamarpc.com");
  API_URL_map.set(10, "https://mainnet.optimism.io/");
  API_URL_map.set(42161, "https://arb1.arbitrum.io/rpc");
  API_URL_map.set(137, "https://rpc-mainnet.matic.network");
  const API_URL = API_URL_map.get(chainId);
  console.log(`API_URL: ${API_URL}, ChainID: ${chainId}`);
  const provider = new ethers.providers.JsonRpcProvider(API_URL, chainId);
  const getToken = async function (contract: ethers.Contract): Promise<Token> {
    var [dec, symbol, name] = await Promise.all([
      contract.decimals(),
      contract.symbol(),
      contract.name(),
    ]);

    return new Token(
      <number>(<any>chainId),
      contract.address,
      dec,
      symbol,
      name
    );
  };
  const width = 6;
  const [tokenIn, tokenOut] = await Promise.all([
    getToken(new ethers.Contract(tokenInAddr, ERC20_ABI, provider)),
    getToken(new ethers.Contract(tokenOutAddr, ERC20_ABI, provider)),
  ]);

  console.log(
    `${amount} ${tokenIn.symbol?.padStart(
      width,
      " "
    )} --> ${tokenOut.symbol?.padStart(width, " ")}:`
  );

  const amountIn = ethers.utils.parseUnits(amount, tokenIn.decimals);
  const inAmount = CurrencyAmount.fromRawAmount(tokenIn, amountIn.toString());

  const router = new AlphaRouter({
    chainId: tokenIn.chainId,
    provider: provider,
  });
  let route = await router.route(
    inAmount,
    tokenOut,
    TradeType.EXACT_INPUT,
    {
      recipient: walletAddress,
      slippageTolerance: new Percent(5, 100),
      deadline: Math.floor(Date.now() / 1000 + 1800),
    }
    //{ protocols: [Protocol.V2] }
  );
  if (route) {
    let route_map = new Map<string, string>();
    for (let r of route.route) {
      route_map.set("protocol", r.protocol);
      route_map.set("tokenpath", getPathStr(r.tokenPath));
      route_map.set("gas_price", r.gasCostInUSD.toFixed(4));
    }
    for (let swap of route.trade.swaps) {
      const inp = parseFloat(swap.inputAmount.toFixed());
      const out = parseFloat(swap.outputAmount.toFixed());
      const rate = (out / inp).toFixed(5);
      route_map.set("inputamount", <string>(<unknown>inp));
      route_map.set("outputamount", <string>(<unknown>out));
      route_map.set("rate", rate);
    }
    var n = 1;
    for (var i = 0; i < route.trade.routes.length; i++) {
      var tr = route.trade.routes[i];
      console.log(`   route ${n++}:`);
      for (var j = 0; j < tr.pools.length; j++) {
        const isPool = (tr.pools[j] as Pool).fee;
        const pair = tr.pools[j];
        var fee: FeeAmount = 3000;

        var v3Info = "";
        var addr = "";
        if (isPool) {
          var pool: Pool = tr.pools[j] as Pool;
          v3Info = `liq=${pool.liquidity} tickCur=${pool.tickCurrent}`;
          fee = pool.fee;
          addr = Pool.getAddress(tr.path[j], tr.path[j + 1], fee);
        } else {
          addr = Pair.getAddress(tr.path[j], tr.path[j + 1]);
        }
        route_map.set("pool_fee", <string>(<unknown>fee));
        route_map.set("token0Price", pair.token0Price.toSignificant());
        route_map.set("token0Price", pair.token1Price.toSignificant());
        route_map.set("price_output", route.quote.toFixed(6));
        console.log(
          `       ${isPool ? "V3" : "V2"}: ${tr.path[j].symbol}-${
            tr.path[j + 1].symbol
          } (${addr}): tok0pr=${pair.token0Price.toSignificant()} tok1pr=${pair.token1Price.toSignificant()} fee=${fee} ${v3Info}`
        );
      }
    }
    const route_details = Object.fromEntries(route_map);
    route_list.push({ fullroute: route, details: route_details });
  }

  var route3 = await router.route(
    inAmount,
    tokenOut,
    TradeType.EXACT_INPUT,
    {
      recipient: walletAddress,
      slippageTolerance: new Percent(5, 100),
      deadline: Math.floor(Date.now() / 1000 + 1800),
    },
    { protocols: [Protocol.V2], maxSplits: 1, maxSwapsPerPath: 1 }
  );
  if (route3) {
    let route_map = new Map<string, string>();
    for (let r of route3.route) {
      route_map.set("protocol", r.protocol);
      route_map.set("tokenpath", getPathStr(r.tokenPath));
      route_map.set("gas_price", r.gasCostInUSD.toFixed(4));
    }
    for (let swap of route3.trade.swaps) {
      const inp = parseFloat(swap.inputAmount.toFixed());
      const out = parseFloat(swap.outputAmount.toFixed());
      const rate = (out / inp).toFixed(6);
      route_map.set("inputamount", <string>(<unknown>inp));
      route_map.set("outputamount", <string>(<unknown>out));
      route_map.set("rate", rate);
    }
    var n = 1;
    for (var i = 0; i < route3.trade.routes.length; i++) {
      var tr = route3.trade.routes[i];
      console.log(`   route ${n++}:`);
      for (var j = 0; j < tr.pools.length; j++) {
        const isPool = (tr.pools[j] as Pool).fee;
        const pair = tr.pools[j];
        var fee: FeeAmount = 3000;

        var v3Info = "";
        var addr = "";
        if (isPool) {
          var pool: Pool = tr.pools[j] as Pool;
          v3Info = `liq=${pool.liquidity} tickCur=${pool.tickCurrent}`;
          fee = pool.fee;
          addr = Pool.getAddress(tr.path[j], tr.path[j + 1], fee);
        } else {
          addr = Pair.getAddress(tr.path[j], tr.path[j + 1]);
        }
        route_map.set("pool_fee", <string>(<unknown>fee));
        route_map.set("token0Price", pair.token0Price.toSignificant());
        route_map.set("token0Price", pair.token1Price.toSignificant());
        route_map.set("price_output", route3.quote.toFixed(6));
        console.log(route_map);
        console.log(
          `       ${isPool ? "V3" : "V2"}: ${tr.path[j].symbol}-${
            tr.path[j + 1].symbol
          } (${addr}): tok0pr=${pair.token0Price.toSignificant()} tok1pr=${pair.token1Price.toSignificant()} fee=${fee} ${v3Info}`
        );
      }
    }
    const route_details = Object.fromEntries(route_map);
    route_list.push({ fullroute: route3, details: route_details });
  }
  return route_list;
}

// getting Routes
const getRoutes = async (req: Request, res: Response, next: NextFunction) => {
  // get the token data from the req
  let tokenInAddr: string = req.params.inputToken;
  let tokenOutAddr: string = req.params.outputToken;
  let amount: string = req.params.amount;
  let chainId: number = parseInt(req.params.chainId);
  console.log(tokenInAddr, tokenOutAddr, amount, chainId);
  try {
    let route_list = await get_tokenroutes(
      tokenInAddr,
      tokenOutAddr,
      amount,
      chainId
    );
    return res.status(200).json({
      routes: route_list,
    });
  } catch (e: unknown) {
    console.log(e);
    let route_list = "NoRoutesFound";
    return res.status(200).json({
      routes: route_list,
    });
  }
};

const welcome_message = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return res.status(200).json({
    Welcome:
      "Welcome to the Uniswap Quoting System. Use the following URL format to Request a route Base_URL/tokens/chainid/inputContract/outputContract/amountOut",
  });
};

export default { getRoutes, welcome_message };
