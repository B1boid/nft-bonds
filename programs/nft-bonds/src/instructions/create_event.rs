use anchor_lang::prelude::*;
use anchor_lang::{solana_program};
use crate::state::*;

#[derive(Accounts)]
#[instruction(event_account_bump: u8)]
pub struct CreateEvent<'info> {

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        seeds = [
            b"event".as_ref(),
            authority.key().as_ref()
        ],
        bump = event_account_bump,
        payer = authority,
        space = 9000
    )]
    pub event_account: Account<'info, EventAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateEvent>,
    event_account_bump: u8,
    title: String,
    duration: u8,
    percent: u8,
    vesting_time: u8,
    token: Pubkey
) -> ProgramResult {
    let event_account = &mut ctx.accounts.event_account;
    event_account.duration = duration;
    event_account.percent = percent;
    event_account.start_time = solana_program::clock::Clock::get().unwrap().unix_timestamp.clone() as i64;
    event_account.authority = ctx.accounts.authority.key();
    event_account.bump = event_account_bump;
    event_account.is_opened = false;
    event_account.total_nfts = 0;
    event_account.collected_tokens_amount = 0;
    event_account.full_tokens_amount = 0;
    event_account.collected_nfts = 0;
    event_account.title = title;
    event_account.vesting_time = vesting_time;
    event_account.token = token;

    Ok(())
}
