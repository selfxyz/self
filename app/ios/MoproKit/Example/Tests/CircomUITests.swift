import XCTest
@testable import MoproKit_Example

final class CircomUITests: XCTestCase {
    
    let ui = KeccakSetupViewController()

    func testSuccessUI() {
        XCTAssertNoThrow(ui.setupUI(), "Setup UI failed")
        XCTAssertNoThrow(ui.runProveAction(), "Prove action failed")
        XCTAssertNoThrow(ui.runVerifyAction(), "Verify action failed")
    }
}
