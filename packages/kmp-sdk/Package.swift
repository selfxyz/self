// swift-tools-version:5.9

// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import PackageDescription

let package = Package(
    name: "SelfSdk",
    platforms: [
        .iOS(.v14)
    ],
    products: [
        .library(
            name: "SelfSdk",
            targets: ["SelfSdk"]
        )
    ],
    targets: [
        .binaryTarget(
            name: "SelfSdk",
            path: "./shared/build/xcframework/SelfSdk.xcframework"
        )
    ]
)
