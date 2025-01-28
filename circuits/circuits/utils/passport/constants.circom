pragma circom 2.1.9;

/// @title Constants
/// @notice Contains constants for the passport circuit

/// @notice Maximum length of the DSC public key — currently 512 bytes padded to 525
function getMaxDSCPubKeyLength(){
    return 525;
}

/// @notice Maximum length of DSC certificate — currently 1664 bytes
function getMaxDSCLength(){
    return 1664;
}

/// @notice Maximum length of CSCA certificate — currently 1800 bytes.
/// @dev Empirically, we saw CSCAs up to 1671 bytes in the master list.
function getMaxCSCALength(){
    return 1800;
}

/// @notice Maximum number of levels in the CSCA Merkle tree — currently 12
function getMaxCSCALevels(){
    return 12;
}

/// @notice Maximum number of levels in the DSC Merkle tree — currently 12
function getMaxDSCLevels(){
    return 12;
}