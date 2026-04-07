# SelfSDK — iOS Native Shell

## Installation

### Swift Package Manager

In Xcode: **File → Add Package Dependencies**, enter:

```
https://github.com/selfxyz/self.git
```

Set the version rule (e.g. "Up to Next Major" from `0.1.0`).

Or add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/selfxyz/self.git", from: "0.1.0")
]
```

### CocoaPods

Add to your `Podfile`:

```ruby
pod 'SelfSDK', :git => 'https://github.com/selfxyz/self.git', :tag => '0.1.0'
```

Then run:

```bash
pod install
```

## Requirements

- iOS 15.0+
- Swift 5.9+
- Xcode 15+
