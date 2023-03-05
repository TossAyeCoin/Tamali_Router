#Tamali Arb Demo
# This script is meant to show what could be possible with Arbitage on Uniswap V3.
# This is by no means complete and is meant to be a demo of what could be possible.
from itertools import permutations,combinations,combinations_with_replacement 
import pandas as pd
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
import warnings
warnings.filterwarnings('ignore')
import requests
from web3 import Web3
import json
import os
from requests import Request, Session
from requests.exceptions import ConnectionError, Timeout, TooManyRedirects
import time
import multiprocessing
from multiprocessing import Process, Pool
import random
#Calls Tamali Router to pull token info. Requires Tamali router running on port 6060 or change URL to API
def get_uni_token(chainid,input,output,amountin):
    try:
        url  = f"http://localhost:6060/tokens/{chainid}/{input}/{output}/{amountin}"
        response = requests.get(url)
        return response.json()
    except Exception as e:
        print(e)
        return None

#Gets all token list from Rango API, Mostly good list of tokens. Few Spam
def getalltokens():
    url = 'https://api.rango.exchange/meta?apiKey=c6381a79-2817-4602-83bf-6a641a409e32'
    headers = {
        'content-type': 'application/json;charset=UTF-8'
    }
    response = requests.get(url, headers=headers)
    return response.json()

#Gets token pair routes and pricing
def get_pair_output(token):
    swap_tracker = []
    #check for any NULL addresses (Rango API returns native chain coins in NONE format)
    if (token[0]['address'] ==None) or (token[1]['address'] == None):
        return None
    #call Tamali to get Uniswap routes. Hard coded chain ID of 10 for Optimism. Can be any chain uniswap/tamali router supports. 
    route1 = get_uni_token(10,token[0]['address'],token[1]['address'],amountin)
    #try to calculate route amount and path, if unavalible then fail and return
    try:
        amountout1 = pd.json_normalize(pd.DataFrame(route1).iloc[0]['routes'])['details.outputamount'].iloc[0]
        route1_simple = pd.json_normalize(pd.DataFrame(route1).iloc[0]['routes'])['details.tokenpath'].iloc[0]
        # print(f"Route: {route2} | Amount Out: {amountout}")
        swap_tracker.append(route1)
    except Exception:
        print("No Route Found")
        return None
    #second route, swap back to original token with output from route1 
    route2 = get_uni_token(10,token[1]['address'],token[0]['address'],amountout1)
    try:
        amountout2 = pd.json_normalize(pd.DataFrame(route2).iloc[0]['routes'])['details.outputamount'].iloc[0]
        route2_simple = pd.json_normalize(pd.DataFrame(route2).iloc[0]['routes'])['details.tokenpath'].iloc[0]
        # print(f"Route: {route2} | Amount Out: {amountout}")
        swap_tracker.append(route2)
    except Exception:
        print("No Route Found")
        return None
    #get profit. Missing Gas Calculations. KEEP THIS IN MIND
    profit =  amountout2 - amountin
    if(amountout2 > amountin):
        print(f"Profitable | Base Token: {route1_simple.split(',')[0]}| Route1: {route1_simple} | Route2: {route2_simple} | Profit: {profit}")
    else:
        print(f"No Profit | Base Token: {route1_simple.split(',')[0]} | Route1: {route1_simple} | Route2: {route2_simple} | Profit: {profit}")
    return swap_tracker


#process lopper for Multiprocessing token paths.
# If you have a good non-public node, you can set that process count to as much as your PC can handle. It is mainly dependent on RPC throughput.
def process_token_simple(token):
    swap_outputs = []
    with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
        results = pool.map(get_pair_output, token)
        for result in results:
            if result:
                swap_outputs.append(result)
    return swap_outputs


if __name__ == "__main__":
    #getting token list
    token_list = getalltokens()
    #Putting tokens in DF
    token_list_df = pd.DataFrame(pd.json_normalize(token_list)['tokens'].iloc[0])
    #thinning out list and selecting only blockchains that you want to look at. 
    token_list_thin_df = token_list_df[['blockchain', 'symbol', 'address', 'usdPrice']]
    token_list_thin_chain_df = token_list_thin_df[token_list_thin_df['blockchain'] == "OPTIMISM"]
    token_list_thin_chain_df.reset_index(drop=True, inplace=True)
    #get unique tokens list
    uniqueTokens = list(token_list_thin_chain_df['symbol'].unique())
    token_chainlist_dict = token_list_thin_chain_df.to_dict("records")
    #set amount of an Input for each token
    amountin = 170
    # Create pairs list of combinations of all tokens for inputs
    all_pair_combos = list(combinations(token_chainlist_dict, 2))
    #trigger multiprocessing swapper
    swap_outputs = process_token_simple(all_pair_combos)
