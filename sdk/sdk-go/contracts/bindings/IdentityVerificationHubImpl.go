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

// IdentityVerificationHubImplMetaData contains all meta data concerning the IdentityVerificationHubImpl contract.
var IdentityVerificationHubImplMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"attestationId\",\"type\":\"bytes32\"}],\"name\":\"discloseVerifier\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"attestationId\",\"type\":\"bytes32\"}],\"name\":\"registry\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// IdentityVerificationHubImplABI is the input ABI used to generate the binding from.
// Deprecated: Use IdentityVerificationHubImplMetaData.ABI instead.
var IdentityVerificationHubImplABI = IdentityVerificationHubImplMetaData.ABI

// IdentityVerificationHubImpl is an auto generated Go binding around an Ethereum contract.
type IdentityVerificationHubImpl struct {
	IdentityVerificationHubImplCaller     // Read-only binding to the contract
	IdentityVerificationHubImplTransactor // Write-only binding to the contract
	IdentityVerificationHubImplFilterer   // Log filterer for contract events
}

// IdentityVerificationHubImplCaller is an auto generated read-only Go binding around an Ethereum contract.
type IdentityVerificationHubImplCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IdentityVerificationHubImplTransactor is an auto generated write-only Go binding around an Ethereum contract.
type IdentityVerificationHubImplTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IdentityVerificationHubImplFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type IdentityVerificationHubImplFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// IdentityVerificationHubImplSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type IdentityVerificationHubImplSession struct {
	Contract     *IdentityVerificationHubImpl // Generic contract binding to set the session for
	CallOpts     bind.CallOpts                // Call options to use throughout this session
	TransactOpts bind.TransactOpts            // Transaction auth options to use throughout this session
}

// IdentityVerificationHubImplCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type IdentityVerificationHubImplCallerSession struct {
	Contract *IdentityVerificationHubImplCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                      // Call options to use throughout this session
}

// IdentityVerificationHubImplTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type IdentityVerificationHubImplTransactorSession struct {
	Contract     *IdentityVerificationHubImplTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                      // Transaction auth options to use throughout this session
}

// IdentityVerificationHubImplRaw is an auto generated low-level Go binding around an Ethereum contract.
type IdentityVerificationHubImplRaw struct {
	Contract *IdentityVerificationHubImpl // Generic contract binding to access the raw methods on
}

// IdentityVerificationHubImplCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type IdentityVerificationHubImplCallerRaw struct {
	Contract *IdentityVerificationHubImplCaller // Generic read-only contract binding to access the raw methods on
}

// IdentityVerificationHubImplTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type IdentityVerificationHubImplTransactorRaw struct {
	Contract *IdentityVerificationHubImplTransactor // Generic write-only contract binding to access the raw methods on
}

// NewIdentityVerificationHubImpl creates a new instance of IdentityVerificationHubImpl, bound to a specific deployed contract.
func NewIdentityVerificationHubImpl(address common.Address, backend bind.ContractBackend) (*IdentityVerificationHubImpl, error) {
	contract, err := bindIdentityVerificationHubImpl(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &IdentityVerificationHubImpl{IdentityVerificationHubImplCaller: IdentityVerificationHubImplCaller{contract: contract}, IdentityVerificationHubImplTransactor: IdentityVerificationHubImplTransactor{contract: contract}, IdentityVerificationHubImplFilterer: IdentityVerificationHubImplFilterer{contract: contract}}, nil
}

// NewIdentityVerificationHubImplCaller creates a new read-only instance of IdentityVerificationHubImpl, bound to a specific deployed contract.
func NewIdentityVerificationHubImplCaller(address common.Address, caller bind.ContractCaller) (*IdentityVerificationHubImplCaller, error) {
	contract, err := bindIdentityVerificationHubImpl(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &IdentityVerificationHubImplCaller{contract: contract}, nil
}

// NewIdentityVerificationHubImplTransactor creates a new write-only instance of IdentityVerificationHubImpl, bound to a specific deployed contract.
func NewIdentityVerificationHubImplTransactor(address common.Address, transactor bind.ContractTransactor) (*IdentityVerificationHubImplTransactor, error) {
	contract, err := bindIdentityVerificationHubImpl(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &IdentityVerificationHubImplTransactor{contract: contract}, nil
}

// NewIdentityVerificationHubImplFilterer creates a new log filterer instance of IdentityVerificationHubImpl, bound to a specific deployed contract.
func NewIdentityVerificationHubImplFilterer(address common.Address, filterer bind.ContractFilterer) (*IdentityVerificationHubImplFilterer, error) {
	contract, err := bindIdentityVerificationHubImpl(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &IdentityVerificationHubImplFilterer{contract: contract}, nil
}

// bindIdentityVerificationHubImpl binds a generic wrapper to an already deployed contract.
func bindIdentityVerificationHubImpl(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := IdentityVerificationHubImplMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IdentityVerificationHubImpl.Contract.IdentityVerificationHubImplCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IdentityVerificationHubImpl.Contract.IdentityVerificationHubImplTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IdentityVerificationHubImpl.Contract.IdentityVerificationHubImplTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _IdentityVerificationHubImpl.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _IdentityVerificationHubImpl.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _IdentityVerificationHubImpl.Contract.contract.Transact(opts, method, params...)
}

// DiscloseVerifier is a free data retrieval call binding the contract method 0xab15be08.
//
// Solidity: function discloseVerifier(bytes32 attestationId) view returns(address)
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplCaller) DiscloseVerifier(opts *bind.CallOpts, attestationId [32]byte) (common.Address, error) {
	var out []interface{}
	err := _IdentityVerificationHubImpl.contract.Call(opts, &out, "discloseVerifier", attestationId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// DiscloseVerifier is a free data retrieval call binding the contract method 0xab15be08.
//
// Solidity: function discloseVerifier(bytes32 attestationId) view returns(address)
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplSession) DiscloseVerifier(attestationId [32]byte) (common.Address, error) {
	return _IdentityVerificationHubImpl.Contract.DiscloseVerifier(&_IdentityVerificationHubImpl.CallOpts, attestationId)
}

// DiscloseVerifier is a free data retrieval call binding the contract method 0xab15be08.
//
// Solidity: function discloseVerifier(bytes32 attestationId) view returns(address)
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplCallerSession) DiscloseVerifier(attestationId [32]byte) (common.Address, error) {
	return _IdentityVerificationHubImpl.Contract.DiscloseVerifier(&_IdentityVerificationHubImpl.CallOpts, attestationId)
}

// Registry is a free data retrieval call binding the contract method 0x7ef50298.
//
// Solidity: function registry(bytes32 attestationId) view returns(address)
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplCaller) Registry(opts *bind.CallOpts, attestationId [32]byte) (common.Address, error) {
	var out []interface{}
	err := _IdentityVerificationHubImpl.contract.Call(opts, &out, "registry", attestationId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Registry is a free data retrieval call binding the contract method 0x7ef50298.
//
// Solidity: function registry(bytes32 attestationId) view returns(address)
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplSession) Registry(attestationId [32]byte) (common.Address, error) {
	return _IdentityVerificationHubImpl.Contract.Registry(&_IdentityVerificationHubImpl.CallOpts, attestationId)
}

// Registry is a free data retrieval call binding the contract method 0x7ef50298.
//
// Solidity: function registry(bytes32 attestationId) view returns(address)
func (_IdentityVerificationHubImpl *IdentityVerificationHubImplCallerSession) Registry(attestationId [32]byte) (common.Address, error) {
	return _IdentityVerificationHubImpl.Contract.Registry(&_IdentityVerificationHubImpl.CallOpts, attestationId)
}
