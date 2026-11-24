// swift-tools-version: 5.9
// SPDX-License-Identifier: BUSL-1.1

import PackageDescription

// Package and product names are placeholders until the public host API is settled.
let package = Package(
    name: "SelfSdk",
    platforms: [
        .iOS("15.4")
    ],
    products: [
        .library(
            name: "SelfSdk",
            targets: ["SelfSdk"]
        )
    ],
    targets: [
        .target(
            name: "SelfSdk"
        ),
        .testTarget(
            name: "SelfSdkTests",
            dependencies: ["SelfSdk"]
        )
    ]
)
