pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "./functions.circom";


/// @title ItemAtIndex
/// @notice Select item at given index from the input array
/// @notice This template that the index is valid
/// @notice This is a modified version of QuinSelector from MACI https://github.com/privacy-scaling-explorations/maci/
/// @param maxArrayLen The number of elements in the array
/// @input in The input array
/// @input index The index of the element to select
/// @output out The selected element
template ItemAtIndex(maxArrayLen) {
    signal input in[maxArrayLen];
    signal input index;

    signal output out;

    component calcTotalValue = CalculateTotal(maxArrayLen);
    component calcTotalIndex = CalculateTotal(maxArrayLen);
    component eqs[maxArrayLen];

    // For each item, check whether its index equals the input index.
    for (var i = 0; i < maxArrayLen; i ++) {
        eqs[i] = IsEqual();
        eqs[i].in[0] <== i;
        eqs[i].in[1] <== index;

        // eqs[i].out is 1 if the index matches - so calcTotal is sum of 0s + 1 * valueAtIndex
        calcTotalValue.nums[i] <== eqs[i].out * in[i];

        // Take the sum of all eqs[i].out and assert that it is at most 1.
        calcTotalIndex.nums[i] <== eqs[i].out;
    }

    // Assert that the sum of eqs[i].out is 1. This is to ensure the index passed is valid.
    calcTotalIndex.sum === 1;

    out <== calcTotalValue.sum;
}


/// @title CalculateTotal
/// @notice Calculate the sum of an array
/// @param n The number of elements in the array
/// @input nums The input array; assumes elements are small enough that their sum does not overflow the field
/// @output sum The sum of the input array
template CalculateTotal(n) {
    signal input nums[n];

    signal output sum;

    signal sums[n];
    sums[0] <== nums[0];

    for (var i=1; i < n; i++) {
        sums[i] <== sums[i - 1] + nums[i];
    }

    sum <== sums[n - 1];
}


/// @title SelectSubArray
/// @notice Select sub array from an array given a `startIndex` and `length`
/// @notice This is same as `VarShiftLeft` but with elements after `length` set to zero
/// @notice This is not used in core ZK-Email circuits at the moment
/// @param maxArrayLen: the maximum number of bytes in the input array
/// @param maxSubArrayLen: the maximum number of integers in the output array
/// @input in: the input array
/// @input startIndex: the start index of the sub array; assumes a valid index
/// @input length: the length of the sub array; assumes to fit in `ceil(log2(maxArrayLen))` bits
/// @output out: array of `maxSubArrayLen` size, items starting from `startIndex`, and items after `length` set to zero
template SelectSubArray(maxArrayLen, maxSubArrayLen) {
    assert(maxSubArrayLen < maxArrayLen);

    signal input in[maxArrayLen];
    signal input startIndex;
    signal input length;

    signal output out[maxSubArrayLen];

    component shifter = VarShiftLeft(maxArrayLen, maxSubArrayLen);
    shifter.in <== in;
    shifter.shift <== startIndex;

    // Set value after length to zero
    component gts[maxSubArrayLen];
    for (var i = 0; i < maxSubArrayLen; i++) {
        gts[i] = GreaterThan(log2Ceil(maxSubArrayLen));
        gts[i].in[0] <== length;
        gts[i].in[1] <== i;

        out[i] <== gts[i].out * shifter.out[i];
    }
}


/// @title VarShiftLeft
/// @notice Shift input array by `shift` indices to the left
/// @notice Output array length can be reduced by setting `maxOutArrayLen` 
/// @notice Based on https://demo.hedgedoc.org/s/Le0R3xUhB
/// @param maxArrayLen The maximum length of the input array
/// @param maxOutArrayLen The maximum length of the output array
/// @input in The input array
/// @input shift The number of indices to shift the array to the left
/// @output out hifted subarray
template VarShiftLeft(maxArrayLen, maxOutArrayLen) {
    assert(maxOutArrayLen <= maxArrayLen);

    var bitLength = log2Ceil(maxArrayLen);

    signal input in[maxArrayLen];
    signal input shift;

    signal output out[maxOutArrayLen];

    component n2b = Num2Bits(bitLength);
    n2b.in <== shift;

    signal tmp[bitLength][maxArrayLen];
    for (var j = 0; j < bitLength; j++) {
        for (var i = 0; i < maxArrayLen; i++) {
            var offset = (i + (1 << j)) % maxArrayLen;
            // Shift left by 2^j indices if bit is 1
            if (j == 0) {
                tmp[j][i] <== n2b.out[j] * (in[offset] - in[i]) + in[i];
            } else {
                tmp[j][i] <== n2b.out[j] * (tmp[j-1][offset] - tmp[j-1][i]) + tmp[j-1][i];
            }
        }
    }

    // Return last row
    for (var i = 0; i < maxOutArrayLen; i++) {
        out[i] <== tmp[bitLength - 1][i];
    }
}


