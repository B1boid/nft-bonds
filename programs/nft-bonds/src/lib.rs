use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("A5t7p64hytJMzVxLg5JKM5QW4Foi9Qm77tR57KaDDcrK");

#[program]
pub mod nft_bonds {
    use super::*;

    pub fn make_offer(
        ctx: Context<MakeOffer>,
        event_bump: u8,
        escrowed_tokens_of_offer_maker_bump: u8,
        im_offering_this_much: u64,
    ) -> ProgramResult {
        instructions::make_offer::handler(
            ctx,
            event_bump,
            escrowed_tokens_of_offer_maker_bump,
            im_offering_this_much,
        )
    }

    pub fn accept_offer(ctx: Context<AcceptOffer>) -> ProgramResult {
        instructions::accept_offer::handler(ctx)
    }

    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_account_bump: u8,
        title: String,
        duration: u8,
        percent: u8,
        vesting_time: u8,
        token: Pubkey
    ) -> ProgramResult {
        instructions::create_event::handler(
            ctx,
            event_account_bump,
            title,
            duration,
            percent,
            vesting_time,
            token
        )
    }

    pub fn submit_event(ctx: Context<SubmitEvent>) -> ProgramResult {
        instructions::submit_event::handler(ctx)
    }

    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        instructions::initialize_base::handler(ctx)
    }
}




