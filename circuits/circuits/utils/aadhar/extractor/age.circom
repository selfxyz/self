pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "@openpassport/zk-email/circuits/utils/array.circom";
include "@openpassport/zk-email/circuits/utils/bytes.circom";
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
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;

    signal output age;
    signal output year;
    signal output month;
    signal output day;
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
    year <== DigitBytesToInt(4)([shiftedBytes[7], shiftedBytes[8], shiftedBytes[9], shiftedBytes[10]]);
    month <== DigitBytesToInt(2)([shiftedBytes[4], shiftedBytes[5]]);
    day <== DigitBytesToInt(2)([shiftedBytes[1], shiftedBytes[2]]);


    // Completed age based on year value
    signal ageByYear <== currentYear - year - 1;

    // +1 to age if month is above currentMonth, or if months are same and day is higher
    signal monthGt <== GreaterThan(4)([currentMonth, month]);
    signal monthEq <== IsEqual()([currentMonth, month]);
    signal dayGt <== GreaterThan(5)([currentDay + 1, day]);
    signal isHigherDayOnSameMonth <== monthEq * dayGt;

    age <== ageByYear + (monthGt + isHigherDayOnSameMonth);

    nDelimitedDataShiftedToDob <== shiftedBytes;
}

