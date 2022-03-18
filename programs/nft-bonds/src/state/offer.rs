use anchor_lang::prelude::*;

#[account]
pub struct Offer {
    pub authority: Pubkey,
    pub is_collected: bool,
    pub amount_of_offered_tokens: u64,
    pub kind_of_token_wanted_in_return: Pubkey,
    pub escrowed_tokens_of_offer_maker_bump: u8,
    pub bump: u8
}
