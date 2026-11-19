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
        ),
        .library(
            name: "SelfSdkUI",
            targets: ["SelfSdkUI"]
        )
    ],
    targets: [
        // Foundation only. `swift build` on macOS fails when this target imports UIKit. No check stops WebKit.
        .target(
            name: "SelfSdk"
        ),
        // UIKit and WebKit code. Its sources are inside `#if canImport(UIKit)`, so it is empty on macOS.
        .target(
            name: "SelfSdkUI",
            dependencies: ["SelfSdk"]
        ),
        .testTarget(
            name: "SelfSdkTests",
            dependencies: ["SelfSdk"]
        ),
        .testTarget(
            name: "SelfSdkUITests",
            dependencies: ["SelfSdkUI"]
        )
    ]
)
