// swift-tools-version: 5.9
// SPDX-License-Identifier: BUSL-1.1

import PackageDescription

let package = Package(
    name: "SelfNativeShell",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "SelfNativeShell",
            targets: ["SelfNativeShell"]
        )
    ],
    targets: [
        .target(
            name: "SelfNativeShell",
            path: ".",
            exclude: ["Resources"],
            sources: ["Sources/SelfNativeShell"]
        ),
        .testTarget(
            name: "SelfNativeShellTests",
            dependencies: ["SelfNativeShell"],
            path: "Tests/SelfNativeShellTests"
        )
    ]
)
