// swift-tools-version: 5.9
// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import PackageDescription

let package = Package(
    name: "SelfSdkSwift",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "SelfSdkSwift",
            targets: ["SelfSdkSwift"]
        ),
    ],
    dependencies: [
        .package(url: "git@github.com:selfxyz/NFCPassportReader.git", branch: "main"),
    ],
    targets: [
        .target(
            name: "SelfSdkSwift",
            dependencies: [
                .product(name: "NFCPassportReader", package: "NFCPassportReader"),
            ],
            path: "Sources/SelfSdkSwift"
        ),
    ]
)
