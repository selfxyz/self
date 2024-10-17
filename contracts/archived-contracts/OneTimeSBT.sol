// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import {IVerifiersManager} from "./interfaces/IVerifiersManager.sol";
import {Base64} from "./libraries/Base64.sol";
import {Formatter} from "./Formatter.sol";
import "./constants/Constants.sol";
import "./libraries/AttributeLibrary.sol";
import "hardhat/console.sol";

contract OneTimeSBT is ERC721Enumerable {
    using Strings for uint256;
    using Base64 for *;

    //TODO: add ownable and functions to update verifiersmanager
    IVerifiersManager public verifiersManager;
    Formatter public formatter;

    mapping(uint256 => uint256) public sbtExpiration;

    struct Attributes {
        string[8] values;
    }
    mapping(uint256 => Attributes) private tokenAttributes;

    error CURRENT_DATE_NOT_IN_VALID_RANGE();
    error UNEQUAL_BLINDED_DSC_COMMITMENT();
    error INVALID_PROVE_PROOF();
    error INVALID_DSC_PROOF();
    error SBT_CAN_NOT_BE_TRANSFERED();

    constructor(
        IVerifiersManager v,
        Formatter f
    ) ERC721("OpenPassport", "OpenPassport") {
        verifiersManager = v;
        formatter = f;
    }

    function mint(
        uint256 prove_verifier_id,
        uint256 dsc_verifier_id,
        IVerifiersManager.RSAProveCircuitProof memory p_proof,
        IVerifiersManager.DscCircuitProof memory d_proof
    ) public {
        // require that the current date is valid
        // Convert the last four parameters into a valid timestamp, adding 30 years to adjust for block.timestamp starting in 1970
        uint[6] memory dateNum;
        for (uint i = 0; i < 6; i++) {
            dateNum[i] = p_proof.pubSignals[PROVE_RSA_CURRENT_DATE_INDEX + i];
        }
        uint currentTimestamp = _getCurrentTimestamp(dateNum);

        // Check that the current date is within a +/- 1 day range
        if(
            currentTimestamp < block.timestamp - 1 days ||
            currentTimestamp > block.timestamp + 1 days
        ) {
            revert CURRENT_DATE_NOT_IN_VALID_RANGE();
        }

        // check blinded dcs
        if (
            keccak256(abi.encodePacked(p_proof.pubSignals[PROVE_RSA_BLINDED_DSC_COMMITMENT_INDEX])) !=
            keccak256(abi.encodePacked(d_proof.pubSignals[DSC_BLINDED_DSC_COMMITMENT_INDEX]))
        ) {
            revert UNEQUAL_BLINDED_DSC_COMMITMENT();
        }

        if (!verifiersManager.verifyWithProveVerifier(prove_verifier_id, p_proof)) {
            revert INVALID_PROVE_PROOF();
        }

        if (!verifiersManager.verifyWithDscVerifier(dsc_verifier_id, d_proof)) {
            revert INVALID_DSC_PROOF();
        }

        // Effects: Mint token
        address addr = address(uint160(p_proof.pubSignals[PROVE_RSA_USER_IDENTIFIER_INDEX]));
        uint256 newTokenId = totalSupply();
        _mint(addr, newTokenId);

        // Set attributes
        uint[3] memory revealedData_packed;
        for (uint256 i = 0; i < 3; i++) {
            revealedData_packed[i] = p_proof.pubSignals[PROVE_RSA_REVEALED_DATA_PACKED_INDEX + i];
        }
        bytes memory charcodes = _fieldElementsToBytes(
            revealedData_packed
        );

        Attributes storage attributes = tokenAttributes[newTokenId];

        attributes.values[0] = AttributeLibrary.getIssuingState(charcodes);
        attributes.values[1] = AttributeLibrary.getName(charcodes);
        attributes.values[2] = AttributeLibrary.getPassportNumber(charcodes);
        attributes.values[3] = AttributeLibrary.getNationality(charcodes);
        attributes.values[4] = AttributeLibrary.getDateOfBirth(charcodes);
        attributes.values[5] = AttributeLibrary.getGender(charcodes);
        attributes.values[6] = AttributeLibrary.getExpiryDate(charcodes);

        uint[] memory olderThanAscii = new uint[](2);
        olderThanAscii[0] = p_proof.pubSignals[PROVE_RSA_OLDER_THAN_INDEX];
        olderThanAscii[1] = p_proof.pubSignals[PROVE_RSA_OLDER_THAN_INDEX + 1];
        attributes.values[7] = _convertUintArrayToString(olderThanAscii);

        sbtExpiration[newTokenId] = block.timestamp + 90 days;
    }

    // get functions 
    function getIssuingStateOf(
        uint256 _tokenId
    ) public view returns (string memory) {
        return tokenAttributes[_tokenId].values[ATTRIBUTE_ISSUING_STATE_INDEX];
    }

    function getNameOf(uint256 _tokenId) public view returns (string memory) {
        return tokenAttributes[_tokenId].values[ATTRIBUTE_NAME_INDEX];
    }

    function getPassportNumberOf(
        uint256 _tokenId
    ) public view returns (string memory) {
        return tokenAttributes[_tokenId].values[ATTRIBUTE_PASSPORT_NUMBER_INDEX];
    }

    function getNationalityOf(
        uint256 _tokenId
    ) public view returns (string memory) {
        return tokenAttributes[_tokenId].values[ATTRIBUTE_NATIONALITY_INDEX];
    }

    function getDateOfBirthOf(
        uint256 _tokenId
    ) public view returns (string memory) {
        return tokenAttributes[_tokenId].values[ATTRIBUTE_DATE_OF_BIRTH_INDEX];
    }

    function getGenderOf(uint256 _tokenId) public view returns (string memory) {
        return tokenAttributes[_tokenId].values[ATTRIBUTE_GENDER_INDEX];
    }

    function getExpiryDateOf(
        uint256 _tokenId
    ) public view returns (string memory) {
        return tokenAttributes[_tokenId].values[ATTRIBUTE_EXPIRY_DATE_INDEX];
    }

    function getOlderThanOf(
        uint256 _tokenId
    ) public view returns (string memory) {
        return tokenAttributes[_tokenId].values[ATTRIBUTE_OLDER_THAN_INDEX];
    }

    // This is the function to check if the sbt is not expired or not
    function isSbtValid(
        uint256 _tokenId
    ) public view returns (bool) {
        uint256 expirationDate = sbtExpiration[_tokenId];
        return expirationDate > block.timestamp;
    }

    // internal functions
    function _convertUintArrayToString(uint[] memory input) internal pure returns (string memory) {
        bytes memory bytesArray = new bytes(input.length);
        for (uint i = 0; i < input.length; i++) {
            bytesArray[i] = bytes1(uint8(input[i]));
        }
        return string(bytesArray);
    }

    function _fieldElementsToBytes(
        uint256[3] memory publicSignals
    ) internal pure returns (bytes memory) {
        uint8[3] memory bytesCount = [31, 31, 28];
        bytes memory bytesArray = new bytes(90); // 31 + 31 + 28

        uint256 index = 0;
        for (uint256 i = 0; i < 3; i++) {
            uint256 element = publicSignals[i];
            for (uint8 j = 0; j < bytesCount[i]; j++) {
                bytesArray[index++] = bytes1(uint8(element & 0xFF));
                element = element >> 8;
            }
        }

        return bytesArray;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        if (from != address(0)) {
            revert SBT_CAN_NOT_BE_TRANSFERED();
        }
    }

    function _getCurrentTimestamp(
        uint256[6] memory dateNum
    ) internal view returns (uint256) {
        string memory date = "";
        for (uint i = 0; i < 6; i++) {
            date = string(
                abi.encodePacked(date, bytes1(uint8(48 + (dateNum[i] % 10))))
            );
        }
        uint256 currentTimestamp = formatter.dateToUnixTimestamp(date);
        return currentTimestamp;
    }

    // functions for calculate tokenURI
    function isAttributeEmpty(
        string memory attribute
    ) private pure returns (bool) {
        for (uint i = 0; i < bytes(attribute).length; i++) {
            if (bytes(attribute)[i] != 0) {
                return false;
            }
        }
        return true;
    }

    function appendAttribute(
        bytes memory baseURI,
        string memory traitType,
        string memory value
    ) private view returns (bytes memory) {
        if (!isAttributeEmpty(value)) {
            baseURI = abi.encodePacked(
                baseURI,
                '{"trait_type": "',
                traitType,
                '", "value": "',
                formatAttribute(traitType, value),
                '"},'
            );
        }
        return baseURI;
    }

    function isExpired(string memory date) public view returns (bool) {
        if (isAttributeEmpty(date)) {
            return false; // this is disregarded anyway in the next steps
        }
        uint256 expiryDate = formatter.dateToUnixTimestamp(date);

        return block.timestamp > expiryDate;
    }

    function formatAttribute(
        string memory traitType,
        string memory value
    ) private view returns (string memory) {
        if (
            isStringEqual(traitType, "Issuing State") ||
            isStringEqual(traitType, "Nationality")
        ) {
            return formatter.formatCountryName(value);
        } else if (isStringEqual(traitType, "First Name")) {
            return formatter.formatName(value)[0];
        } else if (isStringEqual(traitType, "Last Name")) {
            return formatter.formatName(value)[1];
        } else if (
            isStringEqual(traitType, "Date of birth") ||
            isStringEqual(traitType, "Expiry date")
        ) {
            return formatter.formatDate(value);
        } else if (isStringEqual(traitType, "Older Than")) {
            return formatter.formatAge(value);
        } else if (isStringEqual(traitType, "Expired")) {
            return isExpired(value) ? "Yes" : "No";
        } else {
            return value;
        }
    }

    function isStringEqual(
        string memory a,
        string memory b
    ) public pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    function substring(
        bytes memory str,
        uint startIndex,
        uint endIndex
    ) public pure returns (bytes memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return result;
    }

    function tokenURI(
        uint256 _tokenId
    ) public view virtual override returns (string memory) {
        require(
            _exists(_tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        Attributes memory attributes = tokenAttributes[_tokenId];

        bytes memory baseURI = abi.encodePacked('{ "attributes": [');

        baseURI = appendAttribute(
            baseURI,
            "Issuing State",
            attributes.values[0]
        );
        baseURI = appendAttribute(baseURI, "First Name", attributes.values[1]);
        baseURI = appendAttribute(baseURI, "Last Name", attributes.values[1]);
        baseURI = appendAttribute(
            baseURI,
            "Passport Number",
            attributes.values[2]
        );
        baseURI = appendAttribute(baseURI, "Nationality", attributes.values[3]);
        baseURI = appendAttribute(
            baseURI,
            "Date of birth",
            attributes.values[4]
        );
        baseURI = appendAttribute(baseURI, "Gender", attributes.values[5]);
        baseURI = appendAttribute(baseURI, "Expiry date", attributes.values[6]);
        baseURI = appendAttribute(baseURI, "Expired", attributes.values[6]);
        baseURI = appendAttribute(baseURI, "Older Than", attributes.values[7]);

        // Remove the trailing comma if baseURI has one
        if (
            keccak256(abi.encodePacked(baseURI[baseURI.length - 1])) ==
            keccak256(abi.encodePacked(","))
        ) {
            baseURI = substring(baseURI, 0, bytes(baseURI).length - 1);
        }

        baseURI = abi.encodePacked(
            baseURI,
            '],"description": "OpenPassport guarantees possession of a valid passport.","external_url": "https://openpassport.app","image": "https://i.imgur.com/9kvetij.png","name": "OpenPassport #',
            _tokenId.toString(),
            '"}'
        );

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    baseURI.encode()
                )
            );
    }
}