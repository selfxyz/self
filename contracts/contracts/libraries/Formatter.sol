// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Formatter is Ownable {
    mapping(string => string) private countryCodes;

    constructor() {
        transferOwnership(msg.sender);
    }


    function formatName(string memory input) public pure returns (string memory firstName, string memory lastName) {
        bytes memory inputBytes = bytes(input);
        bytes memory firstNameBytes;
        bytes memory lastNameBytes;

        uint i = 0;
        // Extract last name
        while(i < inputBytes.length && inputBytes[i] != '<') {
            lastNameBytes = abi.encodePacked(lastNameBytes, inputBytes[i]);
            i++;
        }

        // Skip the separator "<<"
        i += 2;

        // Extract first names
        while(i < inputBytes.length) {
            if(inputBytes[i] == '<') {
                if (i + 1 < inputBytes.length && inputBytes[i + 1] == '<') {
                    break;
                }
                firstNameBytes = abi.encodePacked(firstNameBytes, ' ');
            } else {
                firstNameBytes = abi.encodePacked(firstNameBytes, inputBytes[i]);
            }
            i++;
        }

        firstName = string(firstNameBytes);
        lastName = string(lastNameBytes);
    }

	function formatDate(string memory date) public pure returns (string memory) {
		// Ensure the date string is the correct length
		require(bytes(date).length == 6, "Invalid date length");

		string memory day = substring(date, 0, 2);
		string memory month = substring(date, 2, 4);
		string memory year = substring(date, 4, 6);

		return string(abi.encodePacked(day, "/", month, "/", year));
	}

	function substring(string memory str, uint startIndex, uint endIndex) public pure returns (string memory) {
		bytes memory strBytes = bytes(str);
		bytes memory result = new bytes(endIndex - startIndex);

		for(uint i = startIndex; i < endIndex; i++) {
			result[i - startIndex] = strBytes[i];
		}

		return string(result);
	}

    function formatCountryName(string memory code) public view returns (string memory) {
        string memory countryName = countryCodes[code];
        if(bytes(countryName).length == 0) {
            return code;
        }
        return countryName;
    }

    function addCountryCodes(string[][] memory codeToName) public onlyOwner {
        for(uint i = 0; i < codeToName.length; i++) {
            string memory code = codeToName[i][0];
            string memory name = codeToName[i][1];
            countryCodes[code] = name;
        }
    }
}