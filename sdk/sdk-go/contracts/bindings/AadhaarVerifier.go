// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package contracts

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// AadhaarVerifierMetaData contains all meta data concerning the AadhaarVerifier contract.
var AadhaarVerifierMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"uint256[2]\",\"name\":\"a\",\"type\":\"uint256[2]\"},{\"internalType\":\"uint256[2][2]\",\"name\":\"b\",\"type\":\"uint256[2][2]\"},{\"internalType\":\"uint256[2]\",\"name\":\"c\",\"type\":\"uint256[2]\"},{\"internalType\":\"uint256[19]\",\"name\":\"pubSignals\",\"type\":\"uint256[19]\"}],\"name\":\"verifyProof\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// AadhaarVerifierABI is the input ABI used to generate the binding from.
// Deprecated: Use AadhaarVerifierMetaData.ABI instead.
var AadhaarVerifierABI = AadhaarVerifierMetaData.ABI

// AadhaarVerifier is an auto generated Go binding around an Ethereum contract.
type AadhaarVerifier struct {
	AadhaarVerifierCaller     // Read-only binding to the contract
	AadhaarVerifierTransactor // Write-only binding to the contract
	AadhaarVerifierFilterer   // Log filterer for contract events
}

// AadhaarVerifierCaller is an auto generated read-only Go binding around an Ethereum contract.
type AadhaarVerifierCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// AadhaarVerifierTransactor is an auto generated write-only Go binding around an Ethereum contract.
type AadhaarVerifierTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// AadhaarVerifierFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type AadhaarVerifierFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// AadhaarVerifierSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type AadhaarVerifierSession struct {
	Contract     *AadhaarVerifier  // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// AadhaarVerifierCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type AadhaarVerifierCallerSession struct {
	Contract *AadhaarVerifierCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts          // Call options to use throughout this session
}

// AadhaarVerifierTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type AadhaarVerifierTransactorSession struct {
	Contract     *AadhaarVerifierTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts          // Transaction auth options to use throughout this session
}

// AadhaarVerifierRaw is an auto generated low-level Go binding around an Ethereum contract.
type AadhaarVerifierRaw struct {
	Contract *AadhaarVerifier // Generic contract binding to access the raw methods on
}

// AadhaarVerifierCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type AadhaarVerifierCallerRaw struct {
	Contract *AadhaarVerifierCaller // Generic read-only contract binding to access the raw methods on
}

// AadhaarVerifierTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type AadhaarVerifierTransactorRaw struct {
	Contract *AadhaarVerifierTransactor // Generic write-only contract binding to access the raw methods on
}

// NewAadhaarVerifier creates a new instance of AadhaarVerifier, bound to a specific deployed contract.
func NewAadhaarVerifier(address common.Address, backend bind.ContractBackend) (*AadhaarVerifier, error) {
	contract, err := bindAadhaarVerifier(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &AadhaarVerifier{AadhaarVerifierCaller: AadhaarVerifierCaller{contract: contract}, AadhaarVerifierTransactor: AadhaarVerifierTransactor{contract: contract}, AadhaarVerifierFilterer: AadhaarVerifierFilterer{contract: contract}}, nil
}

// NewAadhaarVerifierCaller creates a new read-only instance of AadhaarVerifier, bound to a specific deployed contract.
func NewAadhaarVerifierCaller(address common.Address, caller bind.ContractCaller) (*AadhaarVerifierCaller, error) {
	contract, err := bindAadhaarVerifier(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &AadhaarVerifierCaller{contract: contract}, nil
}

// NewAadhaarVerifierTransactor creates a new write-only instance of AadhaarVerifier, bound to a specific deployed contract.
func NewAadhaarVerifierTransactor(address common.Address, transactor bind.ContractTransactor) (*AadhaarVerifierTransactor, error) {
	contract, err := bindAadhaarVerifier(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &AadhaarVerifierTransactor{contract: contract}, nil
}

// NewAadhaarVerifierFilterer creates a new log filterer instance of AadhaarVerifier, bound to a specific deployed contract.
func NewAadhaarVerifierFilterer(address common.Address, filterer bind.ContractFilterer) (*AadhaarVerifierFilterer, error) {
	contract, err := bindAadhaarVerifier(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &AadhaarVerifierFilterer{contract: contract}, nil
}

// bindAadhaarVerifier binds a generic wrapper to an already deployed contract.
func bindAadhaarVerifier(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := AadhaarVerifierMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_AadhaarVerifier *AadhaarVerifierRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _AadhaarVerifier.Contract.AadhaarVerifierCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_AadhaarVerifier *AadhaarVerifierRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _AadhaarVerifier.Contract.AadhaarVerifierTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_AadhaarVerifier *AadhaarVerifierRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _AadhaarVerifier.Contract.AadhaarVerifierTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_AadhaarVerifier *AadhaarVerifierCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _AadhaarVerifier.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_AadhaarVerifier *AadhaarVerifierTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _AadhaarVerifier.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_AadhaarVerifier *AadhaarVerifierTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _AadhaarVerifier.Contract.contract.Transact(opts, method, params...)
}

// VerifyProof is a free data retrieval call binding the contract method 0xf3f22e72.
//
// Solidity: function verifyProof(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[19] pubSignals) view returns(bool)
func (_AadhaarVerifier *AadhaarVerifierCaller) VerifyProof(opts *bind.CallOpts, a [2]*big.Int, b [2][2]*big.Int, c [2]*big.Int, pubSignals [19]*big.Int) (bool, error) {
	var out []interface{}
	err := _AadhaarVerifier.contract.Call(opts, &out, "verifyProof", a, b, c, pubSignals)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// VerifyProof is a free data retrieval call binding the contract method 0xf3f22e72.
//
// Solidity: function verifyProof(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[19] pubSignals) view returns(bool)
func (_AadhaarVerifier *AadhaarVerifierSession) VerifyProof(a [2]*big.Int, b [2][2]*big.Int, c [2]*big.Int, pubSignals [19]*big.Int) (bool, error) {
	return _AadhaarVerifier.Contract.VerifyProof(&_AadhaarVerifier.CallOpts, a, b, c, pubSignals)
}

// VerifyProof is a free data retrieval call binding the contract method 0xf3f22e72.
//
// Solidity: function verifyProof(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[19] pubSignals) view returns(bool)
func (_AadhaarVerifier *AadhaarVerifierCallerSession) VerifyProof(a [2]*big.Int, b [2][2]*big.Int, c [2]*big.Int, pubSignals [19]*big.Int) (bool, error) {
	return _AadhaarVerifier.Contract.VerifyProof(&_AadhaarVerifier.CallOpts, a, b, c, pubSignals)
}
