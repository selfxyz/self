pragma solidity >=0.7.0 <0.9.0;

contract Mock_Verifier_dsc_rsa_65537_sha256_4096 {

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[2] calldata _pubSignals) public view returns (bool) {
        if (_pA[0] == 1) {
            return false;
        }
        return true;
    }
 }
