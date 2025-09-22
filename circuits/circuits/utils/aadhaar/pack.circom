//THIS CODE WAS TAKEN FROM https://github.com/anon-aadhaar/anon-aadhaar/blob/main/packages/circuits/src/utils/pack.circom


pragma circom 2.1.9;

include "circomlib/circuits/comparators.circom";

/// @title DigitBytesToTimestamp
/// @notice Converts a date string of format YYYYMMDDHHMMSS to a unix time
/// @notice Each byte is expected to be a ASCII character representing a digit
/// @notice Assumes the input time is in UTC
/// @dev Does not work for time before unix epoch (negative timestamps)
/// @dev Inputs are not sanity checked in this template (eg: month <= 12?, year >= 1970?)
/// @param maxYears The maximum year that can be represented
/// @param includeHours 1 to include hours, 0 to round down to day
/// @param includeMinutes 1 to include minutes, 0 to round down to hour
/// @param includeSeconds 1 to include seconds, 0 to round down to minute
/// @input in The input byte array
/// @output out The output integer representing the unix time
template DigitBytesToTimestamp(maxYears) {
    signal input year;
    signal input month;
    signal input day;
    signal input hour;
    signal input minute;
    signal input second;

    signal output out;


    // These does not add constraints, but can help to catch errors during witness generation
    assert(year >= 1970);
    assert(year <= maxYears);
    assert(month >= 1);
    assert(month <= 12);
    assert(day >= 1);
    assert(day <= 31);
    assert(hour >= 0);
    assert(hour <= 23);
    assert(minute >= 0);
    assert(minute <= 59);
    assert(second >= 0);
    assert(second <= 59);


    signal daysTillPreviousMonth[12] <== [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

    var maxLeapYears = (maxYears - 1972) \ 4;   // 1972 is first leap year since epoch
    var arrLength = 14 + maxLeapYears + maxLeapYears;

    signal daysPassed[arrLength];
    daysPassed[0] <== (year - 1970) * 365;
    daysPassed[1] <== day - 1;

    component isCurrentMonth[12];
    for (var i = 0; i < 12; i++) {
        isCurrentMonth[i] = IsEqual();
        isCurrentMonth[i].in[0] <== month - 1;
        isCurrentMonth[i].in[1] <== i;

        daysPassed[i + 2] <== isCurrentMonth[i].out * daysTillPreviousMonth[i];     // Add days till previous month
    }

    component isLeapYearCurrentYear[maxLeapYears];  // ith leap year is current year
    component isLeapYearLessThanCurrentYear[maxLeapYears];     // ith leap after 1970 is below current year
    component isCurrentMonthAfterFeb[maxLeapYears];

    for (var i = 0; i < maxLeapYears; i++) {
        isLeapYearLessThanCurrentYear[i] = GreaterThan(8);
        isLeapYearLessThanCurrentYear[i].in[0] <== year - 1972;
        isLeapYearLessThanCurrentYear[i].in[1] <== i * 4;

        isLeapYearCurrentYear[i] = IsEqual();
        isLeapYearCurrentYear[i].in[0] <== year - 1972;
        isLeapYearCurrentYear[i].in[1] <== i * 4;

        daysPassed[14 + i] <== isLeapYearLessThanCurrentYear[i].out;        // Add 1 day for each leap year

        isCurrentMonthAfterFeb[i] = GreaterThan(4);
        isCurrentMonthAfterFeb[i].in[0] <== month;
        isCurrentMonthAfterFeb[i].in[1] <== 2;
        daysPassed[14 + maxLeapYears + i] <== isLeapYearCurrentYear[i].out * isCurrentMonthAfterFeb[i].out; // Add 1 days if current year is leap and date is after Feb
    }

    signal totalDaysPassed[arrLength];
    totalDaysPassed[0] <== daysPassed[0];
    for (var i = 1; i < arrLength; i++) {
        totalDaysPassed[i]  <== totalDaysPassed[i - 1] + daysPassed[i];
    }

    out <== totalDaysPassed[arrLength -1] * 86400 + hour * 3600 + minute * 60 + second;
}
