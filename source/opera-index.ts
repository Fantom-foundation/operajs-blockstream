/**
 * An example to produce a block stream of Opera blocks
 */
import { Log } from "../models/log";
import { Filter, FilterOptions } from "../models/filters";
import { BlockAndLogStreamer } from "../block-and-log-streamer";
import { Configuration } from "../block-and-log-streamer";
import { Block } from "../models/block";

const fetch = require('node-fetch');
const URL = "https://localhost:18545";
const BLOCK_RETENTION = 100;

// blockRetention is how many blocks of history to keep in memory.  it defaults to 100 if not supplied
const configuration = <Configuration>{ blockRetention: BLOCK_RETENTION } ;
async function getBlockByHash(hash: string): Promise<Block|null> {
    const response = await fetch(URL, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
		},
        body: JSON.stringify({ "jsonrpc": "2.0", "id": 1, "method": "eth_getBlockByHash", "params": [ hash , false] })
    });

	var block= await response.json();
	const b = JSON.parse(JSON.stringify(block.result));
	console.log("  <<<<< hash:", hash, "block:", b.number);
	return b;
}
async function getLogs(filterOptions: FilterOptions): Promise<Log[]> {
    const response = await fetch(URL, {
        method: "POST",
        headers: {
		  'Content-Type': 'application/json'
		},
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getLogs", params: [filterOptions] })
    });
    return await response.json();
}

interface FBlock {
	readonly result: string;
}

async function getLatestBlock(): Promise<FBlock> {
    const response = await fetch(URL, {
        method: "POST",
        headers: {
		  'Content-Type': 'application/json'
		},
        body: JSON.stringify({ "jsonrpc": "2.0", "id": 1, "method": "eth_getBlockByNumber", "params": ["latest", false] })
    });

    return await response.json();
}

const onError = (error: Error) => {
	// console.error("error", error.toString());
}

const blockAndLogStreamer = new BlockAndLogStreamer(getBlockByHash, getLogs, onError, configuration);
const onBlockAddedSubscriptionToken = blockAndLogStreamer.subscribeToOnBlockAdded(block => console.log(block));
const onLogAddedSubscriptionToken = blockAndLogStreamer.subscribeToOnLogsAdded(log => console.log(log));
const onBlockRemovedSubscriptionToken = blockAndLogStreamer.subscribeToOnBlockRemoved(block => console.log(block));
const onLogRemovedSubscriptionToken = blockAndLogStreamer.subscribeToOnLogsRemoved(log => console.log(log));
const logFilterToken = blockAndLogStreamer.addLogFilter({address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", topics: ["0xbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbaadf00d"]});

function blockFetcher() {
	getLatestBlock().then( (block)=> {
		const b = JSON.parse(JSON.stringify(block.result));
		console.log("latest block:", b.number);
		blockAndLogStreamer.reconcileNewBlock(b);
	});
}
const t = setInterval(blockFetcher, 500);

// you will get a callback for the block and any logs that match the filter here
//triggerBlockMining();
// blockAndLogStreamer.reconcileNewBlock(getLatestBlock());
// you will get a callback for all blocks and logs that match the filter that have been added to the chain since the previous call to reconcileNewBlock
//triggerChainReorg();
// blockAndLogStreamer.reconcileNewBlock(getLatestBlock());
// you will get a callback for block/log removals that occurred due to the chain re-org, followed by block/log additions

blockAndLogStreamer.unsubscribeFromOnBlockAdded(onBlockAddedSubscriptionToken);
blockAndLogStreamer.unsubscribeFromOnBlockRemoved(onBlockRemovedSubscriptionToken);
blockAndLogStreamer.unsubscribeFromOnLogsAdded(onLogAddedSubscriptionToken);
blockAndLogStreamer.unsubscribeFromOnLogsRemoved(onLogRemovedSubscriptionToken);
blockAndLogStreamer.removeLogFilter(logFilterToken);
console.log("LatestReconciledBlock", blockAndLogStreamer.getLatestReconciledBlock());
