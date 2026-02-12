// swift-tools-version:5.9
// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

import PackageDescription

let package = Package(
    name: "SelfSDK",
    platforms: [
        .iOS(.v15),
    ],
    products: [
        .library(
            name: "SelfSDK",
            targets: ["SelfSDK"]
        ),
    ],
    targets: [
        .target(
            name: "SelfSDK",
            path: "Sources/SelfSDK"
        ),
    ]
)
