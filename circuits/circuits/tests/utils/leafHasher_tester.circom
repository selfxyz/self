pragma circom  2.1.6;

include "../../utils/passport/customHashers.circom";

// component main = LeafHasher(12);
component main = CustomHasher(32);
