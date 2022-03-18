use anchor_lang::prelude::*;

use crate::state::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
#[instruction(event_bump: u8, escrow_bump: u8)]
pub struct MakeOffer<'info> {

    #[account(mut, has_one = authority)]
    pub event_account: Account<'info, EventAccount>,

    #[account(
        init,
        seeds = [
            b"offer".as_ref(),
            event_account.key().as_ref(),
            [event_account.total_nfts].as_ref(),
        ],
        bump = event_bump,
        payer = authority,
        space = 500
    )]
    pub offer: Account<'info, Offer>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut, constraint = token_account_from_who_made_the_offer.mint == kind_of_token_offered.key())]
    pub token_account_from_who_made_the_offer: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [offer.key().as_ref()],
        bump = escrow_bump,
        token::mint = kind_of_token_offered,
        token::authority = escrowed_tokens_of_offer_maker,
    )]
    pub escrowed_tokens_of_offer_maker: Account<'info, TokenAccount>,

    pub kind_of_token_offered: Account<'info, Mint>,

    pub kind_of_token_wanted_in_return: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<MakeOffer>,
    event_bump: u8,
    escrowed_tokens_of_offer_maker_bump:u8,
    im_offering_this_much: u64
) -> ProgramResult {
    let offer = &mut ctx.accounts.offer;
    let event_account = &mut ctx.accounts.event_account;

    offer.authority = ctx.accounts.authority.key();
    offer.kind_of_token_wanted_in_return = ctx.accounts.kind_of_token_wanted_in_return.key();
    offer.escrowed_tokens_of_offer_maker_bump = escrowed_tokens_of_offer_maker_bump;
    offer.bump = event_bump;
    offer.is_collected = false;
    offer.amount_of_offered_tokens = im_offering_this_much.clone();
    event_account.full_tokens_amount += im_offering_this_much.clone();
    event_account.total_nfts += 1;

    anchor_spl::token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx
                    .accounts
                    .token_account_from_who_made_the_offer
                    .to_account_info(),
                to: ctx
                    .accounts
                    .escrowed_tokens_of_offer_maker
                    .to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        im_offering_this_much,
    )
}
