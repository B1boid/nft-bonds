use anchor_lang::prelude::*;

#[account]
pub struct EventAccount {
    pub title: String,
    pub start_time: i64,
    pub duration: u8,
    pub percent: u8,
    pub vesting_time: u8,

    pub collected_tokens_amount: u64,
    pub full_tokens_amount: u64,

    pub collected_nfts: u8,
    pub total_nfts: u8,
    pub token: Pubkey,

    pub is_opened: bool,

    pub authority: Pubkey,
    pub bump: u8,
}