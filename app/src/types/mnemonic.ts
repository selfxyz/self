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
