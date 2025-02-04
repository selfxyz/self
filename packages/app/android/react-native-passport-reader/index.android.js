
import { NativeModules } from 'react-native'

const { RNPassportReader } = NativeModules
const DATE_REGEX = /^\d{6}$/

module.exports = {
  ...RNPassportReader,
  scan
}

function scan({ documentNumber, dateOfBirth, dateOfExpiry, quality=1 }) {
  assert(typeof documentNumber === 'string', 'expected string "documentNumber"')
  assert(isDate(dateOfBirth), 'expected string "dateOfBirth" in format "yyMMdd"')
  assert(isDate(dateOfExpiry), 'expected string "dateOfExpiry" in format "yyMMdd"')
  return RNPassportReader.scan({ documentNumber, dateOfBirth, dateOfExpiry, quality })
}


function assert (statement, err) {
  if (!statement) {
    throw new Error(err || 'Assertion failed')
  }
}

function isDate (str) {
  return typeof str === 'string' && DATE_REGEX.test(str)
}