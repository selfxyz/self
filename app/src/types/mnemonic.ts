// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export interface Mnemonic {
  /**
   *  The mnemonic phrase of 12, 15, 18, 21 or 24 words.
   *
   *  Use the [[wordlist]] ``split`` method to get the individual words.
   */
  readonly phrase: string;

  /**
   *  The password used for this mnemonic. If no password is used this
   *  is the empty string (i.e. ``""``) as per the specification.
   */
  readonly password: string;

  /**
   *  The wordlist for this mnemonic.
   */
  readonly wordlist: {
    readonly locale: string;
  };

  /**
   *  The underlying entropy which the mnemonic encodes.
   */
  readonly entropy: string;
}
