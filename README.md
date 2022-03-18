## Solana program - NFT Bonds


<img src="https://i.ibb.co/drPgycc/diagram-2.png" width="500" height="200" />
<br/>

* Base account state - [base.rs](programs/nft-bonds/src/state/base.rs)
* Event account state - [event.rs](programs/nft-bonds/src/state/event.rs)
* Offer account state - [offer.rs](programs/nft-bonds/src/state/offer.rs)

<br/><br/>
<img src="https://i.ibb.co/hdW7jbF/diagram-1.png" width="500" height="400" />
<br/><br/>

DAO instructions:
1. Create Event - [create_event.rs](programs/nft-bonds/src/instructions/create_event.rs)
2. Add NFT offer (many times) - [make_offer.rs](programs/nft-bonds/src/instructions/make_offer.rs)
3. Submit event - [submit_event.rs](programs/nft-bonds/src/instructions/submit_event.rs)

User instructions:
1. Accept NFT offer - [accept_offer.rs](programs/nft-bonds/src/instructions/accept_offer.rs)