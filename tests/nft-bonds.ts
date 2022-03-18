import {NftBonds} from "../target/types/nft_bonds";
import {Program, Provider, web3} from "@project-serum/anchor";
import * as assert from 'assert';
import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import {NodeWallet} from "@project-serum/anchor/dist/cjs/provider";
import {LAMPORTS_PER_SOL, sendAndConfirmTransaction, SystemProgram, Transaction} from "@solana/web3.js";


function programPaidBy(provider: Provider, payer: anchor.web3.Keypair): anchor.Program {
    const program = anchor.workspace.NftBonds as Program<NftBonds>;
    // @ts-ignore
    const newProvider = new anchor.Provider(provider.connection, new anchor.Wallet(payer), {});

    return new anchor.Program(program.idl as anchor.Idl, program.programId, newProvider)
}


describe('nft-bonds', async () => {
    const provider = anchor.Provider.env()

    let offerMaker = anchor.web3.Keypair.generate();
    let offerTaker = anchor.web3.Keypair.generate();
    let payer = anchor.web3.Keypair.generate();
    let baseAccount = anchor.web3.Keypair.generate();

    const program = programPaidBy(provider, offerMaker);

    let offerMakerPlatformTokensTokenAccount: anchor.web3.PublicKey;
    let offerTakerNftTokenAccount: anchor.web3.PublicKey;
    let offerTakerPlatformTokensTokenAccount: anchor.web3.PublicKey;
    let offerMakerNftTokenAccount: anchor.web3.PublicKey;

    let nftMint: spl.Token;
    let platformTokensMint: spl.Token;

    const DURATION_VAL = 5
    const PERCENT_VAL = 20
    const TITLE = "My Event"
    const VESTING_TIME = 0;

    before(async () => {
        const wallet = program.provider.wallet as NodeWallet;

        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL)
        );

        // Fund Main Accounts
        await sendAndConfirmTransaction(
            provider.connection,
            (() => {
                const tx = new Transaction();
                tx.add(
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: offerMaker.publicKey,
                        lamports: LAMPORTS_PER_SOL / 10,
                    }),
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: offerTaker.publicKey,
                        lamports: LAMPORTS_PER_SOL / 10,
                    }),
                    SystemProgram.transfer({
                        fromPubkey: payer.publicKey,
                        toPubkey: baseAccount.publicKey,
                        lamports: LAMPORTS_PER_SOL / 10,
                    })
                );
                return tx;
            })(),
            [payer]
        );

        nftMint = await spl.Token.createMint(program.provider.connection,
            wallet.payer,
            wallet.publicKey,
            wallet.publicKey,
            0,
            spl.TOKEN_PROGRAM_ID);

        platformTokensMint = await spl.Token.createMint(program.provider.connection,
            wallet.payer,
            wallet.publicKey,
            wallet.publicKey,
            100,
            spl.TOKEN_PROGRAM_ID);


        offerMakerNftTokenAccount = await nftMint.createAssociatedTokenAccount(
            offerMaker.publicKey
        )

        offerMakerPlatformTokensTokenAccount = await platformTokensMint.createAssociatedTokenAccount(
            offerMaker.publicKey
        )

        offerTakerNftTokenAccount = await nftMint.createAssociatedTokenAccount(
            offerTaker.publicKey
        )

        offerTakerPlatformTokensTokenAccount = await platformTokensMint.createAssociatedTokenAccount(
            offerTaker.publicKey
        )

        await nftMint.mintTo(offerTakerNftTokenAccount, program.provider.wallet.publicKey, [], 1);
        await platformTokensMint.mintTo(offerMakerPlatformTokensTokenAccount, program.provider.wallet.publicKey, [], 100);
    });

    it('Create event, Make NFTs offers, Submit event, Accept offer', async () => {

        await program.rpc.initialize({
            accounts: {
                baseAccount: baseAccount.publicKey,
                authority: offerMaker.publicKey,
                systemProgram: SystemProgram.programId,
            },
            signers: [baseAccount],
        });

        let baseAccountInfo = await program.account.baseAccount.fetch(baseAccount.publicKey);
        assert.equal(0, baseAccountInfo.hashes.length);

        let [eventAccount, eventAccountBump] = await anchor.web3.PublicKey.findProgramAddress(
            [anchor.utils.bytes.utf8.encode("event"), offerMaker.publicKey.toBuffer()],
            program.programId
        )

        await program.rpc.createEvent(eventAccountBump, TITLE, DURATION_VAL, PERCENT_VAL, VESTING_TIME, platformTokensMint.publicKey, {
            accounts: {
                authority: offerMaker.publicKey,
                eventAccount: eventAccount,
                systemProgram: anchor.web3.SystemProgram.programId,
            }, signers: [offerMaker]
        })

        let eventAccountInfo = await program.account.eventAccount.fetch(eventAccount)
        assert.equal(PERCENT_VAL, eventAccountInfo.percent);
        assert.equal(offerMaker.publicKey.toString(), eventAccountInfo.authority.toString());
        assert.equal(0, eventAccountInfo.totalNfts);
        assert.equal(false, eventAccountInfo.isOpened);
        assert.equal(platformTokensMint.publicKey.toString(), eventAccountInfo.token.toString());

        let [offer, offerBump] = await anchor.web3.PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("offer"),
                eventAccount.toBuffer(),
                new anchor.BN(0).toArrayLike(Buffer)
            ],
            program.programId
        )

        let [escrowedTokensOfOfferMaker, escrowedTokensOfOfferMakerBump] = await anchor.web3.PublicKey.findProgramAddress(
            [offer.toBuffer()],
            program.programId
        )

        let TOKENS_OFFER_AMOUNT = 21;

        await program.rpc.makeOffer(
            offerBump,
            escrowedTokensOfOfferMakerBump,
            new anchor.BN(TOKENS_OFFER_AMOUNT),
            {
                accounts: {
                    eventAccount: eventAccount,
                    offer: offer,
                    authority: offerMaker.publicKey,
                    tokenAccountFromWhoMadeTheOffer: offerMakerPlatformTokensTokenAccount,
                    escrowedTokensOfOfferMaker: escrowedTokensOfOfferMaker,
                    kindOfTokenOffered: platformTokensMint.publicKey,
                    kindOfTokenWantedInReturn: nftMint.publicKey,
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY
                }, signers: [offerMaker]
            }
        );

        [eventAccount, eventAccountBump] = await anchor.web3.PublicKey.findProgramAddress(
            [anchor.utils.bytes.utf8.encode("event"), offerMaker.publicKey.toBuffer()],
            program.programId
        );
        [offer, offerBump] = await anchor.web3.PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("offer"),
                eventAccount.toBuffer(),
                new anchor.BN(0).toArrayLike(Buffer)
            ],
            program.programId
        )

        let offerAccountInfo = await program.account.offer.fetch(offer)
        assert.equal(false, offerAccountInfo.isCollected);


        assert.equal(TOKENS_OFFER_AMOUNT, (await platformTokensMint.getAccountInfo(escrowedTokensOfOfferMaker)).amount.toNumber());
        //assert.equal(60, (await platformTokensMint.getAccountInfo(offerMakerPlatformTokensTokenAccount)).amount.toNumber());
        let offerMakerCurrentNftAmounts = (await nftMint.getAccountInfo(offerMakerNftTokenAccount)).amount.toNumber();
        let offerMakerCurrentPlatformTokensAmounts = (await platformTokensMint.getAccountInfo(offerMakerPlatformTokensTokenAccount)).amount.toNumber();
        let offerReceiverCurrentPlatformTokensAmounts = (await platformTokensMint.getAccountInfo(offerTakerPlatformTokensTokenAccount)).amount.toNumber();

        [offer, offerBump] = await anchor.web3.PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("offer"),
                eventAccount.toBuffer(),
                new anchor.BN(1).toArrayLike(Buffer)
            ],
            program.programId
        );

        [escrowedTokensOfOfferMaker, escrowedTokensOfOfferMakerBump] = await anchor.web3.PublicKey.findProgramAddress(
            [offer.toBuffer()],
            program.programId
        )

        TOKENS_OFFER_AMOUNT = 34;

        await program.rpc.makeOffer(
            offerBump,
            escrowedTokensOfOfferMakerBump,
            new anchor.BN(TOKENS_OFFER_AMOUNT),
            {
                accounts: {
                    eventAccount: eventAccount,
                    offer: offer,
                    authority: offerMaker.publicKey,
                    tokenAccountFromWhoMadeTheOffer: offerMakerPlatformTokensTokenAccount,
                    escrowedTokensOfOfferMaker: escrowedTokensOfOfferMaker,
                    kindOfTokenOffered: platformTokensMint.publicKey,
                    kindOfTokenWantedInReturn: nftMint.publicKey,
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY
                }, signers: [offerMaker]
            }
        );

        assert.equal(TOKENS_OFFER_AMOUNT, (await platformTokensMint.getAccountInfo(escrowedTokensOfOfferMaker)).amount.toNumber());
        offerMakerCurrentNftAmounts = (await nftMint.getAccountInfo(offerMakerNftTokenAccount)).amount.toNumber();
        offerMakerCurrentPlatformTokensAmounts = (await platformTokensMint.getAccountInfo(offerMakerPlatformTokensTokenAccount)).amount.toNumber();
        offerReceiverCurrentPlatformTokensAmounts = (await platformTokensMint.getAccountInfo(offerTakerPlatformTokensTokenAccount)).amount.toNumber();


        await program.rpc.submitEvent(
            {
                accounts: {
                    baseAccount: baseAccount.publicKey,
                    eventAccount: eventAccount
                }, signers: [offerMaker]
            }
        );

        eventAccountInfo = await program.account.eventAccount.fetch(eventAccount)
        assert.equal(true, eventAccountInfo.isOpened);
        assert.equal(2, eventAccountInfo.totalNfts);

        let tx = await program.rpc.acceptOffer(
            {
                accounts: {
                    eventAccount: eventAccount,
                    offer: offer,
                    authority: offerMaker.publicKey,
                    whoIsTakingTheOffer: offerTaker.publicKey,
                    escrowedTokensOfOfferMaker: escrowedTokensOfOfferMaker,
                    accountHoldingWhatMakerWillGet: offerMakerNftTokenAccount,
                    accountHoldingWhatReceiverWillGive: offerTakerNftTokenAccount,
                    accountHoldingWhatReceiverWillGet: offerTakerPlatformTokensTokenAccount,
                    kindOfTokenWantedInReturn: nftMint.publicKey,
                    tokenProgram: spl.TOKEN_PROGRAM_ID,
                },
                signers: [offerTaker]
            }
        );

        assert.equal(offerMakerCurrentPlatformTokensAmounts, (await platformTokensMint.getAccountInfo(offerMakerPlatformTokensTokenAccount)).amount.toNumber());
        assert.equal(offerReceiverCurrentPlatformTokensAmounts + TOKENS_OFFER_AMOUNT, (await platformTokensMint.getAccountInfo(offerTakerPlatformTokensTokenAccount)).amount.toNumber());
    });
});