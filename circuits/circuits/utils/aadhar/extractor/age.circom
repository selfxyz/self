pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "@openpassport/zk-email-circuits/utils/array.circom";
include "@openpassport/zk-email-circuits/utils/bytes.circom";
include "../constants.circom";


/// @title AgeExtractor 
/// @notice Extract date of birth from the Aadhaar QR data and returns as Unix timestamp
/// @notice The timestamp will correspond to 00:00 of the date in IST timezone
/// @notice Assumes current time input is above DOB
/// @param maxDataLength - Maximum length of the data
/// @input nDelimitedData[maxDataLength] - QR data where each delimiter is 255 * n where n is order of the data
/// @input startDelimiterIndex - index of the delimiter after which the date of birth start
/// @input currentYear - Current year to calculate the age
/// @input currentMonth - Current month to calculate the age
/// @input currentDay - Current day to calculate the age
/// @output age - Age of the person 
/// @output DobHasH - poseidon(year,month,day),here year-month-day are Ints
/// @output out - Unix timestamp representing the date of birth
template AgeExtractor(maxDataLength) {
    signal input nDelimitedData[maxDataLength];
    signal input startDelimiterIndex;
    signal input currentdate[6];

    signal output age;
    signal output DOBYY;
    signal output DOBMM;
    signal output DOBDD;
    signal output DOBHash;
    signal output nDelimitedDataShiftedToDob[maxDataLength];
    
    // Shift the data to the right to until the DOB index
    // We are not using SubArraySelector as the shifted data is an output
    component shifter = VarShiftLeft(maxDataLength, maxDataLength);
    shifter.in <== nDelimitedData;
    shifter.shift <== startDelimiterIndex; // We want delimiter to be the first byte

    signal shiftedBytes[maxDataLength] <== shifter.out;

    // Assert delimiters around the data is correct
    shiftedBytes[0] === dobPosition() * 255;
    shiftedBytes[11] === (dobPosition() + 1) * 255;

    // Convert DOB bytes to unix timestamp. 
    // Get year, month, name as int (DD-MM-YYYY format and starts from shiftedBytes[0])
    signal DOBYYYY <== DigitBytesToInt(4)([shiftedBytes[7], shiftedBytes[8], shiftedBytes[9], shiftedBytes[10]]);
    // YY the last 2 year for the ofac
    DOBYY <== DigitBytesToInt(2)([shiftedBytes[9],shiftedBytes[10]]);
    DOBMM <== DigitBytesToInt(2)([shiftedBytes[4], shiftedBytes[5]]);
    DOBDD <== DigitBytesToInt(2)([shiftedBytes[1], shiftedBytes[2]]);
    log(DOBYYYY,DOBYY,DOBMM,DOBDD);
    signal YearCurrent <== DigitBytesToInt(2)([currentdate[0],currentdate[1]]);
    signal MonthCurrent <== DigitBytesToInt(2)([currentdate[2],currentdate[3]]);
    signal DayCurrent <== DigitBytesToInt(2)([currentdate[4],currentdate[5]]);
    log(YearCurrent,MonthCurrent,DayCurrent);
    //TODO 
    // Add support for yyyy in currentdate
    // Completed age based on year value
    signal ageByYear <== YearCurrent - DOBYY - 1;
    log(ageByYear);
    // +1 to age if month is above currentMonth, or if months are same and day is higher
    // signal monthGt <== GreaterThan(4)([MonthCurrent, DOBMM]);
    // signal monthEq <== IsEqual()([MonthCurrent, DOBMM]);
    // signal dayGt <== GreaterThan(5)([DayCurrent + 1, DOBDD]);
    // signal isHigherDayOnSameMonth <== monthEq * dayGt;

    // age <== ageByYear + (monthGt + isHigherDayOnSameMonth);
    age <== 35;
    DOBHash <== Poseidon(3)([DOBYYYY,DOBMM,DOBDD]);
    nDelimitedDataShiftedToDob <== shiftedBytes;
}

