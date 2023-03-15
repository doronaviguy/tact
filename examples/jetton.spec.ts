
import { Address, beginCell, Cell, OpenedContract, Slice, toNano } from "ton-core";
import { ContractSystem, testAddress, Treasure } from "ton-emulator";
import { JettonDefaultWallet, loadTokenTransfer, loadTokenTransferInternal } from "./output/jetton_JettonDefaultWallet";
import { loadMint2, SampleJetton } from './output/jetton_SampleJetton';


const MINT_AMOUNT = toNano(1000);
const QUERY_ID = BigInt(0x7474);
let system: ContractSystem;
let owner: Treasure;
let jettonMinter: OpenedContract<SampleJetton>;


describe('jetton', () => {

    beforeEach( async () => {
        system = await ContractSystem.create();
        owner = system.treasure('owner');
        jettonMinter = system.open(await SampleJetton.fromInit(owner.address, null));
    })
    
    it('should mint jetton', async () => {
        await mintJetton(owner);
        expect((await jettonMinter.getOwner()).toString()).toEqual(owner.address.toString());
        let data = await jettonMinter.getGetJettonData();
        expect(data.totalSupply).toBe(MINT_AMOUNT)
    })


    it('should burn jetton', async () => {
        await mintJetton(owner);
        
        let jettonWallet = await JettonDefaultWallet.fromInit(jettonMinter.address, owner.address);
        let jwContract = system.open(jettonWallet);
        await jwContract.send(owner , { value: toNano(1) }, { 
            $$type: 'TokenBurn',
            queryId: QUERY_ID,
            amount: MINT_AMOUNT,
            owner: owner.address,
            responseAddress: owner.address 
        });
        await system.run();
        let dataAfterBurn = await jettonMinter.getGetJettonData();
        expect(dataAfterBurn.totalSupply).toBe(BigInt(0))
        
    });


    it('should transfer from owner jetton-wallet to bob\'s wallet', async () => {

        await mintJetton(owner);

        let ownerJettonWallet = await JettonDefaultWallet.fromInit(jettonMinter.address, owner.address);
        let ownerJettonContract = system.open(ownerJettonWallet);
        let jettonWalletTracker = system.track(ownerJettonContract.address);

        const bob = system.treasure('bob');
        const FORWARD_AMOUNT = toNano('0');
        const MESSAGE_VALUE = toNano('0.3');

        await ownerJettonContract.send(owner , { value: MESSAGE_VALUE },{ 
            $$type: 'TokenTransfer',
            queryId: QUERY_ID,
            amount: MINT_AMOUNT, 
            destination:bob.address, 
            responseDestination: bob.address,
            forwardTonAmount: FORWARD_AMOUNT,
            forwardPayload: new Cell(),
            customPayload: null 
        });
        await system.run();

        let jettonWalletTrackerData = jettonWalletTracker.collect();
        console.log(jettonWalletTrackerData[0].events);
        
        
        //@ts-ignore
        const tokenTransferValue = jettonWalletTrackerData[0].events[0].message.value
        expect(tokenTransferValue).toBe(MESSAGE_VALUE);
        //@ts-ignore
        const tokenTransferStr = (jettonWalletTrackerData[0].events[0].message).body;
        
        const tokenTransferData = loadTokenTransfer( hexStringToCell(tokenTransferStr.cell).beginParse() );
        expect(tokenTransferData.amount).toBe(MINT_AMOUNT);

        //@ts-ignore
        const tokenInternalTransferStr = jettonWalletTrackerData[0].events[2].messages[0].body;
        const tokenInternalTransferData = loadTokenTransferInternal( hexStringToCell(tokenInternalTransferStr.cell).beginParse() );
        expect(tokenInternalTransferData.amount).toBe(MINT_AMOUNT);
        
        let dataAfterTransfer = await ownerJettonContract.getGetWalletData();
        expect(dataAfterTransfer.balance).toBe(BigInt(0))

        let bobJettonWallet = await JettonDefaultWallet.fromInit(jettonMinter.address, bob.address);
        let bobJwContract = system.open(bobJettonWallet);
        let bobJettonData = await bobJwContract.getGetWalletData()

        expect(bobJettonData.balance).toBe(MINT_AMOUNT)
    });
    
    it('should transfer from owner jetton-wallet to bob\'s wallet with custom payload', async () => {

        await mintJetton(owner);

        let ownerJettonWallet = await JettonDefaultWallet.fromInit(jettonMinter.address, owner.address);
        let ownerJettonContract = system.open(ownerJettonWallet);
        let jettonWalletTracker = system.track(ownerJettonContract.address);

        const bob = system.treasure('bob');
        const FORWARD_AMOUNT = toNano('0');
        const MESSAGE_VALUE = toNano('0.3');

        await ownerJettonContract.send(owner , { value: MESSAGE_VALUE },{ 
            $$type: 'TokenTransfer',
            queryId: QUERY_ID,
            amount: MINT_AMOUNT, 
            destination:bob.address, 
            responseDestination: bob.address,
            forwardTonAmount: FORWARD_AMOUNT,
            forwardPayload: new Cell(),
            customPayload: null 
        });
        await system.run();

        let jettonWalletTrackerData = jettonWalletTracker.collect();
        console.log(jettonWalletTrackerData[0].events);
        
        
        //@ts-ignore
        const tokenTransferValue = jettonWalletTrackerData[0].events[0].message.value
        expect(tokenTransferValue).toBe(MESSAGE_VALUE);
        //@ts-ignore
        const tokenTransferStr = (jettonWalletTrackerData[0].events[0].message).body;
        
        const tokenTransferData = loadTokenTransfer( hexStringToCell(tokenTransferStr.cell).beginParse() );
        expect(tokenTransferData.amount).toBe(MINT_AMOUNT);

        //@ts-ignore
        const tokenInternalTransferStr = jettonWalletTrackerData[0].events[2].messages[0].body;
        const tokenInternalTransferData = loadTokenTransferInternal( hexStringToCell(tokenInternalTransferStr.cell).beginParse() );
        expect(tokenInternalTransferData.amount).toBe(MINT_AMOUNT);
        
        let dataAfterTransfer = await ownerJettonContract.getGetWalletData();
        expect(dataAfterTransfer.balance).toBe(BigInt(0))

        let bobJettonWallet = await JettonDefaultWallet.fromInit(jettonMinter.address, bob.address);
        let bobJwContract = system.open(bobJettonWallet);
        let bobJettonData = await bobJwContract.getGetWalletData()

        expect(bobJettonData.balance).toBe(MINT_AMOUNT)
    });
});



async function mintJetton(owner: Treasure) {
    console.log(owner);
    
    await jettonMinter.send(owner, { value: toNano(1) }, { $$type: 'Mint2', queryId: QUERY_ID, amount: MINT_AMOUNT });
    await system.run();
}









/// supports only single cell
function hexStringToCell(str: string) {
    let hex = str.replace('x{', '').replace('}', '')
    let cell = beginCell().storeBuffer(Buffer.from(hex, "hex")).endCell();
    return cell;
}