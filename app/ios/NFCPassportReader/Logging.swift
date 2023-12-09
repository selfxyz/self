//
//  Logging.swift
//  NFCTest
//
//  Created by Andy Qua on 11/06/2019.
//  Copyright © 2019 Andy Qua. All rights reserved.
//

import Foundation

// TODO: Quick log functions - will move this to something better
public enum LogLevel : Int, CaseIterable {
    case verbose = 0
    case debug = 1
    case info = 2
    case warning = 3
    case error = 4
    case none = 5
}

public class Log {
    public static var logLevel : LogLevel = .info
    public static var storeLogs = false
    public static var logData = [String]()
    
    private static let df = DateFormatter()
    private static var dfInit = false

    public class func verbose( _ msg : @autoclosure () -> String ) {
        log( .verbose, msg )
    }
    public class func debug( _ msg : @autoclosure () -> String ) {
        log( .debug, msg )
    }
    public class func info( _ msg : @autoclosure () -> String ) {
        log( .info, msg )
    }
    public class func warning( _ msg : @autoclosure () -> String ) {
        log( .warning, msg )
    }
    public class func error( _ msg : @autoclosure () -> String ) {
        log( .error, msg )
    }
    
    public class func clearStoredLogs() {
        logData.removeAll()
    }
    
    class func log( _ logLevel : LogLevel, _ msg : () -> String ) {
        guard  logLevel != .none else { return }
        
        if !dfInit {
            df.dateFormat = "y-MM-dd H:m:ss.SSSS"
            dfInit = true
        }
        
        if self.logLevel.rawValue <= logLevel.rawValue {
            let message = msg()
            

            print( "\(df.string(from:Date())) - \(message)" )
            
            if storeLogs {
                logData.append( message )
            }
        }
    }
}
