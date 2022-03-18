use anchor_lang::prelude::*;
use anchor_lang::{solana_program};
use crate::state::*;

#[derive(Accounts)]
pub struct SubmitEvent<'info> {
    #[account(mut)]
    pub base_account: Account<'info, BaseAccount>,

    #[account(mut)]
    pub event_account: Account<'info, EventAccount>,
}

pub fn handler(
    ctx: Context<SubmitEvent>,
) -> ProgramResult {
    let event_account = &mut ctx.accounts.event_account;
    let base_account = &mut ctx.accounts.base_account;
    event_account.start_time = solana_program::clock::Clock::get().unwrap().unix_timestamp.clone() as i64;
    event_account.is_opened = true;
    base_account.hashes.push(event_account.authority);

    Ok(())
}