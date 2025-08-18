package utils

import (
	"self-sdk-go/internal/types"
)

const (
	Passport types.AttestationId = 1
	EUCard   types.AttestationId = 2
)

type DiscloseIndicesEntry struct {
	RevealedDataPackedIndex           int
	ForbiddenCountriesListPackedIndex int
	NullifierIndex                    int
	AttestationIdIndex                int
	MerkleRootIndex                   int
	CurrentDateIndex                  int
	NamedobSmtRootIndex               int
	NameyobSmtRootIndex               int
	ScopeIndex                        int
	UserIdentifierIndex               int
	PassportNoSmtRootIndex            int
}

var DiscloseIndices = map[types.AttestationId]DiscloseIndicesEntry{
	Passport: {
		RevealedDataPackedIndex:           0,
		ForbiddenCountriesListPackedIndex: 3,
		NullifierIndex:                    7,
		AttestationIdIndex:                8,
		MerkleRootIndex:                   9,
		CurrentDateIndex:                  10,
		NamedobSmtRootIndex:               17,
		NameyobSmtRootIndex:               18,
		ScopeIndex:                        19,
		UserIdentifierIndex:               20,
		PassportNoSmtRootIndex:            16,
	},
	EUCard: {
		RevealedDataPackedIndex:           0,
		ForbiddenCountriesListPackedIndex: 4,
		NullifierIndex:                    8,
		AttestationIdIndex:                9,
		MerkleRootIndex:                   10,
		CurrentDateIndex:                  11,
		NamedobSmtRootIndex:               17,
		NameyobSmtRootIndex:               18,
		ScopeIndex:                        19,
		UserIdentifierIndex:               20,
		PassportNoSmtRootIndex:            99,
	},
}

const (
	IssuingState string = "issuingState"
	Name         string = "name"
	IdNumber     string = "idNumber"
	Nationality  string = "nationality"
	DateOfBirth  string = "dateOfBirth"
	Gender       string = "gender"
	ExpiryDate   string = "expiryDate"
	OlderThan    string = "olderThan"
	Ofac         string = "ofac"
)

type RevealedDataIndicesEntry struct {
	IssuingStateStart int
	IssuingStateEnd   int
	NameStart         int
	NameEnd           int
	IdNumberStart     int
	IdNumberEnd       int
	NationalityStart  int
	NationalityEnd    int
	DateOfBirthStart  int
	DateOfBirthEnd    int
	GenderStart       int
	GenderEnd         int
	ExpiryDateStart   int
	ExpiryDateEnd     int
	OlderThanStart    int
	OlderThanEnd      int
	OfacStart         int
	OfacEnd           int
}

var RevealedDataIndices = map[types.AttestationId]RevealedDataIndicesEntry{
	Passport: {
		IssuingStateStart: 2,
		IssuingStateEnd:   4,
		NameStart:         5,
		NameEnd:           43,
		IdNumberStart:     44,
		IdNumberEnd:       52,
		NationalityStart:  54,
		NationalityEnd:    56,
		DateOfBirthStart:  57,
		DateOfBirthEnd:    62,
		GenderStart:       64,
		GenderEnd:         64,
		ExpiryDateStart:   65,
		ExpiryDateEnd:     70,
		OlderThanStart:    88,
		OlderThanEnd:      89,
		OfacStart:         90,
		OfacEnd:           92,
	},
	EUCard: {
		IssuingStateStart: 2,
		IssuingStateEnd:   4,
		NameStart:         60,
		NameEnd:           89,
		IdNumberStart:     5,
		IdNumberEnd:       13,
		NationalityStart:  45,
		NationalityEnd:    47,
		DateOfBirthStart:  30,
		DateOfBirthEnd:    35,
		GenderStart:       37,
		GenderEnd:         37,
		ExpiryDateStart:   38,
		ExpiryDateEnd:     43,
		OlderThanStart:    90,
		OlderThanEnd:      91,
		OfacStart:         92,
		OfacEnd:           93,
	},
}

var AllIds = map[types.AttestationId]bool{
	Passport: true,
	EUCard:   true,
}
