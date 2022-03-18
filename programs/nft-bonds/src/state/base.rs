use anchor_lang::prelude::*;

#[account]
pub struct BaseAccount {
    pub hashes: Vec<Pubkey>
}