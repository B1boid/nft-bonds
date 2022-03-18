use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 9000)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program <'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> ProgramResult {
    let base_account = &mut ctx.accounts.base_account;
    base_account.hashes = Vec::new();
    Ok(())
}