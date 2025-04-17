 pragma circom 2.1.9;
// Position/order (not index) of speciific field in the data
// i.e, the bytes will appear after nth delimiter (255)

function referenceIdPosition() {
  return 2;
}

function namePosition() {
  return 3;
}

function dobPosition() {
  return 4;
}

function genderPosition() {
  return 5;
}

function pinCodePosition() {
  return 11;
}

function statePosition() {
  return 13;
}

function photoPosition() {
  return 18;
}

function maxFieldByteSize() {
  return 31;
}

// Number of int chunks to pack the photo to
// Photo can only be of max 32  * 31 bytes (packSize * fieldByteSize)
function photoPackSize() {
  return 32;
}