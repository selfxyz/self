// swift-tools-version:5.9
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
