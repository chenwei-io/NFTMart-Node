import {getApi, getModules, waitTx, unit, initApi, Global_Api, Global_ModuleMetadata, ensureAddress, NativeCurrencyID} from "./utils.mjs";
import {Keyring} from "@polkadot/api";
import {bnToBn} from "@polkadot/util";
import {Command} from "commander";

async function main() {
  const ss58Format = 50;
  const keyring = new Keyring({type: 'sr25519', ss58Format});
  const program = new Command();
  program.option('--ws <addr>', 'node ws addr', 'ws://192.168.0.2:9944');

  program.command('transfer <from> <to>').action(async (from, to) => {
    await demo_transfer(program.opts().ws, keyring, from, to);
  });
  program.command('show-all').action(async () => {
    await demo_show_all(program.opts().ws, keyring);
  });
  program.command('show <account> [id]').action(async (account, id) => {
    if(!id) id = NativeCurrencyID;
    await demo_show(program.opts().ws, keyring, account, Number(id));
  });
  await program.parseAsync(process.argv);
}

async function demo_show(ws, keyring, account, currencyId) {
  await initApi(ws);
  const addr = ensureAddress(keyring, account);
  if (currencyId === NativeCurrencyID) {
    account = await Global_Api.query.system.account(addr)
    console.log('system', addr, account.toHuman());
  } else {
    account = await Global_Api.query.tokens.accounts(addr, currencyId);
    console.log('tokens', addr, account.toHuman());
  }
}

async function demo_show_all(ws, keyring) {
  let api = await getApi(ws);
  const all = await api.query.system.account.entries();
  for (const account of all) {
    let key = account[0];
    const len = key.length;
    key = key.buffer.slice(len - 32, len);
    const addr = keyring.encodeAddress(new Uint8Array(key));
    let data = account[1].toHuman();
    data.address = addr;
    console.log("%s", JSON.stringify(data));
  }
}

async function demo_transfer(ws, keyring, from, to) {
  let api = await getApi(ws);
  let moduleMetadata = await getModules(api);
  from = keyring.addFromUri(from);
  to = keyring.addFromUri(to).address;
  let [a, b] = waitTx(moduleMetadata);
  await api.tx.balances.transfer(to, bnToBn(1000000).mul(unit)).signAndSend(from, a);
  await b();
}

main().then(r => {
  process.exit();
}).catch(err => {
  console.log(err);
  process.exit();
});