/// @title AssertZeroPadding
/// @notice Assert that the input array is zero-padded from the given `startIndex`
/// @param maxArrayLen The maximum number of elements in the input array
/// @input in The input array;
/// @input startIndex The index from which the elements should be 0; assumes `startIndex - 1` to fit in `ceil(log2(maxArrayLen))` bits
template AssertZeroPadding(maxArrayLen) {
    var bitLength = log2Ceil(maxArrayLen);
    
    signal input in[maxArrayLen];
    signal input startIndex;

    component lessThans[maxArrayLen];

    for (var i = 0; i < maxArrayLen; i++) {
        lessThans[i] = LessThan(bitLength);
        lessThans[i].in[0] <== startIndex - 1;
        lessThans[i].in[1] <== i;

        lessThans[i].out * in[i] === 0;
    }
}

/// @title Slice
/// @notice Extract a fixed portion of an array
/// @dev Unlike SelectSubArray, Slice uses compile-time known indices and doesn't pad the output
/// @dev Slice is more efficient for fixed ranges, while SelectSubArray offers runtime flexibility
/// @param n The length of the input array
/// @param start The starting index of the slice (inclusive)
/// @param end The ending index of the slice (exclusive)
/// @input in The input array of length n
/// @output out The sliced array of length (end - start)
template Slice(n, start, end) {
    assert(n >= end);
    assert(start >= 0);
    assert(end >= start);

    signal input in[n];
    signal output out[end - start];    

    for (var i = start; i < end; i++) {
        out[i - start] <== in[i];
    }
}

/// @title CheckSubstringMatch
/// @notice Check if a substring matches the input array
/// @param maxSubstringLen The maximum length of the substring
/// @input input The portion of the input array to check
/// @input substring The substring pattern to match
/// @output isMatch 1 if the substring matches, 0 otherwise
template CheckSubstringMatch(maxSubstringLen) {
    signal input in[maxSubstringLen];
    signal input substring[maxSubstringLen];
    signal output isMatch;

    // Ensure the first element of the pattern is non-zero
    signal firstElementNonZero;
    firstElementNonZero <== IsZero()(substring[0]);
    firstElementNonZero === 0;

    signal matchAccumulator[maxSubstringLen + 1];
    signal difference[maxSubstringLen];
    signal isZeroDifference[maxSubstringLen];

    matchAccumulator[0] <== 1;

    for (var i = 0; i < maxSubstringLen; i++) {
        difference[i] <== (in[i] - substring[i]) * substring[i];
        isZeroDifference[i] <== IsZero()(difference[i]);
        matchAccumulator[i + 1] <== matchAccumulator[i] * isZeroDifference[i];
    }

    isMatch <== matchAccumulator[maxSubstringLen];
}

/// @title CountSubstringOccurrences
/// @notice Count the number of times a substring occurs in the input array
/// @param maxLen The maximum length of the input array
/// @param maxSubstringLen The maximum length of the substring
/// @input in The input array to search in
/// @input substring The substring to search for
/// @output count The number of occurrences of the substring in the input
template CountSubstringOccurrences(maxLen, maxSubstringLen) {
    assert(maxLen >= maxSubstringLen);

    signal input in[maxLen];
    signal input substring[maxSubstringLen];
    signal output count;

    // Check for matches at each possible starting position
    component matches[maxLen];
    for (var i = 0; i < maxLen; i++) {
        matches[i] = CheckSubstringMatch(maxSubstringLen);
        for (var j = 0; j < maxSubstringLen; j++) {
            if (i + j < maxLen) {
                matches[i].in[j] <== in[i + j];
            } else {
                matches[i].in[j] <== 0;
            }
        }
        matches[i].substring <== substring;
    }

    // Sum up all matches to get the total count
    component summer = CalculateTotal(maxLen);
    for (var i = 0; i < maxLen; i++) {
        summer.nums[i] <== matches[i].isMatch;
    }

    count <== summer.sum;
}